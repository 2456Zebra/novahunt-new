const Stripe = require("stripe");

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

module.exports = async (req, res) => {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).json({ success: false, error: "Method not allowed" });
  }

  try {
    const { customer_id } = req.body || {};

    if (!customer_id) {
      return res.status(400).json({ success: false, error: "Missing customer_id" });
    }

    // 1. Find active subscription for this customer
    const subs = await stripe.subscriptions.list({
      customer: customer_id,
      status: "active",
      limit: 1
    });

    if (!subs.data.length) {
      return res.status(400).json({ success: false, error: "No active subscription found" });
    }

    const subscription = subs.data[0];

    // 2. Cancel at period end (safer than immediate deletion)
    const updated = await stripe.subscriptions.update(subscription.id, {
      cancel_at_period_end: true
    });

    return res.status(200).json({
      success: true,
      subscription: {
        id: updated.id,
        cancel_at_period_end: updated.cancel_at_period_end,
        current_period_end: updated.current_period_end
      }
    });
  } catch (err) {
    console.error("Error canceling subscription:", err);
    return res.status(500).json({ success: false, error: err.message || "Server error" });
  }
};
