// api/cancel-subscription.js
// Vercel serverless function to cancel a Stripe subscription

import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2025-09-30', // Match your Stripe version
});

export default async function handler(req, res) {
  // Only allow POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { customer_id } = req.body;

  if (!customer_id) {
    return res.status(400).json({ error: 'Missing customer_id' });
  }

  try {
    // Find active subscriptions for the customer
    const subscriptions = await stripe.subscriptions.list({
      customer: customer_id,
      status: 'active',
      limit: 1, // Assume one active sub per user
    });

    if (subscriptions.data.length === 0) {
      return res.status(404).json({ error: 'No active subscription found' });
    }

    const subscription = subscriptions.data[0];

    // Cancel at period end (user keeps access until end of billing cycle)
    await stripe.subscriptions.update(subscription.id, {
      cancel_at_period_end: true,
    });

    // Optional: Update your Supabase user metadata (e.g., mark as canceling)
    // You can add Supabase admin call here if needed

    return res.status(200).json({ success: true, message: 'Subscription canceled at period end' });
  } catch (error) {
    console.error('Cancel subscription error:', error);
    return res.status(500).json({ 
      error: 'Failed to cancel subscription', 
      details: error.message || 'Unknown error' 
    });
  }
}

// For Next.js compatibility (if using older format)
export const config = {
  api: {
    bodyParser: true,
  },
};
