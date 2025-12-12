import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://eldoyqgzxgubkyohvquq.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVsZG95cWdnenhndWJreW9odnF1cSIsInJvbGUiOiJhbm9uIiwiaWF0IjoxNzM0MTA0NzU1LCJleHAiOjIwNDk2ODA3NTV9.0tYXqKxXs3FLZPcIlQCUo_cQh9Dv0R5OiL7zqRQd4wA';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
