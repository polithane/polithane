/**
 * Setup Supabase Database Schema
 */

import pg from 'pg';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });

const { Pool } = pg;

async function setupSchema() {
  console.log('🏗️  Supabase Schema Kurulumu Başlıyor...\n');
  
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });
  
  try {
    // Read schema from migrations
    const schemaPath = path.join(__dirname, '../migrations/001_supabase_schema.sql');
    
    if (!fs.existsSync(schemaPath)) {
      throw new Error('Schema file not found!');
    }
    
    const schema = fs.readFileSync(schemaPath, 'utf8');
    
    console.log('📋 Schema okundu, çalıştırılıyor...');
    
    // Execute schema
    await pool.query(schema);
    
    console.log('✅ Schema başarıyla kuruldu!');
    
    // Verify tables
    const tables = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name
    `);
    
    console.log('\n📊 Oluşturulan tablolar:');
    tables.rows.forEach((row, idx) => {
      console.log(`   ${idx + 1}. ${row.table_name}`);
    });
    
  } catch (error) {
    console.error('❌ Hata:', error.message);
    throw error;
  } finally {
    await pool.end();
  }
}

setupSchema().catch(console.error);
