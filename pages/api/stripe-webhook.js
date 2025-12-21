import Stripe from 'stripe';
import { buffer } from 'micro';
import { createClient } from '@supabase/supabase-js';

export const config = {
  api: {
    bodyParser: false, // Stripe requires raw body
  },
};

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY // MUST be service role
);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).send('Method Not Allowed');
  }

  const sig = req.headers['stripe-signature'];
  const buf = await buffer(req);

  let event;
  try {
    event = stripe.webhooks.constructEvent(
      buf,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error('❌ Webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // ✅ Handle successful checkout
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;

    const email = session.customer_details.email;
    const plan = session.metadata?.plan || 'Pro'; // fallback

    console.log('✅ Stripe checkout completed for:', email, 'Plan:', plan);

    // ✅ Determine credits based on plan
    const credits = {
      Starter: { searches: 100, reveals: 50 },
      Pro: { searches: 500, reveals: 250 },
      Enterprise: { searches: 2500, reveals: 1500 },
    };

    const selected = credits[plan] || credits['Pro'];

    // ✅ Create or update Supabase user
    const { data: user, error } = await supabase.auth.admin.createUser({
      email,
      email_confirm: true, // ✅ AUTO-CONFIRM USER
      password: session.id, // random password (user will reset later)
      user_metadata: {
        plan,
        searches_remaining: selected.searches,
        reveals_remaining: selected.reveals,
        saved_contacts: [],
      },
    });

    if (error) {
      console.error('❌ Supabase user creation error:', error);
      return res.status(400).json({ error: error.message });
    }

    console.log('✅ Supabase user created/updated:', user.id);

    return res.status(200).json({ received: true });
  }

  res.status(200).json({ received: true });
}
