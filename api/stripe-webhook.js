import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

// Vercel config: disable default body parsing (we need the raw body for Stripe)
export const config = {
  api: {
    bodyParser: false,
  },
};

// --- Environment variables (must be set in Vercel) ---
const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
const stripeWebhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!stripeSecretKey) console.error('❌ Missing STRIPE_SECRET_KEY');
if (!stripeWebhookSecret) console.error('❌ Missing STRIPE_WEBHOOK_SECRET');
if (!supabaseUrl) console.error('❌ Missing NEXT_PUBLIC_SUPABASE_URL');
if (!supabaseServiceRoleKey) console.error('❌ Missing SUPABASE_SERVICE_ROLE_KEY');

const stripe = new Stripe(stripeSecretKey || '', {
  // If Stripe complains about version, you can remove apiVersion or set to your dashboard version
  apiVersion: '2024-06-20',
});

const supabase = createClient(supabaseUrl || '', supabaseServiceRoleKey || '');

// Read raw body from Vercel serverless request (no micro)
async function readRawBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', (chunk) => {
      data += chunk;
    });
    req.on('end', () => {
      resolve(Buffer.from(data));
    });
    req.on('error', reject);
  });
}

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
    const rawBody = await readRawBody(req);
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

  // We only care about checkout.session.completed right now
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;

    const email = session.customer_details?.email;
    const customerId = session.customer; // Stripe customer ID
    const plan = session.metadata?.plan || 'Pro'; // in your current flow, metadata is empty, so Pro fallback

    if (!email) {
      console.error('❌ Missing customer email in checkout.session.completed');
      return res.status(400).json({ error: 'Missing customer email' });
    }

    console.log('🔔 checkout.session.completed:', {
      email,
      plan,
      customerId,
      sessionId: session.id,
    });

    const selected = getCreditsForPlan(plan);

    try {
      // 1) Fetch users (simple approach for small user counts)
      const { data: usersPage, error: listError } =
        await supabase.auth.admin.listUsers();

      if (listError) {
        console.error('❌ Supabase listUsers error:', listError);
        return res.status(500).json({ error: 'Supabase listUsers error' });
      }

      const existingUser =
        usersPage?.users?.find(
          (u) => u.email && u.email.toLowerCase() === email.toLowerCase()
        ) || null;

      if (existingUser) {
        // --- Update existing user ---
        console.log('🔄 Updating existing Supabase user:', existingUser.id);

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
          {
            user_metadata: newMeta,
          }
        );

        if (updateError) {
          console.error('❌ Supabase updateUserById error:', updateError);
          return res.status(500).json({ error: 'Supabase update error' });
        }

        console.log('✅ Updated Supabase user:', existingUser.id);
        return res.status(200).json({ received: true });
      }

      // --- No existing user → create one ---
      console.log('➕ Creating new Supabase user for:', email);

      const { data: createdUser, error: createError } =
        await supabase.auth.admin.createUser({
          email,
          email_confirm: true,
          password: session.id, // temp password; user can reset later
          user_metadata: {
            plan,
            stripe_customer_id: customerId,
            searches_remaining: selected.searches,
            reveals_remaining: selected.reveals,
            saved_contacts: [],
          },
        });

      if (createError) {
        console.error('❌ Supabase createUser error:', createError);
        return res.status(500).json({ error: 'Supabase create error' });
      }

      console.log('✅ Created Supabase user:', createdUser.id);
      return res.status(200).json({ received: true });
    } catch (err) {
      console.error('❌ Unexpected error in webhook handler:', err);
      return res.status(500).json({ error: 'Internal webhook error' });
    }
  }

  // For all other event types, just acknowledge
  return res.status(200).json({ received: true });
}
