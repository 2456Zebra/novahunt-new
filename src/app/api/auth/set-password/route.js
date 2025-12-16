// Minimal POST API route for set-password using the centralized Supabase client.
// Returns safe placeholder responses so the build and runtime are stable.
import { NextResponse } from 'next/server';
import { createSupabaseClient } from '../../../../lib/supabaseClient';

export async function POST(req) {
  try {
    const body = await req.json().catch(() => null);
    if (!body || (!body.userId && !body.email) || !body.password) {
      return NextResponse.json({ error: 'Missing required fields: (userId|email) and password' }, { status: 400 });
    }

    const supabase = createSupabaseClient(true);

    // Placeholder implementation:
    // Replace with real admin call when you're ready:
    // Example:
    // const { data, error } = await supabase.auth.admin.updateUserById(body.userId, { password: body.password });
    // if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({
      ok: true,
      message: 'Placeholder: implement admin password update with SUPABASE service role key',
    });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('set-password route error:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
