'use client';

import { useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';

export default function SetPasswordContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const email = searchParams.get('email') || '';
  const sessionId = searchParams.get('session_id') || '';

  const [pw, setPw] = useState('');
  const [msg, setMsg] = useState('');

  const submit = async (e) => {
    e.preventDefault();
    if (pw.length < 8) return setMsg('Password too short');

    const res = await fetch('/api/auth/set-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password: pw, session_id: sessionId }),
    });

    if (res.ok) router.push('/account');
    else setMsg('Verification failed');
  };

  return (
    <main className="min-h-screen bg-gray-50 flex items-center justify-center px-6">
      <div className="bg-white rounded-2xl shadow-lg p-10 max-w-md w-full">
        <h1 className="text-3xl font-bold text-center mb-6">Set Password</h1>
        <p className="text-center text-gray-600 mb-8">Welcome <strong>{email}</strong></p>
        <form onSubmit={submit}>
          <input
            type="password"
            value={pw}
            onChange={e => setPw(e.target.value)}
            placeholder="Choose password (8+ chars)"
            required
            minLength={8}
            className="w-full px-6 py-4 text-lg border border-gray-300 rounded-lg mb-6 focus:outline-none focus:border-blue-600"
          />
          <button
            type="submit"
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 rounded-lg text-xl transition"
          >
            Continue → Account
          </button>
        </form>
        {msg && <p className="text-red-600 text-center mt-6">{msg}</p>}
      </div>
    </main>
  );
}
