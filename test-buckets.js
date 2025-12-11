import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://eldoyqgzxgubkyohvquq.supabase.co',
  'sb_secret_Z0MJzEHIIHAG9hJb5S8CNg_imQGhd98'
);

console.log('Testing with SERVICE KEY...\n');

const { data, error } = await supabase.storage.listBuckets();

if (error) {
  console.error('Error:', error);
} else {
  console.log(`Found ${data.length} buckets:`);
  data.forEach(b => console.log(`  - ${b.name} (${b.public ? 'public' : 'private'})`));
}
