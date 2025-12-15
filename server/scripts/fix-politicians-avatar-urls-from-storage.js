/**
 * Fix politician avatar_url filenames by matching real Supabase Storage objects.
 *
 * Problem:
 * - Many rows in public.users.avatar_url point to:
 *   .../avatars/politicians/<TURKISH_OR_WRONG_CASE>.jpg
 * - But the real Storage object names are ASCII-normalized and case-sensitive.
 * - Frontend then fails to load and falls back to /ikon.png (Polithane logo).
 *
 * Strategy:
 * - List all objects under bucket "avatars" / prefix "politicians"
 * - Build a case-insensitive lookup map: lower(name) -> actual object name
 * - For each user with avatar_url in politicians:
 *     - extract filename from current avatar_url
 *     - normalize (decode %, convert Turkish chars to ASCII) -> lower
 *     - if it exists in map, rewrite avatar_url to use the *actual* object name
 *
 * Run:
 *   node server/scripts/fix-politicians-avatar-urls-from-storage.js
 */
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import pg from 'pg';
import { createClient } from '@supabase/supabase-js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env') });

const { Pool } = pg;

const TURKISH_TO_ASCII = {
  İ: 'I',
  Ş: 'S',
  Ğ: 'G',
  Ü: 'U',
  Ö: 'O',
  Ç: 'C',
  ı: 'i',
  ş: 's',
  ğ: 'g',
  ü: 'u',
  ö: 'o',
  ç: 'c',
};

function turkishToAscii(text) {
  let out = String(text || '');
  for (const [tr, ascii] of Object.entries(TURKISH_TO_ASCII)) {
    out = out.split(tr).join(ascii);
  }
  return out;
}

function safeDecodeURIComponent(value) {
  const s = String(value || '');
  if (!s.includes('%')) return s;
  try {
    return decodeURIComponent(s);
  } catch {
    return s;
  }
}

function extractFilenameFromUrl(url) {
  const s = String(url || '');
  const idx = s.lastIndexOf('/');
  if (idx === -1) return s;
  return s.slice(idx + 1);
}

async function listAllPoliticianObjects(supabase) {
  const limit = 100;
  let offset = 0;
  const all = [];
  for (let i = 0; i < 1000; i++) {
    // eslint-disable-next-line no-await-in-loop
    const { data, error } = await supabase.storage
      .from('avatars')
      .list('politicians', { limit, offset, sortBy: { column: 'name', order: 'asc' } });
    if (error) throw error;
    all.push(...(data || []));
    if (!data || data.length < limit) break;
    offset += limit;
  }
  return all;
}

async function main() {
  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const dbUrl = process.env.DATABASE_URL;
  if (!supabaseUrl || !serviceKey) throw new Error('Missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY');
  if (!dbUrl) throw new Error('Missing DATABASE_URL');

  const supabase = createClient(supabaseUrl, serviceKey);
  const pool = new Pool({ connectionString: dbUrl });

  const BASE_URL = `${supabaseUrl}/storage/v1/object/public/avatars/politicians`;

  try {
    console.log('🔎 Listing avatars/politicians objects from Storage...');
    const objects = await listAllPoliticianObjects(supabase);
    console.log(`✅ Storage objects found: ${objects.length}`);

    const nameByLower = new Map();
    for (const o of objects) {
      if (!o?.name) continue;
      nameByLower.set(String(o.name).toLowerCase(), o.name);
    }

    console.log('🔄 Loading users with politicians avatar_url...');
    const { rows } = await pool.query(
      `select id, username, full_name, avatar_url
       from public.users
       where avatar_url like '%/storage/v1/object/public/avatars/politicians/%'`
    );
    console.log(`✅ Users to check: ${rows.length}`);

    let updated = 0;
    let unchanged = 0;
    let notMatched = 0;

    const client = await pool.connect();
    try {
      await client.query('begin');

      for (const u of rows) {
        const oldUrl = String(u.avatar_url || '');
        const oldFilename = extractFilenameFromUrl(oldUrl);

        // normalize to key
        const decoded = safeDecodeURIComponent(oldFilename);
        const ascii = turkishToAscii(decoded);
        const key = ascii.toLowerCase();

        const actualName = nameByLower.get(key);
        if (!actualName) {
          notMatched++;
          continue;
        }

        const newUrl = `${BASE_URL}/${actualName}`;
        if (newUrl === oldUrl) {
          unchanged++;
          continue;
        }

        // eslint-disable-next-line no-await-in-loop
        await client.query(`update public.users set avatar_url=$1 where id=$2`, [newUrl, u.id]);
        updated++;

        if (updated % 200 === 0) {
          console.log(`   ✅ updated ${updated}...`);
        }
      }

      await client.query('commit');
    } catch (e) {
      await client.query('rollback');
      throw e;
    } finally {
      client.release();
    }

    console.log('✅ Fix complete');
    console.log({ updated, unchanged, notMatched, total: rows.length });
  } finally {
    await pool.end();
  }
}

main().catch((e) => {
  console.error('❌ Failed:', e);
  process.exit(1);
});

