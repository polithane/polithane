-- ============================================
-- GÜVENLIK TABLOLARI
-- ============================================

-- 1. Başarısız login denemeleri
CREATE TABLE IF NOT EXISTS failed_login_attempts (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) NOT NULL,
  ip_address VARCHAR(45) NOT NULL,
  attempt_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  user_agent TEXT
);

CREATE INDEX IF NOT EXISTS idx_failed_login_email ON failed_login_attempts(email);
CREATE INDEX IF NOT EXISTS idx_failed_login_ip ON failed_login_attempts(ip_address);
CREATE INDEX IF NOT EXISTS idx_failed_login_time ON failed_login_attempts(attempt_time);

-- 2. IP Blacklist
CREATE TABLE IF NOT EXISTS blacklisted_ips (
  id SERIAL PRIMARY KEY,
  ip_address VARCHAR(45) UNIQUE NOT NULL,
  reason TEXT,
  blocked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  blocked_until TIMESTAMP,
  permanent BOOLEAN DEFAULT FALSE
);

CREATE INDEX IF NOT EXISTS idx_blacklisted_ips ON blacklisted_ips(ip_address);

-- 3. Şüpheli aktiviteler
CREATE TABLE IF NOT EXISTS suspicious_activities (
  id SERIAL PRIMARY KEY,
  ip_address VARCHAR(45) NOT NULL,
  email VARCHAR(255),
  activity_type VARCHAR(50) NOT NULL, -- 'multiple_failed_login', 'rapid_requests', etc.
  details TEXT,
  detected_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_suspicious_ip ON suspicious_activities(ip_address);
CREATE INDEX IF NOT EXISTS idx_suspicious_email ON suspicious_activities(email);
CREATE INDEX IF NOT EXISTS idx_suspicious_time ON suspicious_activities(detected_at);

-- 4. Eski kayıtları temizlemek için function
CREATE OR REPLACE FUNCTION cleanup_old_security_logs()
RETURNS void AS $$
BEGIN
  -- 30 günden eski failed login kayıtlarını sil
  DELETE FROM failed_login_attempts WHERE attempt_time < NOW() - INTERVAL '30 days';
  
  -- 90 günden eski suspicious activities kayıtlarını sil
  DELETE FROM suspicious_activities WHERE detected_at < NOW() - INTERVAL '90 days';
  
  -- Süresi dolmuş IP blacklist kayıtlarını sil (permanent olmayanlar)
  DELETE FROM blacklisted_ips 
  WHERE permanent = FALSE 
  AND blocked_until IS NOT NULL 
  AND blocked_until < NOW();
END;
$$ LANGUAGE plpgsql;

-- Cleanup'ı haftada bir çalıştırmak için (manuel trigger gerekir)
COMMENT ON FUNCTION cleanup_old_security_logs() IS 
'Eski güvenlik loglarını temizler. Haftalık çalıştırılmalı.';
