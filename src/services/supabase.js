import { createClient } from '@supabase/supabase-js';

// Supabase Configuration - Public credentials (anon key is safe to expose)
const supabaseUrl = 'https://eldoyqgzxgubkyohvquq.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVsZG95cWdnenhndWJreW9odnF1cSIsInJvbGUiOiJhbm9uIiwiaWF0IjoxNzM0MTA0NzU1LCJleHAiOjIwNDk2ODA3NTV9.0tYXqKxXs3FLZPcIlQCUo_cQh9Dv0R5OiL7zqRQd4wA';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

console.log('✅ Supabase client initialized:', supabaseUrl);
