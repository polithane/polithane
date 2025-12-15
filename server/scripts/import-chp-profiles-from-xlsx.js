/**
 * Import CHP roles from chpprofilleri.xlsx into public.users.
 *
 * Spreadsheet columns:
 * - Ad Soyad
 * - İl
 * - Görev
 * - Görev 2
 * - Resim Dosya
 *
 * Mappings:
 * - İl Başkanı -> politician_type=provincial_chair
 * - <DISTRICT> İlçe Başkanı -> politician_type=district_chair, district_name=<DISTRICT>
 * - İl Belediye Başkanı -> politician_type=metropolitan_mayor
 * - <DISTRICT> İlçe Belediye Başkanı -> politician_type=district_mayor, district_name=<DISTRICT>
 *
 * Also sets:
 * - user_type='party_official' (for these roles)
 * - province from İl column
 * - city_code derived from province
 * - avatar_url to avatars/politicians/<Resim Dosya> when provided
 *
 * Run:
 *   node server/scripts/import-chp-profiles-from-xlsx.js
 */
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import pg from 'pg';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const XLSX = require('xlsx');

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env') });

const { Pool } = pg;

const XLSX_PATH = path.join(__dirname, '../../chpprofilleri.xlsx');

const CITY_CODES = {
  '01': 'Adana',
  '02': 'Adıyaman',
  '03': 'Afyonkarahisar',
  '04': 'Ağrı',
  '05': 'Amasya',
  '06': 'Ankara',
  '07': 'Antalya',
  '08': 'Artvin',
  '09': 'Aydın',
  '10': 'Balıkesir',
  '11': 'Bilecik',
  '12': 'Bingöl',
  '13': 'Bitlis',
  '14': 'Bolu',
  '15': 'Burdur',
  '16': 'Bursa',
  '17': 'Çanakkale',
  '18': 'Çankırı',
  '19': 'Çorum',
  '20': 'Denizli',
  '21': 'Diyarbakır',
  '22': 'Edirne',
  '23': 'Elazığ',
  '24': 'Erzincan',
  '25': 'Erzurum',
  '26': 'Eskişehir',
  '27': 'Gaziantep',
  '28': 'Giresun',
  '29': 'Gümüşhane',
  '30': 'Hakkari',
  '31': 'Hatay',
  '32': 'Isparta',
  '33': 'Mersin',
  '34': 'İstanbul',
  '35': 'İzmir',
  '36': 'Kars',
  '37': 'Kastamonu',
  '38': 'Kayseri',
  '39': 'Kırklareli',
  '40': 'Kırşehir',
  '41': 'Kocaeli',
  '42': 'Konya',
  '43': 'Kütahya',
  '44': 'Malatya',
  '45': 'Manisa',
  '46': 'Kahramanmaraş',
  '47': 'Mardin',
  '48': 'Muğla',
  '49': 'Muş',
  '50': 'Nevşehir',
  '51': 'Niğde',
  '52': 'Ordu',
  '53': 'Rize',
  '54': 'Sakarya',
  '55': 'Samsun',
  '56': 'Siirt',
  '57': 'Sinop',
  '58': 'Sivas',
  '59': 'Tekirdağ',
  '60': 'Tokat',
  '61': 'Trabzon',
  '62': 'Tunceli',
  '63': 'Şanlıurfa',
  '64': 'Uşak',
  '65': 'Van',
  '66': 'Yozgat',
  '67': 'Zonguldak',
  '68': 'Aksaray',
  '69': 'Bayburt',
  '70': 'Karaman',
  '71': 'Kırıkkale',
  '72': 'Batman',
  '73': 'Şırnak',
  '74': 'Bartın',
  '75': 'Ardahan',
  '76': 'Iğdır',
  '77': 'Yalova',
  '78': 'Karabük',
  '79': 'Kilis',
  '80': 'Osmaniye',
  '81': 'Düzce',
};

const normalizeCityName = (name) =>
  String(name || '')
    .trim()
    .toLowerCase('tr-TR')
    .replace(/ç/g, 'c')
    .replace(/ğ/g, 'g')
    .replace(/ı/g, 'i')
    .replace(/ö/g, 'o')
    .replace(/ş/g, 's')
    .replace(/ü/g, 'u')
    .replace(/\s+/g, ' ');

const CITY_NAME_TO_CODE = (() => {
  const m = new Map();
  Object.entries(CITY_CODES).forEach(([code, cityName]) => {
    m.set(normalizeCityName(cityName), code);
  });
  return m;
})();

function plateFromProvince(province) {
  return CITY_NAME_TO_CODE.get(normalizeCityName(province)) || null;
}

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

function normalizeName(value) {
  return String(value || '')
    .trim()
    .split('')
    .map((ch) => turkishMap[ch] ?? ch)
    .join('')
    .toUpperCase()
    .replace(/[^A-Z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function toAsciiLower(value) {
  return String(value || '')
    .trim()
    .split('')
    .map((ch) => turkishMap[ch] ?? ch)
    .join('')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function buildUsernameBase(fullName) {
  const ascii = toAsciiLower(fullName);
  const parts = ascii.split(' ').filter(Boolean);
  if (parts.length === 0) return 'user';
  if (parts.length === 1) return parts[0].slice(0, 20);
  const first = parts[0];
  const last = parts[parts.length - 1];
  // first initial + last name tends to be short and readable
  const base = `${first[0] || ''}${last}`.replace(/\s+/g, '');
  return base.slice(0, 20) || last.slice(0, 20) || 'user';
}

function ensureUniqueUsername(base, taken) {
  const clean = String(base || 'user')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
    .slice(0, 20) || 'user';
  if (!taken.has(clean)) {
    taken.add(clean);
    return clean;
  }
  for (let i = 2; i < 9999; i++) {
    const suffix = String(i);
    const candidate = (clean.slice(0, Math.max(1, 20 - suffix.length)) + suffix).slice(0, 20);
    if (!taken.has(candidate)) {
      taken.add(candidate);
      return candidate;
    }
  }
  // fallback
  const fallback = `${clean.slice(0, 16)}${Date.now().toString().slice(-4)}`.slice(0, 20);
  taken.add(fallback);
  return fallback;
}

function parseRole(gorevRaw = '') {
  const gorev = String(gorevRaw || '').trim();
  if (!gorev) return null;
  if (gorev === 'İl Başkanı') return { politician_type: 'provincial_chair' };
  if (gorev === 'İl Belediye Başkanı') return { politician_type: 'metropolitan_mayor' };

  const ilceBaskan = gorev.match(/^(.*)\s+İlçe Başkanı$/);
  if (ilceBaskan) return { politician_type: 'district_chair', district_name: ilceBaskan[1].trim() };

  const ilceBelediye = gorev.match(/^(.*)\s+İlçe Belediye Başkanı$/);
  if (ilceBelediye) return { politician_type: 'district_mayor', district_name: ilceBelediye[1].trim() };

  // keep other party_official roles if desired
  if (gorev === 'MYK Üyesi') return { politician_type: 'myk_member' };
  if (gorev === 'Parti Meclisi Üyesi') return { politician_type: 'pm_member' };
  if (gorev === 'Millet Vekili' || gorev === 'Milletvekili') return { politician_type: 'mp' };

  return { politician_type: 'party_official' };
}

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const SUPABASE_URL = process.env.SUPABASE_URL || 'https://eldoyqgzxgubkyohvquq.supabase.co';
  const AVATAR_BASE = `${SUPABASE_URL}/storage/v1/object/public/avatars/politicians/`;

  try {
    const wb = XLSX.readFile(XLSX_PATH);
    const sheet = wb.Sheets[wb.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(sheet, { defval: '' });

    const chp = await pool.query(`select id from public.parties where slug='chp' limit 1`);
    if (!chp.rows[0]) throw new Error('CHP party not found');
    const chpId = chp.rows[0].id;

    // fetch all CHP users once
    const existing = (
      await pool.query(
        `select id, full_name, username
         from public.users
         where party_id=$1`,
        [chpId]
      )
    ).rows;

    const byName = new Map();
    const takenUsernames = new Set();
    for (const u of existing) {
      const key = normalizeName(u.full_name);
      if (!byName.has(key)) byName.set(key, []);
      byName.get(key).push(u);
      if (u.username) takenUsernames.add(String(u.username).toLowerCase());
    }

    let updated = 0;
    let created = 0;
    let missing = 0; // missing and NOT created (e.g. invalid rows)
    let skipped = 0;

    for (const r of rows) {
      const fullName = String(r['Ad Soyad'] || '').trim();
      const province = String(r['İl'] || '').trim();
      const gorev = String(r['Görev'] || '').trim();
      const gorev2 = String(r['Görev 2'] || '').trim();
      const imageFile = String(r['Resim Dosya'] || '').trim();

      if (!fullName || !province || !gorev) {
        skipped++;
        continue;
      }

      const role = parseRole(gorev);
      if (!role) {
        skipped++;
        continue;
      }

      const nameKey = normalizeName(fullName);
      const candidates = byName.get(nameKey) || [];
      let userId = candidates[0]?.id || null;

      const districtNameRaw = role.district_name || null;
      let districtName = districtNameRaw;
      if (districtName) {
        // if districtName includes province prefix, strip it
        const provNorm = normalizeName(province);
        const distNorm = normalizeName(districtName);
        if (distNorm.startsWith(provNorm + ' ')) {
          districtName = districtName.substring(province.length).trim();
        }
      }

      const cityCode = plateFromProvince(province) || null;
      const avatarUrl = imageFile ? `${AVATAR_BASE}${imageFile}` : null;

      if (!userId) {
        const base = buildUsernameBase(fullName);
        const username = ensureUniqueUsername(base, takenUsernames);
        // eslint-disable-next-line no-await-in-loop
        const inserted = await pool.query(
          `insert into public.users
            (email, username, full_name, avatar_url, bio, user_type, politician_type, is_active, is_verified, is_automated, party_id, province, city_code, district_name, follower_count, following_count, post_count, polit_score)
           values
            ($1,$2,$3,$4,$5,$6,$7,true,true,true,$8,$9,$10,$11,0,0,0,0)
           returning id, username, full_name`,
          [
            `${username}@polithane.auto`,
            username,
            fullName,
            avatarUrl,
            'Bu üyelik sitemiz tarafından otomatik olarak oluşturulmuştur ve paylaşımlar yapay zeka tarafından yapılmaktadır.',
            'party_official',
            role.politician_type,
            chpId,
            province,
            cityCode,
            districtName,
          ]
        );
        userId = inserted.rows?.[0]?.id || null;
        if (userId) {
          created++;
          const rec = inserted.rows[0];
          if (!byName.has(nameKey)) byName.set(nameKey, []);
          byName.get(nameKey).push(rec);
        } else {
          missing++;
          continue;
        }
      }

      // eslint-disable-next-line no-await-in-loop
      await pool.query(
        `update public.users
         set user_type='party_official',
             politician_type=$2,
             province=$3,
             district_name=$4,
             city_code=coalesce($5, city_code),
             avatar_url=coalesce($6, avatar_url)
         where id=$1`,
        [userId, role.politician_type, province, districtName, cityCode, avatarUrl]
      );
      updated++;
    }

    console.log('✅ CHP XLSX import done');
    console.log({ updated, created, missing, skipped, totalRows: rows.length });

    const counts = await pool.query(
      `select politician_type, count(*)::int as c
       from public.users
       where party_id=$1 and user_type='party_official'
       group by politician_type
       order by c desc`,
      [chpId]
    );
    console.log('CHP party_official by politician_type:', counts.rows);
  } finally {
    await pool.end();
  }
}

main().catch((e) => {
  console.error('❌ Failed:', e);
  process.exit(1);
});

