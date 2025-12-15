'use client';

import { useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import Link from 'next/link';

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

export default function Home() {
  const [domain, setDomain] = useState('');
  the [loading, setLoading] = useState(false);
  const [results, setResults] = useState([]);
  const [saved, setSaved] = useState([]);
  const [user, setUser] = useState(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user));
  }, []);

  const searchDomain = async () => {
    setLoading(true);
    const res = await fetch('/api/hunter', { method: 'POST', body: JSON.stringify({ domain }), headers: { 'Content-Type': 'application/json' } });
    const data = await res.json();
    setResults(data.emails || []);
    setLoading(false);
  };

  const saveContact = async (contact) => {
    if (!user) return alert('Log in to save contacts');
    const { error } = await supabase.from('contacts').insert({ user_id: user.id, email: contact.email, name: contact.name, domain });
    if (!error) setSaved([...saved, contact]);
  };

  return (
    <main className="min-h-screen bg-gray-50 flex flex-col items-center py-12 px-4 sm:px-6 lg:px-8">
      <h1 className="text-4xl sm:text-5xl font-bold text-center mb-8">NovaHunt.ai</h1>
      <p className="text-lg sm:text-xl text-gray-600 text-center max-w-3xl mb-12">
        Find business emails instantly. Enter a company domain and get professional contacts.
      </p>

      <div className="w-full max-w-md mb-12">
        <input
          type="text"
          value={domain}
          onChange={e => setDomain(e.target.value)}
          placeholder="Enter domain, e.g. coca-cola.com"
          className="w-full px-6 py-4 text-lg border border-gray-300 rounded-lg mb-4 focus:outline-none focus:border-blue-600"
        />
        <button
          onClick={searchDomain}
          disabled={loading}
          className="w-full py-4 bg-blue-600 text-white rounded-lg font-bold text-xl hover:bg-blue-700 transition"
        >
          {loading ? 'Searching...' : 'Search'}
        </button>
      </div>

      {results.length > 0 && (
        <div className="w-full max-w-3xl">
          <h2 className="text-3xl font-bold mb-6 text-center">Results</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {results.map((result, i) => (
              <div key={i} className="bg-white rounded-lg shadow p-6">
                <p className="font-bold text-lg mb-2">{result.name}</p>
                <p className="text-gray-600 mb-2">{result.email}</p>
                <p className="text-gray-500 text-sm mb-4">Score: {result.score}</p>
                <button onClick={() => saveContact(result)} className="px-4 py-2 bg-green-600 text-white rounded font-bold hover:bg-green-700">
                  Save
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {!user && (
        <p className="mt-12 text-gray-500 text-lg">
          Already have an account? <Link href="/account" className="text-blue-600 underline hover:text-blue-700">Sign in</Link>
        </p>
      )}
    </main>
  );
}
