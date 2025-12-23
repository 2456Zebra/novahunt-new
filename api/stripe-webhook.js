import Stripe from 'stripe';
import { buffer } from 'micro';
import { createClient } from '@supabase/supabase-js';

export const config = {
  api: {
    bodyParser: false, // Stripe requires raw body
  },
};

// --- Environment variables (must be set in Vercel) ---
const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
const stripeWebhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const stripe = new Stripe(stripeSecretKey || '', {
  apiVersion: '2024-06-20',
});

const supabase = createClient(supabaseUrl || '', supabaseServiceRoleKey || '');

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
      stripeWebhookSecret || ''
    );
  } catch (err) {
    console.error('❌ Stripe signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Handle checkout completion
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;

    const email = session.customer_details?.email;
    const customerId = session.customer;
    const plan = session.metadata?.plan || 'Pro';

    if (!email) {
      console.error('❌ Missing customer email in session');
      return res.status(400).json({ error: 'Missing email' });
    }

    console.log('🔔 Checkout completed:', {
      email,
      plan,
      customerId,
      sessionId: session.id,
    });

    const selected = getCreditsForPlan(plan);

    try {
      // 1. Fetch all users (simple for small projects)
      const { data: usersPage, error: listError } =
        await supabase.auth.admin.listUsers();

      if (listError) {
        console.error('❌ Error listing users:', listError);
        return res.status(500).json({ error: 'Supabase listUsers error' });
      }

      const existingUser =
        usersPage?.users?.find(
          (u) => u.email && u.email.toLowerCase() === email.toLowerCase()
        ) || null;

      // 2. Update existing user
      if (existingUser) {
        console.log('🔄 Updating existing user:', existingUser.id);

        const currentMeta = existingUser.user_metadata || {};

        const newMeta = {
          ...currentMeta,
          plan,
          stripe_customer_id: customerId,
          searches_remaining: selected.searches,
          reveals_remaining: selected.reveals,
        };

        const { error: updateError } = await supabase.auth.admin.updateUserById(
          existingUser.id,
          { user_metadata: newMeta }
        );

        if (updateError) {
          console.error('❌ Supabase update error:', updateError);
          return res.status(500).json({ error: 'Supabase update error' });
        }

        console.log('✅ Updated user:', existingUser.id);
        return res.status(200).json({ received: true });
      }

      // 3. Create new user if none exists
      console.log('➕ Creating new user for:', email);

      const { data: createdUser, error: createError } =
        await supabase.auth.admin.createUser({
          email,
          email_confirm: true,
          password: session.id, // temp password
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
        return res.status(500).json({ error: 'Supabase create error' });
      }

      console.log('✅ Created new user:', createdUser.id);
      return res.status(200).json({ received: true });
    } catch (err) {
      console.error('❌ Unexpected webhook error:', err);
      return res.status(500).json({ error: 'Internal webhook error' });
    }
  }

  // Acknowledge all other events
  return res.status(200).json({ received: true });
}
