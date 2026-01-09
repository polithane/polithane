/**
 * Sets up RBAC tables + admin security settings + initial admin user.
 *
 * - Creates tables (if missing):
 *   - site_settings
 *   - admin_roles, admin_permissions, admin_role_permissions, admin_user_roles
 *   - admin_trusted_devices
 * - Seeds a professional permission model (roles + permissions)
 * - Creates initial admin user:
 *     username: yusuf
 *     password: (from env INITIAL_ADMIN_PASSWORD)
 *
 * Run:
 *   INITIAL_ADMIN_PASSWORD="..." node server/scripts/setup-admin-rbac-and-initial-admin.js
 */
import pg from 'pg';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env') });

const { Pool } = pg;

const ROLES = [
  { key: 'admin', name: 'Admin', description: 'Tam yetkili yönetici (her şey)', is_system: true },
  { key: 'supervisor', name: 'Yönetici', description: 'Genel yönetim (kritik ayarlar hariç)', is_system: true },
  { key: 'user_manager', name: 'Kullanıcı Yöneticisi', description: 'Kullanıcı yönetimi ve doğrulama', is_system: true },
  { key: 'content_moderator', name: 'İçerik Moderatörü', description: 'Post ve yorum moderasyonu', is_system: true },
  { key: 'analytics_viewer', name: 'Analitik', description: 'Raporları görüntüleme', is_system: true },
  { key: 'settings_manager', name: 'Ayar Yöneticisi', description: 'Site/SEO/tema ayarları', is_system: true },
  { key: 'security_manager', name: 'Güvenlik Yöneticisi', description: 'Güvenlik ayarları ve audit', is_system: true },
  { key: 'automation_manager', name: 'Otomasyon Yöneticisi', description: 'Otomasyon/scraping kaynakları', is_system: true },
  { key: 'ads_manager', name: 'Reklam Yöneticisi', description: 'Reklam alanları ve kampanyalar', is_system: true },
  { key: 'finance_manager', name: 'Finans', description: 'Ödeme/gelir raporları', is_system: true },
  { key: 'support_agent', name: 'Destek', description: 'Destek/şikayet süreçleri', is_system: true },
];

const PERMISSIONS = [
  // Users
  { key: 'users.read', name: 'Users: Read', description: 'Kullanıcıları görüntüleme' },
  { key: 'users.write', name: 'Users: Write', description: 'Kullanıcıları güncelleme' },
  { key: 'users.delete', name: 'Users: Delete', description: 'Kullanıcı silme' },
  { key: 'users.verify', name: 'Users: Verify', description: 'Doğrulama/rol işlemleri' },

  // Posts & comments
  { key: 'posts.read', name: 'Posts: Read', description: 'Postları görüntüleme' },
  { key: 'posts.moderate', name: 'Posts: Moderate', description: 'Post silme/işaretleme/moderasyon' },
  { key: 'comments.moderate', name: 'Comments: Moderate', description: 'Yorum moderasyonu' },

  // Settings
  { key: 'settings.read', name: 'Settings: Read', description: 'Ayarları görüntüleme' },
  { key: 'settings.write', name: 'Settings: Write', description: 'Ayarları değiştirme' },

  // Security
  { key: 'security.read', name: 'Security: Read', description: 'Güvenlik verileri/logları' },
  { key: 'security.write', name: 'Security: Write', description: 'Güvenlik ayarlarını değiştirme' },

  // Analytics
  { key: 'analytics.read', name: 'Analytics: Read', description: 'Analitikleri görüntüleme' },

  // Automation / scraping
  { key: 'automation.read', name: 'Automation: Read', description: 'Otomasyon durumu' },
  { key: 'automation.write', name: 'Automation: Write', description: 'Otomasyon ayarları' },

  // Ads / finance
  { key: 'ads.read', name: 'Ads: Read', description: 'Reklam verileri' },
  { key: 'ads.write', name: 'Ads: Write', description: 'Reklam yönetimi' },
  { key: 'finance.read', name: 'Finance: Read', description: 'Ödeme/gelir raporları' },
  { key: 'finance.write', name: 'Finance: Write', description: 'Ödeme/gelir ayarları' },
];

const ROLE_PERMS = {
  admin: ['*'],
  supervisor: [
    'users.read',
    'users.write',
    'posts.read',
    'posts.moderate',
    'comments.moderate',
    'settings.read',
    'settings.write',
    'security.read',
    'analytics.read',
    'automation.read',
    'automation.write',
    'ads.read',
    'ads.write',
    'finance.read',
  ],
  user_manager: ['users.read', 'users.write', 'users.verify'],
  content_moderator: ['posts.read', 'posts.moderate', 'comments.moderate'],
  analytics_viewer: ['analytics.read'],
  settings_manager: ['settings.read', 'settings.write'],
  security_manager: ['security.read', 'security.write'],
  automation_manager: ['automation.read', 'automation.write'],
  ads_manager: ['ads.read', 'ads.write'],
  finance_manager: ['finance.read', 'finance.write'],
  support_agent: ['users.read', 'posts.read', 'comments.moderate'],
};

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const client = await pool.connect();
  try {
    await client.query('begin');

    // Ensure admin columns exist on users (project DB uses uuid users table)
    await client.query(`alter table public.users add column if not exists is_admin boolean default false`);
    await client.query(`alter table public.users add column if not exists admin_phone text`);

    // settings table
    await client.query(`
      create table if not exists public.site_settings (
        key text primary key,
        value text,
        updated_at timestamptz default now()
      )
    `);

    // RBAC tables
    await client.query(`
      create table if not exists public.admin_roles (
        key text primary key,
        name text not null,
        description text,
        is_system boolean default false,
        created_at timestamptz default now()
      )
    `);
    await client.query(`
      create table if not exists public.admin_permissions (
        key text primary key,
        name text not null,
        description text,
        created_at timestamptz default now()
      )
    `);
    await client.query(`
      create table if not exists public.admin_role_permissions (
        role_key text not null references public.admin_roles(key) on delete cascade,
        permission_key text not null references public.admin_permissions(key) on delete cascade,
        created_at timestamptz default now(),
        primary key (role_key, permission_key)
      )
    `);
    await client.query(`
      create table if not exists public.admin_user_roles (
        user_id uuid not null references public.users(id) on delete cascade,
        role_key text not null references public.admin_roles(key) on delete cascade,
        created_at timestamptz default now(),
        primary key (user_id, role_key)
      )
    `);

    await client.query(`
      create table if not exists public.admin_trusted_devices (
        user_id uuid not null references public.users(id) on delete cascade,
        device_id text not null,
        user_agent text,
        ip_address text,
        last_seen_at timestamptz default now(),
        created_at timestamptz default now(),
        primary key (user_id, device_id)
      )
    `);

    // seed roles
    for (const r of ROLES) {
      // eslint-disable-next-line no-await-in-loop
      await client.query(
        `insert into public.admin_roles(key,name,description,is_system)
         values ($1,$2,$3,$4)
         on conflict (key) do update set
           name=excluded.name,
           description=excluded.description,
           is_system=excluded.is_system`,
        [r.key, r.name, r.description, r.is_system]
      );
    }

    // seed permissions
    for (const p of PERMISSIONS) {
      // eslint-disable-next-line no-await-in-loop
      await client.query(
        `insert into public.admin_permissions(key,name,description)
         values ($1,$2,$3)
         on conflict (key) do update set
           name=excluded.name,
           description=excluded.description`,
        [p.key, p.name, p.description]
      );
    }

    // seed role-perms (skip '*' entry; admin is treated as full in code)
    for (const [roleKey, perms] of Object.entries(ROLE_PERMS)) {
      for (const perm of perms) {
        if (perm === '*') continue;
        // eslint-disable-next-line no-await-in-loop
        await client.query(
          `insert into public.admin_role_permissions(role_key, permission_key)
           values ($1,$2)
           on conflict do nothing`,
          [roleKey, perm]
        );
      }
    }

    // default security settings (OFF)
    await client.query(
      `insert into public.site_settings(key,value)
       values ('admin_mfa_enabled','false')
       on conflict (key) do nothing`
    );
    await client.query(
      `insert into public.site_settings(key,value)
       values ('admin_mfa_require_new_device','false')
       on conflict (key) do nothing`
    );

    // create initial admin user (yusuf)
    const username = 'yusuf';
    const email = 'yusuf@polithane.local';
    const password = String(process.env.INITIAL_ADMIN_PASSWORD || '').trim();
    if (!password || password.length < 10) {
      throw new Error('INITIAL_ADMIN_PASSWORD is required and should be at least 10 characters.');
    }
    const fullName = 'Yusuf (Admin)';

    const existing = await client.query(`select id from public.users where username=$1 limit 1`, [username]);
    let userId = existing.rows?.[0]?.id || null;

    if (!userId) {
      const passwordHash = await bcrypt.hash(password, 10);
      const inserted = await client.query(
        `insert into public.users
          (username, email, password_hash, full_name, bio, user_type, is_verified, is_active, is_admin, is_automated, follower_count, following_count, post_count, polit_score)
         values
          ($1,$2,$3,$4,$5,'citizen',true,true,true,false,0,0,0,0)
         returning id`,
        [username, email, passwordHash, fullName, 'Polithane platform yöneticisi.']
      );
      userId = inserted.rows[0].id;
    } else {
      await client.query(`update public.users set is_admin=true where id=$1`, [userId]);
    }

    // assign admin role
    await client.query(
      `insert into public.admin_user_roles(user_id, role_key)
       values ($1,'admin')
       on conflict do nothing`,
      [userId]
    );

    await client.query('commit');
    console.log('✅ RBAC + security settings ready');
    console.log('✅ Initial admin ensured:', { username: 'yusuf' });
  } catch (e) {
    await client.query('rollback');
    throw e;
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((e) => {
  console.error('❌ Failed:', e);
  process.exit(1);
});

