// Minimal server-rendered Account page that reads a sample profile (safe example).
// This file uses the server supabase client via createSupabaseClient(true).
// You can replace the sample query with your real logic later.

import React from 'react';
import { createSupabaseClient } from '../../lib/supabaseClient';

export default async function AccountPage() {
  let profile = null;
  try {
    const supabase = createSupabaseClient(true); // server-side client
    // Example read — adapt table name to your schema. This is a safe sample query.
    const { data, error } = await supabase.from('profiles').select('id, username, email').limit(1);
    if (!error && data && data.length > 0) profile = data[0];
  } catch (err) {
    // swallow errors for now so page still renders (log in server if you want)
    console.error('Supabase account page error:', err);
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
          <p>If you expect data, verify your SUPABASE env keys and that the 'profiles' table exists.</p>
        </div>
      )}
    </main>
  );
}
