// Supabase client
const supabaseUrl = 'https://YOUR-PROJECT.supabase.co'; // REPLACE WITH YOUR ACTUAL SUPABASE_URL
const supabaseAnonKey = 'YOUR-ANON-KEY'; // REPLACE WITH YOUR NEXT_PUBLIC_SUPABASE_ANON_KEY

const { createClient } = supabase || await import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2');
const supabase = createClient(supabaseUrl, supabaseAnonKey);

window.supabase = supabase;
