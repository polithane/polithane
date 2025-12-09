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

    // 1. Failed login attempts tablosu
    console.log('Creating failed_login_attempts...');
    await sql`
      CREATE TABLE IF NOT EXISTS failed_login_attempts (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) NOT NULL,
        ip_address VARCHAR(45) NOT NULL,
        attempt_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        user_agent TEXT
      )
    `;
    
    await sql`CREATE INDEX IF NOT EXISTS idx_failed_login_email ON failed_login_attempts(email)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_failed_login_ip ON failed_login_attempts(ip_address)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_failed_login_time ON failed_login_attempts(attempt_time)`;

    // 2. Blacklisted IPs tablosu
    console.log('Creating blacklisted_ips...');
    await sql`
      CREATE TABLE IF NOT EXISTS blacklisted_ips (
        id SERIAL PRIMARY KEY,
        ip_address VARCHAR(45) UNIQUE NOT NULL,
        reason TEXT,
        blocked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        blocked_until TIMESTAMP,
        permanent BOOLEAN DEFAULT FALSE
      )
    `;
    
    await sql`CREATE INDEX IF NOT EXISTS idx_blacklisted_ips ON blacklisted_ips(ip_address)`;

    // 3. Suspicious activities tablosu
    console.log('Creating suspicious_activities...');
    await sql`
      CREATE TABLE IF NOT EXISTS suspicious_activities (
        id SERIAL PRIMARY KEY,
        ip_address VARCHAR(45) NOT NULL,
        email VARCHAR(255),
        activity_type VARCHAR(50) NOT NULL,
        details TEXT,
        detected_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;
    
    await sql`CREATE INDEX IF NOT EXISTS idx_suspicious_ip ON suspicious_activities(ip_address)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_suspicious_email ON suspicious_activities(email)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_suspicious_time ON suspicious_activities(detected_at)`;

    console.log('\n✅ Güvenlik tabloları başarıyla oluşturuldu!');
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
