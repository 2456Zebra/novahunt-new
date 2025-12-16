// Minimal server-rendered Account page that uses the centralized Supabase client.
// Keeps the UI simple and resilient to missing env vars (uses noop client fallback).
import React from 'react';
import { createSupabaseClient } from '../../lib/supabaseClient';

export default async function AccountPage() {
  let profile = null;
  try {
    const supabase = createSupabaseClient(true); // server-side client (or noop)
    const { data, error } = await supabase.from('profiles').select('id, username, email').limit(1);
    if (!error && data && data.length > 0) profile = data[0];
  } catch (err) {
    // don't break the build — log server-side
    // eslint-disable-next-line no-console
    console.error('AccountPage supabase error:', err);
  }

  return (
    <main style={{ padding: 24, fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}>
      <h1 style={{ fontSize: 32, marginBottom: 12 }}>Account</h1>
      {profile ? (
        <div>
          <p><strong>Username:</strong> {profile.username}</p>
          <p><strong>Email:</strong> {profile.email}</p>
        </div>
      ) : (
        <div>
          <p>No account data available. This is a placeholder account page.</p>
          <p>If you expect data, verify SUPABASE env keys and the 'profiles' table.</p>
        </div>
      )}
    </main>
  );
}
