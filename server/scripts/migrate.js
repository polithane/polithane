import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { neon } from '@neondatabase/serverless';

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const sql = neon(process.env.DATABASE_URL);

async function runMigration() {
  console.log('🔄 Database migration başlatılıyor...\n');

  try {
    // Read migration file
    const migrationPath = join(__dirname, '../migrations/001_init_schema.sql');
    const migrationSQL = readFileSync(migrationPath, 'utf-8');

    console.log('📄 Migration dosyası okundu');
    console.log('📊 Tablolar oluşturuluyor...\n');

    // Split by semicolon and execute each statement
    const statements = migrationSQL
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));

    for (const statement of statements) {
      try {
        await sql(statement);
      } catch (error) {
        // Ignore "already exists" errors
        if (!error.message.includes('already exists')) {
          throw error;
        }
      }
    }

    console.log('✅ Migration başarıyla tamamlandı!\n');
    console.log('📋 Oluşturulan tablolar:');
    console.log('   - users');
    console.log('   - parties');
    console.log('   - posts');
    console.log('   - comments');
    console.log('   - likes');
    console.log('   - follows');
    console.log('   - agendas');
    console.log('   - notifications');
    console.log('   - polit_score_history');
    console.log('   - trending_posts (view)\n');

    // Verify tables
    const tables = await sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `;

    console.log(`✓ Toplam ${tables.length} tablo oluşturuldu`);

  } catch (error) {
    console.error('❌ Migration hatası:', error.message);
    process.exit(1);
  }

  process.exit(0);
}

runMigration();
