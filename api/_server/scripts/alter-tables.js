import dotenv from 'dotenv';
import { sql } from '../db.js';

dotenv.config();
console.log('🔧 Veritabanı tablolarını güncelleniyor...\n');

async function alterTables() {
  try {
    // Add missing columns to users table
    console.log('👥 Users tablosu güncelleniyor...');
    await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS user_type VARCHAR(20) DEFAULT 'normal'`;
    await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS politician_type VARCHAR(50)`;
    await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS party_id INTEGER`;
    await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS city_code CHAR(2)`;
    await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS district_name VARCHAR(100)`;
    await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE`;
    await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT FALSE`;
    console.log('✅ Users tablosu güncellendi\n');

    // Add missing columns to parties table
    console.log('🏛️  Parties tablosu güncelleniyor...');
    await sql`ALTER TABLE parties ADD COLUMN IF NOT EXISTS slug VARCHAR(100)`;
    await sql`ALTER TABLE parties ADD COLUMN IF NOT EXISTS short_name VARCHAR(50)`;
    await sql`ALTER TABLE parties ADD COLUMN IF NOT EXISTS logo_url VARCHAR(500)`;
    await sql`ALTER TABLE parties ADD COLUMN IF NOT EXISTS flag_url VARCHAR(500)`;
    await sql`ALTER TABLE parties ADD COLUMN IF NOT EXISTS color VARCHAR(7)`;
    await sql`ALTER TABLE parties ADD COLUMN IF NOT EXISTS parliament_seats INTEGER DEFAULT 0`;
    await sql`ALTER TABLE parties ADD COLUMN IF NOT EXISTS mp_count INTEGER DEFAULT 0`;
    await sql`ALTER TABLE parties ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE`;
    await sql`ALTER TABLE parties ADD COLUMN IF NOT EXISTS polit_score BIGINT DEFAULT 0`;
    console.log('✅ Parties tablosu güncellendi\n');

    // Add missing columns to posts table
    console.log('📝 Posts tablosu güncelleniyor...');
    await sql`ALTER TABLE posts ADD COLUMN IF NOT EXISTS content_type VARCHAR(10) DEFAULT 'text'`;
    await sql`ALTER TABLE posts ADD COLUMN IF NOT EXISTS party_id INTEGER`;
    await sql`ALTER TABLE posts ADD COLUMN IF NOT EXISTS media_urls JSONB`;
    await sql`ALTER TABLE posts ADD COLUMN IF NOT EXISTS thumbnail_url VARCHAR(500)`;
    await sql`ALTER TABLE posts ADD COLUMN IF NOT EXISTS media_duration INTEGER`;
    await sql`ALTER TABLE posts ADD COLUMN IF NOT EXISTS category VARCHAR(20) DEFAULT 'general'`;
    await sql`ALTER TABLE posts ADD COLUMN IF NOT EXISTS agenda_tag VARCHAR(200)`;
    await sql`ALTER TABLE posts ADD COLUMN IF NOT EXISTS polit_score BIGINT DEFAULT 0`;
    await sql`ALTER TABLE posts ADD COLUMN IF NOT EXISTS view_count INTEGER DEFAULT 0`;
    await sql`ALTER TABLE posts ADD COLUMN IF NOT EXISTS like_count INTEGER DEFAULT 0`;
    await sql`ALTER TABLE posts ADD COLUMN IF NOT EXISTS dislike_count INTEGER DEFAULT 0`;
    await sql`ALTER TABLE posts ADD COLUMN IF NOT EXISTS comment_count INTEGER DEFAULT 0`;
    await sql`ALTER TABLE posts ADD COLUMN IF NOT EXISTS share_count INTEGER DEFAULT 0`;
    await sql`ALTER TABLE posts ADD COLUMN IF NOT EXISTS is_featured BOOLEAN DEFAULT FALSE`;
    await sql`ALTER TABLE posts ADD COLUMN IF NOT EXISTS is_trending BOOLEAN DEFAULT FALSE`;
    await sql`ALTER TABLE posts ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT FALSE`;
    console.log('✅ Posts tablosu güncellendi\n');

    // Add missing columns to agendas table
    console.log('📌 Agendas tablosu güncelleniyor...');
    await sql`ALTER TABLE agendas ADD COLUMN IF NOT EXISTS slug VARCHAR(255)`;
    await sql`ALTER TABLE agendas ADD COLUMN IF NOT EXISTS description TEXT`;
    await sql`ALTER TABLE agendas ADD COLUMN IF NOT EXISTS post_count INTEGER DEFAULT 0`;
    await sql`ALTER TABLE agendas ADD COLUMN IF NOT EXISTS total_polit_score BIGINT DEFAULT 0`;
    await sql`ALTER TABLE agendas ADD COLUMN IF NOT EXISTS trending_score INTEGER DEFAULT 0`;
    await sql`ALTER TABLE agendas ADD COLUMN IF NOT EXISTS is_trending BOOLEAN DEFAULT FALSE`;
    await sql`ALTER TABLE agendas ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE`;
    console.log('✅ Agendas tablosu güncellendi\n');

    // Create indexes
    console.log('📊 İndexler oluşturuluyor...');
    await sql`CREATE INDEX IF NOT EXISTS idx_users_user_type ON users(user_type)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_users_party_id ON users(party_id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_parties_slug ON parties(slug)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_posts_content_type ON posts(content_type)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_posts_category ON posts(category)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_posts_polit_score ON posts(polit_score DESC)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_agendas_slug ON agendas(slug)`;
    console.log('✅ İndexler oluşturuldu\n');

    console.log('🎉 Veritabanı güncelleme tamamlandı!\n');

  } catch (error) {
    console.error('❌ Hata:', error.message);
    process.exit(1);
  }
  
  process.exit(0);
}

alterTables();
