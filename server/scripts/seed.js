import dotenv from 'dotenv';
import { sql } from '../db.js';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Import mock data from frontend
const mockDataPath = join(__dirname, '../../src/mock');

async function loadMockData() {
  console.log('📦 Mock data yükleniyor...\n');

  try {
    // Dynamically import ES modules
    const { mockParties } = await import('../../src/mock/parties.js');
    const { mockUsers } = await import('../../src/mock/users.js');
    const { mockAgendas } = await import('../../src/mock/agendas.js');
    const { generateMockPosts } = await import('../../src/mock/posts.js');

    console.log('✅ Mock veriler okundu');
    console.log(`   - ${mockParties.length} parti`);
    console.log(`   - ${mockUsers.length} kullanıcı`);
    console.log(`   - ${mockAgendas.length} gündem\n`);

    return { mockParties, mockUsers, mockAgendas, generateMockPosts };
  } catch (error) {
    console.error('❌ Mock data yükleme hatası:', error.message);
    throw error;
  }
}

async function seedParties(mockParties) {
  console.log('🏛️  Partiler ekleniyor...');

  for (const party of mockParties) {
    try {
      await sql`
        INSERT INTO parties (
          name, short_name, slug, logo_url, flag_url,
          parliament_seats, mp_count, color, is_active
        ) VALUES (
          ${party.party_name},
          ${party.party_short_name},
          ${party.party_short_name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')},
          ${party.party_logo},
          ${party.party_flag || party.party_logo},
          ${party.parliament_seats},
          ${party.mp_count},
          ${party.party_color},
          ${party.is_active}
        )
        ON CONFLICT (slug) DO UPDATE SET
          name = EXCLUDED.name,
          short_name = EXCLUDED.short_name,
          parliament_seats = EXCLUDED.parliament_seats,
          mp_count = EXCLUDED.mp_count
      `;
    } catch (error) {
      if (!error.message.includes('duplicate')) {
        console.log(`   ⚠️  ${party.party_short_name}: ${error.message}`);
      }
    }
  }

  console.log(`✅ ${mockParties.length} parti eklendi\n`);
}

async function seedUsers(mockUsers) {
  console.log('👥 Kullanıcılar ekleniyor...');

  // First, get party mapping (slug to id)
  const parties = await sql`SELECT id, slug FROM parties`;
  const partyMap = {};
  parties.forEach(p => {
    partyMap[p.slug] = p.id;
  });

  let count = 0;
  for (const user of mockUsers.slice(0, 50)) { // Limit to 50 for demo
    try {
      // Map party_id to UUID
      let partyUuid = null;
      if (user.party_id) {
        const partySlug = ['ak-parti', 'chp', 'dem-parti', 'mhp', 'iyi-parti', 'yeni-yol', 'yrp', 'hurdava', 'tip', 'dbp', 'emep', 'saadet', 'dsp', 'dp', 'bagimsiz'][user.party_id - 1];
        partyUuid = partyMap[partySlug];
      }

      await sql`
        INSERT INTO users (
          username, email, full_name, bio, avatar_url,
          user_type, politician_type, party_id, city_code,
          is_verified, polit_score, follower_count, following_count, post_count
        ) VALUES (
          ${user.username},
          ${user.email},
          ${user.full_name},
          ${user.bio || ''},
          ${user.profile_image},
          ${user.user_type},
          ${user.politician_type || null},
          ${partyUuid},
          ${user.city_code || null},
          ${user.verification_badge || false},
          ${user.polit_score || 0},
          ${user.follower_count || 0},
          ${user.following_count || 0},
          ${user.post_count || 0}
        )
        ON CONFLICT (username) DO UPDATE SET
          full_name = EXCLUDED.full_name,
          bio = EXCLUDED.bio,
          is_verified = EXCLUDED.is_verified
      `;
      count++;
      
      if (count % 10 === 0) {
        console.log(`   ⏳ ${count} kullanıcı eklendi...`);
      }
    } catch (error) {
      // Skip duplicate errors
      if (!error.message.includes('duplicate') && !error.message.includes('unique')) {
        console.log(`   ⚠️  ${user.username}: ${error.message.split('\n')[0]}`);
      }
    }
  }

  console.log(`✅ ${count} kullanıcı eklendi\n`);
}

async function seedAgendas(mockAgendas) {
  console.log('📌 Gündemler ekleniyor...');

  for (const agenda of mockAgendas) {
    try {
      const slug = agenda.agenda_title
        .toLowerCase()
        .replace(/ç/g, 'c').replace(/ğ/g, 'g').replace(/ı/g, 'i')
        .replace(/ö/g, 'o').replace(/ş/g, 's').replace(/ü/g, 'u')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');

      await sql`
        INSERT INTO agendas (
          id, title, slug, post_count, total_polit_score, is_trending
        ) VALUES (
          ${agenda.agenda_id},
          ${agenda.agenda_title},
          ${slug},
          ${agenda.post_count || 0},
          ${agenda.total_polit_score || 0},
          ${agenda.is_trending || false}
        )
        ON CONFLICT (id) DO UPDATE SET
          title = EXCLUDED.title,
          post_count = EXCLUDED.post_count
      `;
    } catch (error) {
      console.log(`   ⚠️  ${agenda.agenda_title}: ${error.message}`);
    }
  }

  console.log(`✅ ${mockAgendas.length} gündem eklendi\n`);
}

async function seedPosts(mockUsers, mockParties, generateMockPosts) {
  console.log('📝 Postlar oluşturuluyor...');

  // Generate posts
  const posts = generateMockPosts(100, mockUsers, mockParties);
  
  let count = 0;
  for (const post of posts) {
    try {
      // Get category from user type
      let category = 'general';
      if (post.user?.politician_type === 'mp') category = 'mps';
      else if (post.user?.user_type === 'politician') category = 'organization';
      else if (post.user?.user_type === 'ex_politician') category = 'experience';
      else if (post.user?.user_type === 'media') category = 'media';
      else if (post.user?.user_type === 'normal') category = 'citizens';

      await sql`
        INSERT INTO posts (
          id, user_id, party_id, content_type, content_text,
          media_urls, thumbnail_url, media_duration,
          category, agenda_tag, polit_score, 
          view_count, like_count, comment_count, share_count,
          is_featured, is_trending,
          created_at
        ) VALUES (
          ${post.post_id},
          ${post.user_id},
          ${post.user?.party_id || null},
          ${post.content_type},
          ${post.content_text},
          ${JSON.stringify(post.media_url || [])},
          ${post.thumbnail_url || null},
          ${post.media_duration || null},
          ${category},
          ${post.agenda_tag || null},
          ${post.polit_score || 0},
          ${post.view_count || 0},
          ${post.like_count || 0},
          ${post.comment_count || 0},
          ${post.share_count || 0},
          ${post.is_featured || false},
          false,
          ${post.created_at}
        )
        ON CONFLICT (id) DO UPDATE SET
          content_text = EXCLUDED.content_text,
          polit_score = EXCLUDED.polit_score
      `;
      count++;
      
      if (count % 20 === 0) {
        console.log(`   ⏳ ${count} post eklendi...`);
      }
    } catch (error) {
      if (!error.message.includes('duplicate')) {
        console.log(`   ⚠️  Post ${post.post_id}: ${error.message}`);
      }
    }
  }

  console.log(`✅ ${count} post eklendi\n`);
}

async function seed() {
  console.log('🌱 Database seeding başlatılıyor...\n');

  try {
    // Load mock data
    const { mockParties, mockUsers, mockAgendas, generateMockPosts } = await loadMockData();

    // Seed in order (due to foreign key constraints)
    await seedParties(mockParties);
    await seedUsers(mockUsers);
    await seedAgendas(mockAgendas);
    await seedPosts(mockUsers, mockParties, generateMockPosts);

    console.log('🎉 Seeding başarıyla tamamlandı!\n');
    console.log('📊 Özet:');
    console.log(`   - ${mockParties.length} parti`);
    console.log(`   - ${mockUsers.length} kullanıcı`);
    console.log(`   - ${mockAgendas.length} gündem`);
    console.log(`   - 100 post\n`);

    // Show database stats
    const stats = await sql`
      SELECT 
        (SELECT COUNT(*) FROM users) as user_count,
        (SELECT COUNT(*) FROM parties) as party_count,
        (SELECT COUNT(*) FROM posts) as post_count,
        (SELECT COUNT(*) FROM agendas) as agenda_count
    `;

    console.log('✅ Veritabanı durumu:');
    console.log(`   - Toplam kullanıcı: ${stats[0].user_count}`);
    console.log(`   - Toplam parti: ${stats[0].party_count}`);
    console.log(`   - Toplam post: ${stats[0].post_count}`);
    console.log(`   - Toplam gündem: ${stats[0].agenda_count}\n`);

  } catch (error) {
    console.error('❌ Seeding hatası:', error.message);
    console.error(error.stack);
    process.exit(1);
  }

  process.exit(0);
}

seed();
