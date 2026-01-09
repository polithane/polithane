import pg from 'pg';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });

const { Pool } = pg;

async function testConnection() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });
  
  try {
    console.log('🔌 Bağlanıyor...');
    const result = await pool.query('SELECT COUNT(*) as count FROM users');
    console.log('✅ Bağlantı başarılı!');
    console.log('📊 Kullanıcı sayısı:', result.rows[0].count);
  } catch (error) {
    console.error('❌ Bağlantı hatası:', error.message);
  } finally {
    await pool.end();
  }
}

testConnection();
