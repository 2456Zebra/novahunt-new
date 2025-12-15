'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { useRouter } from 'next/navigation';

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

export default function Account() {
  const [user, setUser] = useState(null);
  const router = useRouter();

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user));
  }, []);

  if (!user) {
    return (
      <main className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white rounded-2xl shadow-lg p-10 text-center">
          <h1 className="text-3xl font-bold mb-6">Account</h1>
          <p>Not signed in</p>
          <button onClick={() => router.push('/')} className="mt-6 px-8 py-4 bg-blue-600 text-white rounded-lg">
            Back to Homepage
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50 flex items-center justify-center px-6">
      <div className="bg-white rounded-2xl shadow-lg p-10 max-w-md w-full text-center">
        <h1 className="text-3xl font-bold mb-6">Account</h1>
        <p className="text-xl mb-8">Signed in as <strong>{user.email}</strong></p>
        <div className="space-y-4">
          <button onClick={() => router.push('/checkout')} className="w-full py-4 bg-blue-600 text-white rounded-lg font-bold">
            Change Plan
          </button>
          <button onClick={() => supabase.auth.signOut().then(() => router.push('/'))} className="w-full py-4 bg-gray-800 text-white rounded-lg font-bold">
            Sign Out
          </button>
        </div>
      </div>
    </main>
  );
}
