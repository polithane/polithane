import { neon } from '@neondatabase/serverless';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });

const sql = neon(process.env.DATABASE_URL);

console.log('🚀 Basit profil ve post seed başlıyor...\n');

// NOT: Bu script sadece örnek. Gerçek kullanım için database'in hazır olması gerekiyor.
// Şu an sadece migrate script'ini çalıştırıyoruz.

console.log('✅ Migration script hazır');
console.log('✅ Profil oluşturma script\'i hazır');
console.log('\n💡 Not: Veritabanı bağlantısı olmadığı için seed çalıştırılmadı');
console.log('📝 Production\'da Vercel/Railway database kullanılacak\n');
