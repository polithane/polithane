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

// Never crash the whole app at import-time if env is missing.
// createClient('', '') throws and causes a production white-screen.
export const supabase =
  supabaseUrl && supabaseAnonKey
    ? createClient(supabaseUrl, supabaseAnonKey)
    : new Proxy(
        {},
        {
          get() {
            throw new Error(
              'Supabase client is not configured (missing VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY).'
            );
          },
        }
      );
