import { sql } from '../index.js';

/**
 * Kullanıcının post_count kolonunu gerçek post sayısı ile senkronize eder
 * @param {string} userId - Kullanıcı ID'si
 * @returns {Promise<number>} - Gerçek post sayısı
 */
export async function syncUserPostCount(userId) {
  try {
    // Gerçek post sayısını hesapla
    const [result] = await sql`
      SELECT COUNT(*) as count 
      FROM posts 
      WHERE user_id = ${userId}
    `;
    
    const actualCount = parseInt(result?.count || 0, 10);
    
    // post_count'u güncelle
    await sql`
      UPDATE users 
      SET post_count = ${actualCount}
      WHERE id = ${userId}
    `;
    
    console.log(`✅ User ${userId} post_count synced: ${actualCount}`);
    return actualCount;
  } catch (error) {
    console.error('❌ Sync post count error:', error);
    throw error;
  }
}

/**
 * Tüm kullanıcıların post_count'larını senkronize eder
 * @returns {Promise<number>} - Senkronize edilen kullanıcı sayısı
 */
export async function syncAllUserPostCounts() {
  try {
    // Her kullanıcı için gerçek post sayısını hesapla ve güncelle
    const result = await sql`
      UPDATE users u
      SET post_count = (
        SELECT COUNT(*) 
        FROM posts p 
        WHERE p.user_id = u.id
      )
      RETURNING id, post_count
    `;
    
    console.log(`✅ Synced ${result.length} users' post counts`);
    return result.length;
  } catch (error) {
    console.error('❌ Sync all post counts error:', error);
    throw error;
  }
}
