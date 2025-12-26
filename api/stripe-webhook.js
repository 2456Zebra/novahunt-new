import Stripe from 'stripe';
import { buffer } from 'micro';
import { createClient } from '@supabase/supabase-js';

export const config = {
  api: {
    bodyParser: false, // Stripe requires raw body
  },
};

// --- Environment variables ---
const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
const stripeWebhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const stripe = new Stripe(stripeSecretKey, {
  apiVersion: '2024-06-20',
});

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

// Map plan → credits
function getCreditsForPlan(plan) {
  const credits = {
    Starter: { searches: 100, reveals: 50 },
    Pro: { searches: 500, reveals: 250 },
    Enterprise: { searches: 2500, reveals: 1500 },
  };
  return credits[plan] || credits['Pro'];
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).send('Method Not Allowed');
  }

  let event;

  try {
    const rawBody = await buffer(req);
    const signature = req.headers['stripe-signature'];

    event = stripe.webhooks.constructEvent(
      rawBody,
      signature,
      stripeWebhookSecret
    );
  } catch (err) {
    console.error('❌ Stripe signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // --- Handle checkout completion ---
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;

    const email = session.customer_details?.email;
    const customerId = session.customer;
    const plan = session.metadata?.plan || 'Pro';

    if (!email) {
      console.error('❌ Missing customer email');
      return res.status(200).json({ received: true }); // Always 200 for Stripe
    }

    console.log('🔔 checkout.session.completed', {
      email,
      plan,
      customerId,
      sessionId: session.id,
    });

    const selected = getCreditsForPlan(plan);

    try {
      // --- Direct lookup instead of listUsers() ---
      const { data: existingUser, error: lookupError } =
        await supabase
          .from('auth.users')
          .select('*')
          .eq('email', email)
          .single();

      if (lookupError && lookupError.code !== 'PGRST116') {
        console.error('❌ Supabase lookup error:', lookupError);
      }

      // --- Update existing user ---
      if (existingUser) {
        console.log('🔄 Updating existing user:', existingUser.id);

        const { error: updateError } =
          await supabase.auth.admin.updateUserById(existingUser.id, {
            user_metadata: {
              ...existingUser.user_metadata,
              plan,
              stripe_customer_id: customerId,
              searches_remaining: selected.searches,
              reveals_remaining: selected.reveals,
            },
          });

        if (updateError) {
          console.error('❌ Supabase update error:', updateError);
        }

        return res.status(200).json({ received: true });
      }

      // --- Create new user ---
      console.log('➕ Creating new user:', email);

      const { error: createError } = await supabase.auth.admin.createUser({
        email,
        email_confirm: true,
        password: session.id, // temporary
        user_metadata: {
          plan,
          stripe_customer_id: customerId,
          searches_remaining: selected.searches,
          reveals_remaining: selected.reveals,
          saved_contacts: [],
        },
      });

      if (createError) {
        console.error('❌ Supabase create error:', createError);
      }

      return res.status(200).json({ received: true });
    } catch (err) {
      console.error('❌ Unexpected webhook error:', err);
      return res.status(200).json({ received: true }); // Stripe must always get 200
    }
  }

  // Acknowledge all other events
  return res.status(200).json({ received: true });
}
