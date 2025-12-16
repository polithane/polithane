import { sql } from '../index.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runMigration() {
  try {
    console.log('🚀 Running User Metadata Migration...');
    
    const migrationPath = path.join(__dirname, '../migrations/006_add_user_metadata.sql');
    const sqlContent = fs.readFileSync(migrationPath, 'utf8');
    
    // Split commands by semicolon just in case, but usually simple exec works for PG
    // But here we use postgres.js simple query
    await sql.unsafe(sqlContent);
    
    console.log('✅ Metadata migration completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

runMigration();
