// pages/api/stripe-webhook.js
import Stripe from 'stripe';
import { buffer } from 'micro';
import { createClient } from '@supabase/supabase-js';

export const config = {
  api: {
    bodyParser: false, // Stripe needs the raw body
  },
};

// --- Environment variables (must be set in Vercel) ---
const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
const stripeWebhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!stripeSecretKey) {
  console.error('❌ Missing STRIPE_SECRET_KEY environment variable');
}
if (!stripeWebhookSecret) {
  console.error('❌ Missing STRIPE_WEBHOOK_SECRET environment variable');
}
if (!supabaseUrl) {
  console.error('❌ Missing NEXT_PUBLIC_SUPABASE_URL environment variable');
}
if (!supabaseServiceRoleKey) {
  console.error('❌ Missing SUPABASE_SERVICE_ROLE_KEY environment variable');
}

const stripe = new Stripe(stripeSecretKey || '', {
  apiVersion: '2024-06-20', // or whatever your Stripe API version is
});

const supabase = createClient(supabaseUrl || '', supabaseServiceRoleKey || '');

// Helper to compute credits from plan
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

  // Verify Stripe signature
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    const buf = await buffer(req);
    event = stripe.webhooks.constructEvent(buf, sig, stripeWebhookSecret || '');
  } catch (err) {
    console.error('❌ Webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // We only care about checkout.session.completed for now
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;

    const email = session.customer_details?.email;
    const customerId = session.customer; // ⭐ Stripe customer ID
    const plan = session.metadata?.plan || 'Pro';

    if (!email) {
      console.error('❌ Checkout session missing customer email');
      return res.status(400).json({ error: 'Missing customer email' });
    }

    console.log('✅ Checkout completed:', {
      email,
      plan,
      customerId,
      sessionId: session.id,
    });

    const selected = getCreditsForPlan(plan);

    try {
      // --- 1. Try to find existing Supabase user by email ---
      // NOTE: For larger user bases you'd paginate; for now this is fine.
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

      if (existingUser) {
        console.log('🔄 Updating existing Supabase user:', existingUser.id);

        const currentMeta = existingUser.user_metadata || {};

        const newMeta = {
          ...currentMeta,
          plan,
          stripe_customer_id: customerId, // ⭐ CRITICAL: used by account.html
          searches_remaining: selected.searches,
          reveals_remaining: selected.reveals,
          // keep saved_contacts if it already exists
        };

        const { error: updateError } = await supabase.auth.admin.updateUserById(
          existingUser.id,
          {
            user_metadata: newMeta,
          }
        );

        if (updateError) {
          console.error('❌ Supabase user update error:', updateError);
          return res.status(500).json({ error: 'Supabase update error' });
        }

        console.log('✅ Supabase user updated:', existingUser.id);
        return res.status(200).json({ received: true });
      }

      // --- 2. No existing user → create one ---
      console.log('➕ Creating new Supabase user for:', email);

      const { data: createdUser, error: createError } =
        await supabase.auth.admin.createUser({
          email,
          email_confirm: true, // auto-confirm
          password: session.id, // temp random password
          user_metadata: {
            plan,
            stripe_customer_id: customerId, // ⭐ CRITICAL
            searches_remaining: selected.searches,
            reveals_remaining: selected.reveals,
            saved_contacts: [],
          },
        });

      if (createError) {
        console.error('❌ Supabase user creation error:', createError);
        return res.status(500).json({ error: 'Supabase create error' });
      }

      console.log('✅ Supabase user created:', createdUser.id);
      return res.status(200).json({ received: true });
    } catch (err) {
      console.error('❌ Unexpected error in webhook handler:', err);
      return res.status(500).json({ error: 'Internal webhook error' });
    }
  }

  // For other event types, just acknowledge
  return res.status(200).json({ received: true });
}
