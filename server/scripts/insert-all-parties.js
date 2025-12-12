/**
 * Insert All Turkish Political Parties (15 total)
 */

import pg from 'pg';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });

const { Pool } = pg;

const BASE_URL = 'https://eldoyqgzxgubkyohvquq.supabase.co/storage/v1/object/public/avatars/party-logos';

const parties = [
  // Mevcut 6 parti (güncelleme)
  {
    name: 'Cumhuriyet Halk Partisi',
    short_name: 'CHP',
    slug: 'chp',
    description: "Mustafa Kemal Atatürk tarafından 1923'te kurulan, Türkiye'nin en köklü siyasi partisi. Sosyal demokrasi ilkelerini benimser.",
    logo_url: `${BASE_URL}/chp.png`,
    color: '#E30A17',
    parliament_seats: 136,
    foundation_date: '1923-09-09',
  },
  {
    name: 'Adalet ve Kalkınma Partisi',
    short_name: 'AK PARTİ',
    slug: 'akp',
    description: '2001 yılında kurulan, muhafazakar demokrat bir partidir. 2002 yılından beri iktidardadır.',
    logo_url: `${BASE_URL}/ak_parti.png`,
    color: '#F7941D',
    parliament_seats: 268,
    foundation_date: '2001-08-14',
  },
  {
    name: 'Milliyetçi Hareket Partisi',
    short_name: 'MHP',
    slug: 'mhp',
    description: "1969'da Alparslan Türkeş tarafından kurulan milliyetçi-muhafazakar bir partidir.",
    logo_url: `${BASE_URL}/mhp.png`,
    color: '#ED1C24',
    parliament_seats: 50,
    foundation_date: '1969-02-01',
  },
  {
    name: 'İyi Parti',
    short_name: 'İYİ PARTİ',
    slug: 'iyi',
    description: "2017'de Meral Akşener tarafından kurulan merkez sağ, milliyetçi-liberal bir partidir.",
    logo_url: `${BASE_URL}/iyi_parti.png`,
    color: '#00A7E8',
    parliament_seats: 43,
    foundation_date: '2017-10-25',
  },
  {
    name: 'Demokrat Parti',
    short_name: 'DP',
    slug: 'dp',
    description: "1946'da kurulan tarihi Demokrat Parti'nin devamı niteliğindeki merkez sağ partidir.",
    logo_url: `${BASE_URL}/dp.png`,
    color: '#006BB7',
    parliament_seats: 0,
    foundation_date: '1983-03-23',
  },
  
  // YENİ 9 PARTİ
  {
    name: 'DEM Parti',
    short_name: 'DEM',
    slug: 'dem',
    description: "2023'te kurulan, demokratik sol ve Kürt siyasi hareketini temsil eden partidir. HDP'nin devamı niteliğindedir.",
    logo_url: `${BASE_URL}/dem_parti.png`,
    color: '#7B3294',
    parliament_seats: 57,
    foundation_date: '2023-08-25',
  },
  {
    name: 'Yeniden Refah Partisi',
    short_name: 'YRP',
    slug: 'yrp',
    description: "2018'de Fatih Erbakan tarafından kurulan İslamcı-muhafazakar bir partidir. Milli Görüş geleneğini sürdürür.",
    logo_url: `${BASE_URL}/yrp.png`,
    color: '#00843D',
    parliament_seats: 5,
    foundation_date: '2018-08-24',
  },
  {
    name: 'Saadet Partisi',
    short_name: 'SP',
    slug: 'saadet',
    description: "2001'de kurulan, Milli Görüş hareketinin günümüzdeki temsilcisi İslamcı-muhafazakar partidir.",
    logo_url: `${BASE_URL}/saadet.png`,
    color: '#0066CC',
    parliament_seats: 0,
    foundation_date: '2001-07-20',
  },
  {
    name: 'Türkiye İşçi Partisi',
    short_name: 'TİP',
    slug: 'tip',
    description: "1961'de kurulan, Türkiye'nin en eski sol partidir. Sosyalist bir çizgiye sahiptir.",
    logo_url: `${BASE_URL}/tip.png`,
    color: '#DC143C',
    parliament_seats: 4,
    foundation_date: '1961-02-13',
  },
  {
    name: 'Demokratik Sol Parti',
    short_name: 'DSP',
    slug: 'dsp',
    description: "1985'te Rahşan Ecevit tarafından kurulan sosyal demokrat bir partidir. Bülent Ecevit'in siyasi mirasını taşır.",
    logo_url: `${BASE_URL}/dsp.png`,
    color: '#D62027',
    parliament_seats: 0,
    foundation_date: '1985-11-14',
  },
  {
    name: 'Demokratik Bölgeler Partisi',
    short_name: 'DBP',
    slug: 'dbp',
    description: "2014'te kurulan, yerel yönetimlerde güçlü olan, demokratik özerklik taraftarı sol partidir.",
    logo_url: `${BASE_URL}/dbp.png`,
    color: '#6A1B9A',
    parliament_seats: 0,
    foundation_date: '2014-07-08',
  },
  {
    name: 'Emek Partisi',
    short_name: 'EMEP',
    slug: 'emep',
    description: "1996'da kurulan, işçi sınıfının ve emekçilerin partisi olarak tanımlanan sosyalist bir partidir.",
    logo_url: `${BASE_URL}/emep.png`,
    color: '#C41E3A',
    parliament_seats: 0,
    foundation_date: '1996-10-28',
  },
  {
    name: 'HÜR DAVA Partisi',
    short_name: 'HÜDAPAR',
    slug: 'hurdava',
    description: "2012'de kurulan, İslamcı Kürt siyasi hareketini temsil eden muhafazakar bir partidir.",
    logo_url: `${BASE_URL}/hurdava.png`,
    color: '#004D40',
    parliament_seats: 0,
    foundation_date: '2012-12-19',
  },
  {
    name: 'Bağımsız',
    short_name: 'BAĞIMSIZ',
    slug: 'bagimsiz',
    description: 'Herhangi bir partiye bağlı olmayan bağımsız milletvekilleri ve adaylar.',
    logo_url: `${BASE_URL}/bagimsiz.png`,
    color: '#808080',
    parliament_seats: 0,
    foundation_date: null,
  },
];

async function insertAllParties() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });
  
  try {
    console.log('🏛️  15 Parti Ekleniyor/Güncelleniyor...\n');
    
    let updatedCount = 0;
    let newCount = 0;
    
    for (const party of parties) {
      const result = await pool.query(`
        INSERT INTO parties (
          name, short_name, slug, description, logo_url, color, 
          parliament_seats, foundation_date, is_active
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, true)
        ON CONFLICT (slug) DO UPDATE SET
          name = EXCLUDED.name,
          short_name = EXCLUDED.short_name,
          description = EXCLUDED.description,
          logo_url = EXCLUDED.logo_url,
          color = EXCLUDED.color,
          parliament_seats = EXCLUDED.parliament_seats,
          foundation_date = EXCLUDED.foundation_date,
          updated_at = NOW()
        RETURNING id, slug, 
          CASE WHEN xmax = 0 THEN 'new' ELSE 'updated' END as status
      `, [
        party.name,
        party.short_name,
        party.slug,
        party.description,
        party.logo_url,
        party.color,
        party.parliament_seats,
        party.foundation_date
      ]);
      
      const status = result.rows[0].status === 'new' ? 'YENİ' : 'GÜNCELLENDİ';
      if (status === 'YENİ') newCount++;
      else updatedCount++;
      
      console.log(`${status === 'YENİ' ? '✨' : '🔄'} ${party.short_name.padEnd(12)} - ${party.name} (${status})`);
    }
    
    console.log('\n' + '='.repeat(70));
    console.log(`🎉 İşlem Tamamlandı!`);
    console.log(`   Yeni Eklenen: ${newCount}`);
    console.log(`   Güncellenen: ${updatedCount}`);
    console.log(`   Toplam: ${parties.length} parti`);
    console.log('='.repeat(70));
    
  } catch (error) {
    console.error('❌ Hata:', error.message);
  } finally {
    await pool.end();
  }
}

insertAllParties();
