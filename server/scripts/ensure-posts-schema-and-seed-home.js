/**
 * Ensure posts table has the columns frontend expects, then seed sample posts
 * using REAL users already in DB (mp / party_official / party_member).
 *
 * Run:
 *   node scripts/ensure-posts-schema-and-seed-home.js
 */
import pg from 'pg';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });

const { Pool } = pg;

const randInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const sample = (arr) => arr[randInt(0, arr.length - 1)];

const TEXT_SNIPPETS = [
  'Bugün sahada vatandaşlarımızla buluştuk. Talepleri dinledik, notlarımızı aldık.',
  'Mecliste önemli bir başlık üzerine değerlendirmelerimizi paylaştık.',
  'Şeffaflık ve hesap verebilirlik bizim için vazgeçilmezdir.',
  'Yerel yönetimlerde daha hızlı hizmet için yeni bir plan hazırladık.',
  'Gençlerin geleceği için eğitim ve istihdam programlarını güçlendireceğiz.',
  'Ekonomide adil paylaşım ve üretim odaklı politika şart.',
];

const AGENDA_TAGS = [
  'Ekonomi',
  'Eğitim',
  'Sağlık',
  'Adalet',
  'Yerel Yönetimler',
  'Dış Politika',
  'Gençlik',
  'Çevre',
];

function randomCreatedAt(daysBack = 10) {
  const now = Date.now();
  const delta = Math.random() * daysBack * 24 * 60 * 60 * 1000;
  return new Date(now - delta).toISOString();
}

function buildMedia(contentType) {
  if (contentType === 'image') {
    const count = sample([1, 2, 3, 4]);
    return Array.from({ length: count }).map((_, i) => `https://picsum.photos/800/600?random=${randInt(1, 9999)}&i=${i}`);
  }
  if (contentType === 'video') {
    // UI just needs a thumbnail url; actual video playback can be added later
    return [`https://picsum.photos/800/600?random=${randInt(1, 9999)}`];
  }
  if (contentType === 'audio') {
    // No real audio file for now; UI still shows audio card
    return [];
  }
  return [];
}

async function ensureSchema(pool) {
  const ddl = [
    `alter table posts add column if not exists content_type varchar(10) default 'text'`,
    `alter table posts add column if not exists content_text text`,
    `alter table posts add column if not exists thumbnail_url varchar(500)`,
    `alter table posts add column if not exists media_duration integer`,
    `alter table posts add column if not exists agenda_tag varchar(200)`,
    `alter table posts add column if not exists dislike_count integer default 0`,
    `alter table posts add column if not exists is_trending boolean default false`,
    `alter table posts add column if not exists source_url varchar(500)`,
    // ensure updated_at exists
    `alter table posts add column if not exists updated_at timestamptz default now()`,
  ];

  for (const q of ddl) {
    // eslint-disable-next-line no-await-in-loop
    await pool.query(q);
  }

  // Backfill content_text from content if empty
  await pool.query(`update posts set content_text = coalesce(content_text, content) where content_text is null`);
}

async function seed(pool) {
  const [{ cnt }] = (await pool.query(`select count(*)::int as cnt from posts where is_deleted=false`)).rows;
  if (cnt > 0) {
    console.log(`ℹ️ posts already exist (${cnt}), skipping seed.`);
    return;
  }

  const users = (await pool.query(
    `select id, user_type, party_id, province, full_name
     from users
     where is_active=true and user_type in ('mp','party_official','party_member')`
  )).rows;

  const mps = users.filter((u) => u.user_type === 'mp');
  const officials = users.filter((u) => u.user_type === 'party_official');
  const members = users.filter((u) => u.user_type === 'party_member');

  if (mps.length === 0 || officials.length === 0) {
    throw new Error('Not enough users to seed posts (need mp and party_official at least).');
  }

  const makePost = ({ user, category, contentType, featured = false }) => {
    const contentText = `${sample(TEXT_SNIPPETS)} #${sample(AGENDA_TAGS)}`;
    const agendaTag = sample(AGENDA_TAGS);
    const mediaUrls = buildMedia(contentType);
    const thumb = contentType === 'video' ? mediaUrls[0] : null;
    const duration = contentType === 'video' ? randInt(20, 120) : contentType === 'audio' ? randInt(20, 180) : null;
    const sourceUrl = sample([
      'https://twitter.com/',
      'https://www.aa.com.tr/',
      'https://www.hurriyet.com.tr/',
      'https://www.cumhuriyet.com.tr/',
      'https://www.sozcu.com.tr/',
    ]);

    return {
      user_id: user.id,
      party_id: user.party_id,
      category,
      content_type: contentType,
      content: contentText, // legacy column
      content_text: contentText,
      media_urls: JSON.stringify(mediaUrls),
      thumbnail_url: thumb,
      media_duration: duration,
      agenda_tag: agendaTag,
      polit_score: randInt(100, 50000),
      view_count: randInt(100, 500000),
      like_count: randInt(5, 50000),
      dislike_count: randInt(0, 5000),
      comment_count: randInt(0, 5000),
      share_count: randInt(0, 2000),
      is_featured: featured,
      is_deleted: false,
      created_at: randomCreatedAt(14),
      source_url: sourceUrl,
    };
  };

  // Seed strategy:
  // - 150 MP posts
  // - 200 party official posts
  // - 50 party member posts (if not enough members, reuse officials but keep category 'citizens' empty rather than misclassify)
  const inserts = [];

  const mix = ['video', 'image', 'image', 'video', 'audio', 'text', 'text', 'image', 'video', 'audio'];
  const featuredEvery = 25;

  for (let i = 0; i < 150; i++) {
    const u = sample(mps);
    inserts.push(makePost({ user: u, category: 'mps', contentType: mix[i % mix.length], featured: i % featuredEvery === 0 }));
  }
  for (let i = 0; i < 200; i++) {
    const u = sample(officials);
    inserts.push(makePost({ user: u, category: 'organization', contentType: mix[i % mix.length], featured: i % featuredEvery === 0 }));
  }
  if (members.length > 0) {
    for (let i = 0; i < 50; i++) {
      const u = sample(members);
      inserts.push(makePost({ user: u, category: 'citizens', contentType: mix[i % mix.length], featured: false }));
    }
  }

  console.log(`📝 Seeding posts: ${inserts.length}`);

  const client = await pool.connect();
  try {
    await client.query('begin');
    for (let i = 0; i < inserts.length; i++) {
      const p = inserts[i];
      // eslint-disable-next-line no-await-in-loop
      await client.query(
        `insert into posts (
          user_id, party_id, content, category, media_urls,
          content_type, content_text, thumbnail_url, media_duration, agenda_tag,
          polit_score, view_count, like_count, dislike_count, comment_count, share_count,
          is_featured, is_deleted, created_at, updated_at, source_url
        ) values (
          $1,$2,$3,$4,$5,
          $6,$7,$8,$9,$10,
          $11,$12,$13,$14,$15,$16,
          $17,$18,$19,now(),$20
        )`,
        [
          p.user_id,
          p.party_id,
          p.content,
          p.category,
          p.media_urls,
          p.content_type,
          p.content_text,
          p.thumbnail_url,
          p.media_duration,
          p.agenda_tag,
          p.polit_score,
          p.view_count,
          p.like_count,
          p.dislike_count,
          p.comment_count,
          p.share_count,
          p.is_featured,
          p.is_deleted,
          p.created_at,
          p.source_url,
        ]
      );
      if ((i + 1) % 50 === 0) console.log(`   ✅ inserted ${i + 1}/${inserts.length}`);
    }
    await client.query('commit');
  } catch (e) {
    await client.query('rollback');
    throw e;
  } finally {
    client.release();
  }

  const after = (await pool.query(`select count(*)::int as cnt from posts where is_deleted=false`)).rows[0];
  console.log(`✅ posts now: ${after.cnt}`);
}

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  try {
    await ensureSchema(pool);
    await seed(pool);
  } finally {
    await pool.end();
  }
}

main().catch((e) => {
  console.error('❌ Failed:', e);
  process.exit(1);
});

