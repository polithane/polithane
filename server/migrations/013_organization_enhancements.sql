-- ============================================
-- TEŞKİLAT MODÜLÜ GENİŞLETMELERİ
-- Migration: 013
-- ============================================

-- 1. Parties tablosuna yeni kolonlar ekle
ALTER TABLE parties ADD COLUMN IF NOT EXISTS contact_phone VARCHAR(50);
ALTER TABLE parties ADD COLUMN IF NOT EXISTS contact_email VARCHAR(200);
ALTER TABLE parties ADD COLUMN IF NOT EXISTS contact_address TEXT;
ALTER TABLE parties ADD COLUMN IF NOT EXISTS contact_website VARCHAR(300);
ALTER TABLE parties ADD COLUMN IF NOT EXISTS social_twitter VARCHAR(200);
ALTER TABLE parties ADD COLUMN IF NOT EXISTS social_facebook VARCHAR(200);
ALTER TABLE parties ADD COLUMN IF NOT EXISTS social_instagram VARCHAR(200);
ALTER TABLE parties ADD COLUMN IF NOT EXISTS social_youtube VARCHAR(200);
ALTER TABLE parties ADD COLUMN IF NOT EXISTS leader_name VARCHAR(200);
ALTER TABLE parties ADD COLUMN IF NOT EXISTS leader_title VARCHAR(200);
ALTER TABLE parties ADD COLUMN IF NOT EXISTS leader_bio TEXT;
ALTER TABLE parties ADD COLUMN IF NOT EXISTS leader_image_url TEXT;
ALTER TABLE parties ADD COLUMN IF NOT EXISTS theme_color VARCHAR(20);
ALTER TABLE parties ADD COLUMN IF NOT EXISTS theme_secondary_color VARCHAR(20);

-- 2. Events tablosuna yeni kolonlar
ALTER TABLE org_events ADD COLUMN IF NOT EXISTS image_url TEXT;
ALTER TABLE org_events ADD COLUMN IF NOT EXISTS start_time TIMESTAMP;
ALTER TABLE org_events ADD COLUMN IF NOT EXISTS end_time TIMESTAMP;
ALTER TABLE org_events ADD COLUMN IF NOT EXISTS managers JSONB DEFAULT '[]';
ALTER TABLE org_events ADD COLUMN IF NOT EXISTS assistants JSONB DEFAULT '[]';
ALTER TABLE org_events ADD COLUMN IF NOT EXISTS participants JSONB DEFAULT '[]';

-- 3. Event Invitations tablosu (Etkinlik davetleri)
CREATE TABLE IF NOT EXISTS org_event_invitations (
  id SERIAL PRIMARY KEY,
  event_id INTEGER NOT NULL REFERENCES org_events(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role VARCHAR(20) NOT NULL, -- manager, assistant, participant
  task_note TEXT,
  status VARCHAR(20) DEFAULT 'pending', -- pending, accepted, excused
  excuse_text TEXT,
  invited_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  responded_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(event_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_event_invitations_event ON org_event_invitations(event_id);
CREATE INDEX IF NOT EXISTS idx_event_invitations_user ON org_event_invitations(user_id);
CREATE INDEX IF NOT EXISTS idx_event_invitations_status ON org_event_invitations(status);

-- 4. Tasks tablosuna atama tipi ekle
ALTER TABLE org_tasks ADD COLUMN IF NOT EXISTS assignment_type VARCHAR(20) DEFAULT 'event'; -- event, direct

-- 5. Users tablosuna approval_status metadata kontrolü
-- (Zaten metadata JSONB olarak var, migration gerekmez)

COMMENT ON TABLE org_event_invitations IS 'Etkinlik davetleri ve yanıtları';
COMMENT ON COLUMN org_event_invitations.role IS 'Davet edilen kişinin rolü: manager, assistant, participant';
COMMENT ON COLUMN org_event_invitations.status IS 'Davet durumu: pending, accepted, excused';
