/**
 * =================================================
 * GÜVENLIK SERVİSİ
 * =================================================
 * IP blocking, brute force koruması, bot detection
 */

import { sql } from '../index.js';

/**
 * IP adresini blacklist'e ekle
 */
export const blacklistIP = async (ipAddress, reason, duration = 15) => {
  try {
    const blockedUntil = new Date(Date.now() + duration * 60 * 1000);
    
    await sql`
      INSERT INTO blacklisted_ips (ip_address, reason, blocked_until, permanent)
      VALUES (${ipAddress}, ${reason}, ${blockedUntil}, FALSE)
      ON CONFLICT (ip_address) 
      DO UPDATE SET 
        reason = ${reason},
        blocked_until = ${blockedUntil},
        blocked_at = CURRENT_TIMESTAMP
    `;
    
    console.log(`🚫 IP blocked: ${ipAddress} - Reason: ${reason} - Duration: ${duration}m`);
    return true;
  } catch (error) {
    console.error('IP blacklist hatası:', error);
    return false;
  }
};

/**
 * IP'nin blacklist'te olup olmadığını kontrol et
 */
export const isIPBlacklisted = async (ipAddress) => {
  try {
    const [result] = await sql`
      SELECT * FROM blacklisted_ips
      WHERE ip_address = ${ipAddress}
      AND (
        permanent = TRUE 
        OR blocked_until > CURRENT_TIMESTAMP
      )
    `;
    
    return !!result;
  } catch (error) {
    console.error('IP blacklist check hatası:', error);
    return false;
  }
};

/**
 * Başarısız login denemesi kaydet
 */
export const recordFailedLogin = async (email, ipAddress, userAgent) => {
  try {
    await sql`
      INSERT INTO failed_login_attempts (email, ip_address, user_agent)
      VALUES (${email}, ${ipAddress}, ${userAgent})
    `;
    
    // Son 15 dakikada kaç başarısız deneme var?
    const attempts = await sql`
      SELECT COUNT(*) as count
      FROM failed_login_attempts
      WHERE email = ${email}
      AND ip_address = ${ipAddress}
      AND attempt_time > NOW() - INTERVAL '15 minutes'
    `;
    
    const attemptCount = parseInt(attempts[0].count);
    
    // 5 başarısız deneme = 15 dakika ban
    if (attemptCount >= 5) {
      await blacklistIP(ipAddress, `Brute force: ${attemptCount} failed login attempts for ${email}`, 15);
      
      // Şüpheli aktivite kaydet
      await sql`
        INSERT INTO suspicious_activities (ip_address, email, activity_type, details)
        VALUES (${ipAddress}, ${email}, 'brute_force_login', ${`${attemptCount} failed attempts in 15 minutes`})
      `;
      
      return { blocked: true, attempts: attemptCount };
    }
    
    return { blocked: false, attempts: attemptCount };
  } catch (error) {
    console.error('Failed login kayıt hatası:', error);
    return { blocked: false, attempts: 0 };
  }
};

/**
 * Başarılı login sonrası başarısız denemeleri temizle
 */
export const clearFailedLoginAttempts = async (email, ipAddress) => {
  try {
    await sql`
      DELETE FROM failed_login_attempts
      WHERE email = ${email}
      AND ip_address = ${ipAddress}
      AND attempt_time > NOW() - INTERVAL '15 minutes'
    `;
  } catch (error) {
    console.error('Failed login temizleme hatası:', error);
  }
};

/**
 * Bot detection - User agent kontrolü
 */
export const isSuspiciousUserAgent = (userAgent) => {
  if (!userAgent || userAgent === '') return true;
  
  const suspiciousPatterns = [
    /bot/i,
    /crawler/i,
    /spider/i,
    /scraper/i,
    /curl/i,
    /wget/i,
    /python/i,
    /java/i,
  ];
  
  return suspiciousPatterns.some(pattern => pattern.test(userAgent));
};

/**
 * Şüpheli aktivite kaydet
 */
export const recordSuspiciousActivity = async (ipAddress, email, activityType, details) => {
  try {
    await sql`
      INSERT INTO suspicious_activities (ip_address, email, activity_type, details)
      VALUES (${ipAddress}, ${email}, ${activityType}, ${details})
    `;
  } catch (error) {
    console.error('Suspicious activity kayıt hatası:', error);
  }
};

/**
 * IP'den gerçek IP adresini çıkar (proxy/load balancer durumunda)
 */
export const getRealIP = (req) => {
  return req.headers['x-forwarded-for']?.split(',')[0].trim() ||
         req.headers['x-real-ip'] ||
         req.connection?.remoteAddress ||
         req.socket?.remoteAddress ||
         req.ip ||
         'unknown';
};
