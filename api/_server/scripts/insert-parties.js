/**
 * Insert Turkish Political Parties
 */

import pg from 'pg';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });

const { Pool } = pg;

const parties = [
  {
    name: 'Cumhuriyet Halk Partisi',
    short_name: 'CHP',
    slug: 'chp',
    description: 'Cumhuriyet Halk Partisi',
    logo_url: 'https://eldoyqgzxgubkyohvquq.supabase.co/storage/v1/object/public/avatars/party-logos/chp-logo.png',
    color: '#E30A17',
    parliament_seats: 136,
  },
  {
    name: 'Adalet ve Kalkınma Partisi',
    short_name: 'AKP',
    slug: 'akp',
    description: 'Adalet ve Kalkınma Partisi',
    logo_url: 'https://eldoyqgzxgubkyohvquq.supabase.co/storage/v1/object/public/avatars/party-logos/akp-logo.png',
    color: '#F7941D',
    parliament_seats: 268,
  },
  {
    name: 'Milliyetçi Hareket Partisi',
    short_name: 'MHP',
    slug: 'mhp',
    description: 'Milliyetçi Hareket Partisi',
    logo_url: 'https://eldoyqgzxgubkyohvquq.supabase.co/storage/v1/object/public/avatars/party-logos/mhp-logo.png',
    color: '#ED1C24',
    parliament_seats: 50,
  },
  {
    name: 'İyi Parti',
    short_name: 'İYİ',
    slug: 'iyi',
    description: 'İyi Parti',
    logo_url: 'https://eldoyqgzxgubkyohvquq.supabase.co/storage/v1/object/public/avatars/party-logos/iyi-logo.png',
    color: '#00A7E8',
    parliament_seats: 43,
  },
  {
    name: 'Halkların Demokratik Partisi',
    short_name: 'HDP',
    slug: 'hdp',
    description: 'Halkların Demokratik Partisi',
    logo_url: 'https://eldoyqgzxgubkyohvquq.supabase.co/storage/v1/object/public/avatars/party-logos/hdp-logo.png',
    color: '#9B2FAE',
    parliament_seats: 0,
  },
  {
    name: 'Demokrat Parti',
    short_name: 'DP',
    slug: 'dp',
    description: 'Demokrat Parti',
    color: '#006BB7',
    parliament_seats: 0,
  },
];

async function insertParties() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });
  
  try {
    console.log('🏛️  Partiler ekleniyor...\n');
    
    for (const party of parties) {
      const result = await pool.query(`
        INSERT INTO parties (name, short_name, slug, description, logo_url, color, parliament_seats, is_active)
        VALUES ($1, $2, $3, $4, $5, $6, $7, true)
        ON CONFLICT (slug) DO UPDATE SET
          name = EXCLUDED.name,
          short_name = EXCLUDED.short_name,
          logo_url = EXCLUDED.logo_url,
          color = EXCLUDED.color,
          parliament_seats = EXCLUDED.parliament_seats
        RETURNING id, short_name
      `, [
        party.name,
        party.short_name,
        party.slug,
        party.description,
        party.logo_url || null,
        party.color,
        party.parliament_seats
      ]);
      
      console.log(`✅ ${party.short_name} (ID: ${result.rows[0].id})`);
    }
    
    console.log('\n🎉 Tüm partiler başarıyla eklendi!');
    
  } catch (error) {
    console.error('❌ Hata:', error.message);
  } finally {
    await pool.end();
  }
}

insertParties();
