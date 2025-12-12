import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkLogos() {
  const { data: files } = await supabase.storage
    .from('avatars')
    .list('party-logos', { limit: 100 });
  
  console.log('📦 Storage\'deki Parti Logoları:\n');
  files.forEach((f, i) => {
    console.log(`${i + 1}. ${f.name}`);
  });
  console.log(`\nToplam: ${files.length} logo`);
}

checkLogos();
