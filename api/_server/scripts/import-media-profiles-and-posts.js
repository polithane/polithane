/**
 * Create/Update media profiles (public.users) + insert 1 media post each.
 *
 * Assumptions:
 * - Supabase Storage bucket: avatars
 * - Media images are uploaded under: avatars/media/<fileName>
 * - We store public URL in users.avatar_url (frontend auto-encodes spaces/() etc)
 *
 * Run:
 *   node server/scripts/import-media-profiles-and-posts.js
 */
import pg from 'pg';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });

const { Pool } = pg;

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://eldoyqgzxgubkyohvquq.supabase.co';
const AVATARS_PUBLIC_BASE = `${SUPABASE_URL}/storage/v1/object/public/avatars`;
// NOTE: Bucket structure: avatars/media/*
const MEDIA_FOLDER = 'media';
const DEFAULT_AVATAR_URL = `${AVATARS_PUBLIC_BASE}/default/ikon.png`;

const turkishMap = {
  ç: 'c',
  Ç: 'c',
  ğ: 'g',
  Ğ: 'g',
  ı: 'i',
  İ: 'i',
  ö: 'o',
  Ö: 'o',
  ş: 's',
  Ş: 's',
  ü: 'u',
  Ü: 'u',
};

function normalizeUsername(value) {
  if (!value) return '';
  let out = String(value)
    .trim()
    .split('')
    .map((ch) => turkishMap[ch] ?? ch)
    .join('')
    .toLowerCase();

  out = out.replace(/^@+/, '');
  out = out.replace(/[\s-]+/g, '_');
  out = out.replace(/[^a-z0-9_]/g, '');
  out = out.replace(/_+/g, '_').replace(/^_+|_+$/g, '');
  out = out.slice(0, 20);
  if (out.length > 0 && out.length < 3) out = (out + '___').slice(0, 3);
  if (out && !/^[a-z]/.test(out)) out = `u${out}`.slice(0, 20);
  return out;
}

const SOURCE_URL_MAP = [
  { key: 'Hürriyet', url: 'https://www.hurriyet.com.tr/' },
  { key: 'Cumhuriyet', url: 'https://www.cumhuriyet.com.tr/' },
  { key: 'Sözcü', url: 'https://www.sozcu.com.tr/' },
  { key: 'Sabah', url: 'https://www.sabah.com.tr/' },
  { key: 'Radikal', url: 'https://www.radikal.com.tr/' },
  { key: 'BirGün', url: 'https://www.birgun.net/' },
  { key: 'Medyascope', url: 'https://medyascope.tv/' },
  { key: 'CNN Türk', url: 'https://www.cnnturk.com/' },
  { key: 'Habertürk', url: 'https://www.haberturk.com/' },
  { key: 'Halk TV', url: 'https://halktv.com.tr/' },
  { key: 'Kanal D', url: 'https://www.kanald.com.tr/' },
  { key: 'Fox TV', url: 'https://www.nowtv.com.tr/' },
  { key: 'DW Türkçe', url: 'https://www.dw.com/tr/' },
  { key: 'Flash TV', url: 'https://www.flashtv.com.tr/' },
];

function pickSourceUrl(newspapers = '', tv = '') {
  const text = `${newspapers} ${tv}`.trim();
  for (const m of SOURCE_URL_MAP) {
    if (text.toLowerCase().includes(m.key.toLowerCase())) return m.url;
  }
  return 'https://www.google.com/';
}

function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomCreatedAt(daysBack = 10) {
  const now = Date.now();
  const delta = Math.random() * daysBack * 24 * 60 * 60 * 1000;
  return new Date(now - delta).toISOString();
}

function buildBio(row) {
  const parts = [];
  if (row.shortTitle) parts.push(row.shortTitle);
  if (row.bio) parts.push(row.bio);
  if (row.newspapers) parts.push(`Çalıştığı gazeteler: ${row.newspapers}`);
  if (row.tvRadio) parts.push(`Çalıştığı TV & radyolar: ${row.tvRadio}`);
  return parts.filter(Boolean).join('\n\n');
}

function buildMediaPost(row, idx) {
  const templates = [
    'Gündem Notu: Bugün siyasette öne çıkan başlıkları derledik.',
    'Kulisten: Ankara’da gün boyu konuşulan başlıklar…',
    'Analiz: Veriler bize ne söylüyor? Kısa bir özet.',
    'Soru-Cevap: En çok merak edilen 3 konu ve yanıtları.',
    'Özet: Günün en kritik gelişmeleri (kısa).',
    'Değerlendirme: Tartışmanın iki tarafı ve olası sonuçlar.',
    'Ajanda: Yarın takip edeceğimiz başlıklar.',
    'Notlar: Röportaj/ekran arkasından kısa kesitler.',
  ];

  const contentText =
    `${templates[idx % templates.length]}\n\n` +
    `— ${row.fullName}\n` +
    `#Medya #Gündem`;

  // vary content type a bit
  const types = ['text', 'image', 'text', 'video', 'text', 'image'];
  const contentType = types[idx % types.length];

  let mediaUrls = [];
  let thumbnailUrl = null;
  let duration = null;
  if (contentType === 'image') {
    mediaUrls = [`https://picsum.photos/800/600?random=${randInt(1, 9999)}`];
  } else if (contentType === 'video') {
    thumbnailUrl = `https://picsum.photos/800/600?random=${randInt(1, 9999)}`;
    mediaUrls = [thumbnailUrl];
    duration = randInt(20, 110);
  }

  return {
    category: 'media',
    contentType,
    contentText,
    mediaUrls,
    thumbnailUrl,
    duration,
  };
}

// 18 media profiles from provided table
const MEDIA = [
  {
    fullName: 'İsmail Küçükkaya',
    shortTitle: 'Ana akım TV gazetecisi',
    bio: '1972 Balıkesir doğumlu. Uzun yıllar siyasi habercilik yaptı.',
    newspapers: 'Akşam, Cumhuriyet',
    tvRadio: 'Fox TV',
    imageFile: 'ismailkucukkaya.jpg',
  },
  {
    fullName: 'Fatih Altaylı',
    shortTitle: 'Köşe yazarı & yorumcu',
    bio: '1963 Van doğumlu. Sert üslubu ve siyasi analizleriyle tanınır.',
    newspapers: 'Hürriyet, Sabah',
    tvRadio: 'Habertürk TV',
    imageFile: 'channels4_profile.jpg',
  },
  {
    fullName: 'Ahmet Hakan',
    shortTitle: 'Genel yayın yönetmeni',
    bio: '1967 Yozgat doğumlu. Hem yazılı basın hem TV’de uzun yıllar çalıştı.',
    newspapers: 'Hürriyet, Yeni Şafak',
    tvRadio: 'CNN Türk',
    imageFile: 'ahmethakan.jpg',
  },
  {
    fullName: 'Cüneyt Özdemir',
    shortTitle: 'TV programcısı & dijital yayıncı',
    bio: '1970 Ankara doğumlu. Belgesel, haber ve YouTube yayıncılığıyla bilinir.',
    newspapers: 'Radikal',
    tvRadio: 'CNN Türk',
    // Storage filename differs from source list
    imageFile: 'q8oXtmV0_400x400.jpg',
  },
  {
    fullName: 'Yılmaz Özdil',
    shortTitle: 'Popüler köşe yazarı',
    bio: '1965 İzmir doğumlu. Milliyetçi‑Kemalist çizgide yazılarıyla bilinir.',
    newspapers: 'Hürriyet, Sözcü',
    tvRadio: '—',
    imageFile: '162440.jpg',
  },
  {
    fullName: 'Ertuğrul Özkök',
    shortTitle: 'Medya yöneticisi & yazar',
    bio: "1947 İzmir doğumlu. Uzun yıllar Türkiye'nin en etkili medya kurumlarında çalıştı.",
    newspapers: 'Hürriyet',
    tvRadio: 'CNN Türk',
    imageFile: 'ertugrul-ozkok.jpg',
  },
  {
    fullName: 'Nevşin Mengü',
    shortTitle: 'Siyasi gazeteci',
    bio: '1982 Ankara doğumlu. Dijital ve TV yayıncılığında aktiftir.',
    newspapers: 'BirGün',
    tvRadio: 'Fox TV, DW Türkçe',
    imageFile: 'channels4_profile (1).jpg',
  },
  {
    fullName: 'İrfan Değirmenci',
    shortTitle: 'Sabah programı sunucusu',
    bio: '1977 Ankara doğumlu. Uzun süre sabah haberleriyle tanındı.',
    newspapers: '—',
    tvRadio: 'Kanal D',
    imageFile: 'channels4_profile (2).jpg',
  },
  {
    fullName: 'Deniz Bayramoğlu',
    shortTitle: 'Haber sunucusu',
    bio: '1975 Malatya doğumlu. Siyasi tartışma programlarıyla bilinir.',
    newspapers: 'Milliyet',
    tvRadio: 'CNN Türk',
    imageFile: 'denizbayramoglu-1671127765-625x480.jpg',
  },
  {
    fullName: 'Ruşen Çakır',
    shortTitle: 'Siyasi analist',
    bio: '1962 Hopa doğumlu. Türkiye siyasetini analiz eden yayınlarıyla bilinir.',
    newspapers: 'Vatan, BirGün',
    tvRadio: 'Medyascope',
    imageFile: '44_650524_detay.jpg',
  },
  {
    fullName: 'Nagehan Alçı',
    shortTitle: 'Köşe yazarı & yorumcu',
    bio: '1977 İstanbul doğumlu. Siyasi yorumları ve tartışma programlarıyla bilinir.',
    newspapers: 'Sabah, Milliyet',
    tvRadio: 'Habertürk TV',
    // Storage filename differs from source list
    imageFile: 'G0RoGX2XoAAa_D2.jpg',
  },
  {
    fullName: 'Can Ataklı',
    shortTitle: 'Gazeteci & YouTuber',
    bio: '1956 İstanbul doğumlu. Uzun yıllar yazılı basında çalıştı; dijital yayında aktiftir.',
    newspapers: 'Hürriyet, Sabah',
    tvRadio: 'Flash TV',
    // Storage filename differs from source list
    imageFile: 'can-atakli-mediacat-aralik-2013-sayisi-soylesi-0.jpg',
  },
  {
    fullName: 'Barış Pehlivan',
    shortTitle: 'Araştırmacı gazeteci',
    bio: '1983 İstanbul doğumlu. Derin siyasi olaylar ve kitaplarıyla bilinir.',
    newspapers: 'Cumhuriyet',
    tvRadio: 'Halk TV',
    // NOTE: file is currently missing in avatars/media. Will fallback to default avatar.
    imageFile: null,
  },
  {
    fullName: 'Barış Terkoğlu',
    shortTitle: 'Siyasi yazar',
    bio: '1983 İstanbul doğumlu. Devlet, güvenlik ve siyaset konularında yazar.',
    newspapers: 'Cumhuriyet',
    tvRadio: 'Halk TV',
    imageFile: 'artist__10005.jpg',
  },
  {
    fullName: 'Şule Aydın',
    shortTitle: 'Program sunucusu',
    bio: 'Uzun yıllar ana akım TV’de çalıştı, son dönemde dijital yayında da aktif.',
    newspapers: '—',
    tvRadio: 'Halk TV',
    imageFile: 'gazeteciler-sule-aydin-ve-murat-agirel-e-yonelik-silahli-saldiri-ihbari-3430.jpg',
  },
  {
    fullName: 'Murat Yetkin',
    shortTitle: 'Siyasi analist',
    bio: '1959 Ankara doğumlu. Türk dış politikası ve güvenlik konularında yazar.',
    newspapers: 'Radikal, Hürriyet',
    tvRadio: 'CNN Türk',
    imageFile: 'muratyetkin.jpg',
  },
  {
    fullName: 'Enver Aysever',
    shortTitle: 'TV programcısı',
    bio: '1970 İstanbul doğumlu. Politik söyleşileriyle tanındı.',
    newspapers: 'BirGün',
    tvRadio: 'Halk TV',
    imageFile: 'artist__260378.jpg',
  },
  {
    fullName: 'İsmail Saymaz',
    shortTitle: 'Araştırmacı muhabir',
    bio: '1980 Rize doğumlu. Toplumsal olaylar ve yargı dosyalarıyla bilinir.',
    newspapers: 'Radikal, Sözcü',
    tvRadio: 'Halk TV',
    imageFile: '110667.jpg',
  },
];

async function ensureSchema(pool) {
  // Add is_automated if missing (UI uses it for KVKK/şeffaflık notice)
  await pool.query(`alter table public.users add column if not exists is_automated boolean default false`);
  await pool.query(`create index if not exists idx_users_is_automated on public.users(is_automated)`);
}

async function upsertUser(pool, row) {
  // Find existing by email/username/full_name
  const baseUsername = normalizeUsername(row.fullName);
  let username = baseUsername;

  // ensure username is unique
  for (let i = 0; i < 20; i++) {
    // eslint-disable-next-line no-await-in-loop
    const { rows } = await pool.query(`select id from public.users where username=$1 limit 1`, [username]);
    if (rows.length === 0) break;
    username = `${baseUsername.slice(0, 18)}${i}`.slice(0, 20);
  }

  const email = `${username}@polithane.media`;
  const avatarUrl = row.imageFile
    ? `${AVATARS_PUBLIC_BASE}/${MEDIA_FOLDER}/${row.imageFile}`
    : DEFAULT_AVATAR_URL;
  const bio = buildBio(row);

  // Try: match by full_name (case-insensitive) first
  const existing = await pool.query(
    `select id, username, email from public.users where lower(full_name)=lower($1) and user_type='media' limit 1`,
    [row.fullName]
  );

  if (existing.rows.length > 0) {
    const id = existing.rows[0].id;
    await pool.query(
      `update public.users
       set full_name=$2, bio=$3, avatar_url=$4, user_type='media', is_active=true, is_verified=false, is_automated=true
       where id=$1`,
      [id, row.fullName, bio, avatarUrl]
    );
    return { id, username: existing.rows[0].username };
  }

  // Insert new user
  const inserted = await pool.query(
    `insert into public.users (username,email,full_name,bio,avatar_url,user_type,is_active,is_verified,is_automated,created_at,updated_at)
     values ($1,$2,$3,$4,$5,'media',true,false,true,now(),now())
     returning id, username`,
    [username, email, row.fullName, bio, avatarUrl]
  );
  return inserted.rows[0];
}

async function ensureMediaPost(pool, userId, row, idx) {
  const exists = await pool.query(
    `select id from public.posts where user_id=$1 and category='media' and is_deleted=false limit 1`,
    [userId]
  );
  if (exists.rows.length > 0) return { created: false };

  const post = buildMediaPost(row, idx);
  const sourceUrl = pickSourceUrl(row.newspapers, row.tvRadio);
  const createdAt = randomCreatedAt(14);

  await pool.query(
    `insert into public.posts (
      user_id, party_id, content, category, media_urls,
      content_type, content_text, thumbnail_url, media_duration, agenda_tag,
      polit_score, view_count, like_count, dislike_count, comment_count, share_count,
      is_featured, is_trending, is_deleted, created_at, updated_at, source_url
    ) values (
      $1, null, $2, 'media', $3,
      $4, $5, $6, $7, $8,
      $9, $10, $11, $12, $13, $14,
      false, false, false, $15, now(), $16
    )`,
    [
      userId,
      post.contentText,
      JSON.stringify(post.mediaUrls),
      post.contentType,
      post.contentText,
      post.thumbnailUrl,
      post.duration,
      'Medya',
      randInt(200, 25000),
      randInt(100, 250000),
      randInt(5, 50000),
      randInt(0, 2000),
      randInt(0, 5000),
      randInt(0, 2000),
      createdAt,
      sourceUrl,
    ]
  );

  return { created: true };
}

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  try {
    await ensureSchema(pool);

    let createdUsers = 0;
    let updatedUsers = 0;
    let createdPosts = 0;

    for (let i = 0; i < MEDIA.length; i++) {
      const row = MEDIA[i];
      // eslint-disable-next-line no-await-in-loop
      const before = await pool.query(
        `select id from public.users where lower(full_name)=lower($1) and user_type='media' limit 1`,
        [row.fullName]
      );
      // eslint-disable-next-line no-await-in-loop
      const u = await upsertUser(pool, row);
      if (before.rows.length > 0) updatedUsers++;
      else createdUsers++;

      // eslint-disable-next-line no-await-in-loop
      const p = await ensureMediaPost(pool, u.id, row, i);
      if (p.created) createdPosts++;

      console.log(`✅ ${row.fullName} (@${u.username}) ${p.created ? '+post' : '(post mevcut)'}`);
    }

    console.log('\n=== ÖZET ===');
    console.log(`👤 Yeni medya profili: ${createdUsers}`);
    console.log(`♻️ Güncellenen medya profili: ${updatedUsers}`);
    console.log(`📝 Yeni medya postu: ${createdPosts}`);
  } finally {
    await pool.end();
  }
}

main().catch((e) => {
  console.error('❌ Failed:', e);
  process.exit(1);
});

