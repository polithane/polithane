/**
 * =================================================
 * GÜVENLİK MIDDLEWARE
 * =================================================
 * IP blocking, bot detection, rate limiting kontrolleri
 */

import { isIPBlacklisted, getRealIP, isSuspiciousUserAgent } from '../utils/securityService.js';

/**
 * IP Blacklist Kontrolü
 */
export const checkIPBlacklist = async (req, res, next) => {
  try {
    const ipAddress = getRealIP(req);
    const isBlocked = await isIPBlacklisted(ipAddress);
    
    if (isBlocked) {
      console.log(`🚫 Blocked IP attempted access: ${ipAddress}`);
      return res.status(403).json({
        success: false,
        error: 'Erişiminiz engellenmiştir. Lütfen destek ile iletişime geçin.'
      });
    }
    
    next();
  } catch (error) {
    console.error('IP blacklist check middleware error:', error);
    next(); // Hata durumunda devam et (fail-open)
  }
};

/**
 * Bot Detection Middleware
 */
export const checkBotActivity = (req, res, next) => {
  const userAgent = req.headers['user-agent'] || '';
  
  // User agent kontrolü (çok sıkı yapma, bazı meşru clientlar user agent göndermeyebilir)
  if (isSuspiciousUserAgent(userAgent)) {
    console.log(`⚠️ Suspicious user agent: ${userAgent} from ${getRealIP(req)}`);
    // Not blocking, just logging for now
  }
  
  next();
};

/**
 * Request Body Size Kontrolü (Ek güvenlik)
 */
export const validateRequestSize = (req, res, next) => {
  const contentLength = req.headers['content-length'];
  
  if (contentLength && parseInt(contentLength) > 10 * 1024 * 1024) { // 10MB
    return res.status(413).json({
      success: false,
      error: 'İstek boyutu çok büyük.'
    });
  }
  
  next();
};
