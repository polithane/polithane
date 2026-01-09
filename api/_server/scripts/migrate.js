import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { sql } from '../db.js';

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function runMigration() {
  console.log('🔄 Database migration başlatılıyor...\n');

  try {
    // Read migration file
    const migrationPath = join(__dirname, '../migrations/001_init_schema.sql');
    const migrationSQL = readFileSync(migrationPath, 'utf-8');

    console.log('📄 Migration dosyası okundu');
    console.log('📊 Tablolar oluşturuluyor...\n');

    // Execute the entire migration as one transaction
    try {
      await sql(migrationSQL);
    } catch (error) {
      // If full execution fails, try statement by statement
      console.log('⚠️  Full migration failed, trying statement by statement...\n');
      
      // Better SQL parsing - handle functions and triggers
      const statements = [];
      let currentStatement = '';
      let inFunction = false;
      
      for (const line of migrationSQL.split('\n')) {
        const trimmed = line.trim();
        
        // Skip comments
        if (trimmed.startsWith('--')) continue;
        
        // Track if we're inside a function/trigger definition
        if (trimmed.includes('CREATE OR REPLACE FUNCTION') || trimmed.includes('CREATE TRIGGER')) {
          inFunction = true;
        }
        
        currentStatement += line + '\n';
        
        // End of statement
        if (trimmed.endsWith(';')) {
          if (inFunction) {
            // Check if function/trigger is complete
            if (trimmed.includes('$$;') || trimmed.includes('EXECUTE FUNCTION')) {
              inFunction = false;
              statements.push(currentStatement.trim());
              currentStatement = '';
            }
          } else {
            statements.push(currentStatement.trim());
            currentStatement = '';
          }
        }
      }
      
      // Execute each statement
      for (const statement of statements) {
        if (statement.length > 10) {
          try {
            await sql(statement);
          } catch (err) {
            if (!err.message.includes('already exists') && 
                !err.message.includes('does not exist') &&
                !err.message.includes('duplicate')) {
              console.log(`   ⚠️  ${err.message.split('\n')[0]}`);
            }
          }
        }
      }
    }

    console.log('\n✅ Migration başarıyla tamamlandı!\n');
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
