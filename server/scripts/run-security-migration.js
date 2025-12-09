/**
 * =================================================
 * GÜVENLİK TABLOLARINI OLUŞTUR
 * =================================================
 */

import { neon } from '@neondatabase/serverless';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const sql = neon(process.env.DATABASE_URL);

async function runSecurityMigration() {
  try {
    console.log('🔒 Güvenlik tabloları oluşturuluyor...\n');

    // Migration dosyasını oku
    const migrationPath = path.join(__dirname, '..', 'migrations', '005_security_tables.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

    // SQL'i çalıştır
    await sql([migrationSQL]);

    console.log('✅ Güvenlik tabloları başarıyla oluşturuldu!');
    console.log('\n📊 Oluşturulan tablolar:');
    console.log('   - failed_login_attempts');
    console.log('   - blacklisted_ips');
    console.log('   - suspicious_activities');
    console.log('\n🛡️ Güvenlik özellikleri aktif!');

  } catch (error) {
    console.error('❌ Migration hatası:', error);
    process.exit(1);
  }
}

runSecurityMigration();
