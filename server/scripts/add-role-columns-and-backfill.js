/**
 * Add role/location columns to public.users and backfill:
 * - city_code (plate code) derived from province
 * - politician_type for MPs
 * - provisional politician_type for party_officials:
 *   pick top official per (party_id, province) as provincial_chair
 *
 * Run:
 *   node server/scripts/add-role-columns-and-backfill.js
 */
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import pg from 'pg';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env') });

const { Pool } = pg;

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
  if (!province) return null;
  return CITY_NAME_TO_CODE.get(normalizeCityName(province)) || null;
}

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  try {
    console.log('🔧 Adding columns if missing...');
    await pool.query(`alter table public.users add column if not exists city_code varchar(2)`);
    await pool.query(`alter table public.users add column if not exists district_name varchar(100)`);
    await pool.query(`alter table public.users add column if not exists politician_type varchar(50)`);
    await pool.query(`create index if not exists idx_users_city_code on public.users(city_code)`);
    await pool.query(`create index if not exists idx_users_politician_type on public.users(politician_type)`);

    console.log('🏷️ Backfilling city_code from province...');
    const users = (await pool.query(`select id, province from public.users where province is not null and (city_code is null or city_code='')`)).rows;
    let updated = 0;
    for (const u of users) {
      const code = plateFromProvince(u.province);
      if (!code) continue;
      // eslint-disable-next-line no-await-in-loop
      await pool.query(`update public.users set city_code=$2 where id=$1`, [u.id, code]);
      updated++;
    }
    console.log(`✅ city_code updated: ${updated}`);

    console.log('👤 Marking MPs as politician_type=mp...');
    const mpRes = await pool.query(
      `update public.users set politician_type='mp' where user_type='mp' and (politician_type is null or politician_type='')`
    );
    console.log(`✅ MPs updated: ${mpRes.rowCount}`);

    console.log('🏛️ Deriving provincial chairs from party_officials (top by polit_score per party+province)...');
    // Reset unknown official types to plain 'party_official' (only where null)
    await pool.query(
      `update public.users set politician_type='party_official'
       where user_type='party_official' and (politician_type is null or politician_type='')`
    );

    const groups = (await pool.query(
      `select party_id, province
       from public.users
       where user_type='party_official' and party_id is not null and province is not null
       group by party_id, province`
    )).rows;

    let chairs = 0;
    for (const g of groups) {
      // eslint-disable-next-line no-await-in-loop
      const top = await pool.query(
        `select id
         from public.users
         where user_type='party_official' and party_id=$1 and province=$2
         order by polit_score desc nulls last, created_at asc
         limit 1`,
        [g.party_id, g.province]
      );
      if (!top.rows[0]) continue;
      // eslint-disable-next-line no-await-in-loop
      await pool.query(`update public.users set politician_type='provincial_chair' where id=$1`, [top.rows[0].id]);
      chairs++;
    }
    console.log(`✅ provincial_chair assigned: ${chairs}`);
  } finally {
    await pool.end();
  }
}

main().catch((e) => {
  console.error('❌ Failed:', e);
  process.exit(1);
});

