import Stripe from 'stripe';
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export async function POST(req) {
  const { email, priceId } = await req.json();
  if (!email || !priceId) return new Response('Missing data', { status: 400 });

  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    payment_method_types: ['card'],
    customer_email: email,
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${req.headers.get('origin')}/set-password?email=${encodeURIComponent(email)}&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${req.headers.get('origin')}/checkout`,
  });

  return new Response(JSON.stringify({ url: session.url }), { status: 200 });
}
