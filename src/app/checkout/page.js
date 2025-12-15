'use client';

import { useState } from 'react';

export default function Checkout() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);

  const plans = [
    { name: 'Starter', priceId: 'price_1SZHGGGyuj9BgGEUftoqaGC8', price: '$9' },
    { name: 'Pro', priceId: 'price_1SZHJGGyuj9BgGEUQ4uccDvB', price: '$19', popular: true },
    { name: 'Enterprise', priceId: 'price_1SZHKzGyuj9BgGEUh5aCmugi', price: '$49' },
  ];

  const startCheckout = async (priceId) => {
    if (!email.includes('@')) return alert('Enter a valid email');
    setLoading(true);
    const res = await fetch('/api/stripe', { method: 'POST', body: JSON.stringify({ email, priceId }), headers: { 'Content-Type': 'application/json' } });
    const data = await res.json();
    if (data.url) window.location.href = data.url;
    else alert(data.error || 'Failed');
    setLoading(false);
  };

  return (
    <main className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-6 py-12">
      <h1 className="text-4xl md:text-5xl font-bold text-center mb-8">Choose Your Plan</h1>

      <input
        type="email"
        value={email}
        onChange={e => setEmail(e.target.value)}
        placeholder="your@email.com"
        className="w-full max-w-md px-6 py-4 text-lg border border-gray-300 rounded-lg mb-12 focus:outline-none focus:border-blue-600"
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl w-full">
        {plans.map(p => (
          <div key={p.priceId} className={`bg-white rounded-2xl shadow-lg p-10 text-center transition transform ${p.popular ? 'ring-4 ring-blue-600 scale-105' : ''}`}>
            <h2 className="text-3xl font-bold mb-4">{p.name}</h2>
            <p className="text-5xl font-bold mb-8">
              {p.price}<span className="text-xl font-normal">/mo</span>
            </p>
            <button
              onClick={() => startCheckout(p.priceId)}
              disabled={loading || !email.includes('@')}
              className={`w-full py-4 rounded-lg text-xl font-bold transition ${p.popular ? 'bg-white text-blue-600 border-2 border-blue-600 hover:bg-blue-50' : 'bg-blue-600 text-white hover:bg-blue-700'}`}
            >
              {loading ? 'Loading...' : `Choose ${p.name}`}
            </button>
          </div>
        ))}
      </div>
    </main>
  );
}
