import { createClient } from '@supabase/supabase-js';

// Supabase Configuration
// IMPORTANT:
// - Never hardcode keys in the repo.
// - On Vercel, set:
//   - VITE_SUPABASE_URL
//   - VITE_SUPABASE_ANON_KEY
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  // Keep the app running (some pages use /api/* and won't need the client),
  // but warn loudly for pages that still rely on Supabase JS directly.
  console.warn(
    'Supabase env missing. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in the environment.'
  );
}

export const supabase = createClient(supabaseUrl || '', supabaseAnonKey || '');
