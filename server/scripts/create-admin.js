import { neon } from '@neondatabase/serverless';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });

const sql = neon(process.env.DATABASE_URL);

async function createAdmin() {
  console.log('👑 Admin kullanıcısı oluşturuluyor...\n');
  
  const adminData = {
    username: 'admin',
    email: 'admin@polithane.com',
    password: 'Admin123!',
    full_name: 'Polithane Admin',
    bio: 'Polithane Platform Yöneticisi',
    user_type: 'normal',
    is_verified: true,
    is_admin: true,
    is_automated: false,
    polit_score: 999999,
    post_count: 0
  };
  
  try {
    // Hash password
    const hashedPassword = await bcrypt.hash(adminData.password, 10);
    
    // Check if admin exists
    const existing = await sql`
      SELECT id FROM users WHERE username = ${adminData.username}
    `;
    
    if (existing.length > 0) {
      console.log('⚠️  Admin kullanıcısı zaten mevcut!');
      console.log('\n📝 Admin Bilgileri:');
      console.log('   Kullanıcı Adı: admin');
      console.log('   Email: admin@polithane.com');
      console.log('   Şifre: Admin123!');
      return;
    }
    
    // Create admin user
    await sql`
      INSERT INTO users (
        username, email, password_hash, full_name, bio,
        user_type, is_verified, is_admin, is_automated,
        polit_score, post_count, avatar_url, created_at
      ) VALUES (
        ${adminData.username},
        ${adminData.email},
        ${hashedPassword},
        ${adminData.full_name},
        ${adminData.bio},
        ${adminData.user_type},
        ${adminData.is_verified},
        ${adminData.is_admin},
        ${adminData.is_automated},
        ${adminData.polit_score},
        ${adminData.post_count},
        'https://ui-avatars.com/api/?name=Admin&background=0D4D94&color=fff&size=200',
        NOW()
      )
    `;
    
    console.log('✅ Admin kullanıcısı başarıyla oluşturuldu!');
    console.log('\n📝 Admin Bilgileri:');
    console.log('   Kullanıcı Adı: admin');
    console.log('   Email: admin@polithane.com');
    console.log('   Şifre: Admin123!');
    console.log('\n🔗 Admin Panel: http://localhost:5173/admin');
    console.log('🔗 Giriş: http://localhost:5173/login');
    
  } catch (error) {
    console.error('❌ Admin oluşturma hatası:', error.message);
  }
}

createAdmin();
