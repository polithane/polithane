-- ============================================
-- PARTİ TEŞKİLAT YÖNETİM MODÜLÜ
-- Migration: 012
-- ============================================

-- 1. ORG_MESSAGES - Teşkilat mesajları
CREATE TABLE IF NOT EXISTS org_messages (
  id SERIAL PRIMARY KEY,
  thread_id VARCHAR(100) NOT NULL,
  sender_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  receiver_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  party_id INTEGER NOT NULL,
  type VARCHAR(30) NOT NULL DEFAULT 'direct', -- direct, group, system
  subject VARCHAR(200),
  message TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  is_read BOOLEAN DEFAULT FALSE,
  read_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_org_messages_thread ON org_messages(thread_id);
CREATE INDEX IF NOT EXISTS idx_org_messages_sender ON org_messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_org_messages_receiver ON org_messages(receiver_id);
CREATE INDEX IF NOT EXISTS idx_org_messages_party ON org_messages(party_id);
CREATE INDEX IF NOT EXISTS idx_org_messages_created ON org_messages(created_at DESC);

-- 2. ORG_MESSAGE_RECIPIENTS - Grup mesajları için alıcılar
CREATE TABLE IF NOT EXISTS org_message_recipients (
  id SERIAL PRIMARY KEY,
  message_id INTEGER NOT NULL REFERENCES org_messages(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  is_read BOOLEAN DEFAULT FALSE,
  read_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_org_msg_recipients_message ON org_message_recipients(message_id);
CREATE INDEX IF NOT EXISTS idx_org_msg_recipients_user ON org_message_recipients(user_id);

-- 3. ORG_EVENTS - Teşkilat etkinlikleri
CREATE TABLE IF NOT EXISTS org_events (
  id SERIAL PRIMARY KEY,
  party_id INTEGER NOT NULL,
  title VARCHAR(200) NOT NULL,
  description TEXT,
  event_date TIMESTAMP NOT NULL,
  location VARCHAR(300),
  address TEXT,
  created_by INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  allowed_roles JSONB DEFAULT '[]', -- ['DISTRICT_CHAIR', 'ORG_STAFF']
  allowed_users JSONB DEFAULT '[]', -- [123, 456, 789]
  province VARCHAR(50),
  district VARCHAR(50),
  metadata JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_org_events_party ON org_events(party_id);
CREATE INDEX IF NOT EXISTS idx_org_events_creator ON org_events(created_by);
CREATE INDEX IF NOT EXISTS idx_org_events_date ON org_events(event_date);
CREATE INDEX IF NOT EXISTS idx_org_events_province ON org_events(province);

-- 4. ORG_TASKS - Görevler
CREATE TABLE IF NOT EXISTS org_tasks (
  id SERIAL PRIMARY KEY,
  event_id INTEGER NOT NULL REFERENCES org_events(id) ON DELETE CASCADE,
  assigned_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  assigned_by INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(200) NOT NULL,
  description TEXT,
  status VARCHAR(20) DEFAULT 'pending', -- pending, accepted, excused, rejected, completed
  deadline TIMESTAMP,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_org_tasks_event ON org_tasks(event_id);
CREATE INDEX IF NOT EXISTS idx_org_tasks_assigned_user ON org_tasks(assigned_user_id);
CREATE INDEX IF NOT EXISTS idx_org_tasks_assigned_by ON org_tasks(assigned_by);
CREATE INDEX IF NOT EXISTS idx_org_tasks_status ON org_tasks(status);

-- 5. TASK_EXCUSES - Mazeret bildirimleri
CREATE TABLE IF NOT EXISTS task_excuses (
  id SERIAL PRIMARY KEY,
  task_id INTEGER NOT NULL REFERENCES org_tasks(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  excuse_text TEXT NOT NULL,
  decision VARCHAR(20) DEFAULT 'pending', -- pending, accepted, rejected
  decided_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  decision_note TEXT,
  decided_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_task_excuses_task ON task_excuses(task_id);
CREATE INDEX IF NOT EXISTS idx_task_excuses_user ON task_excuses(user_id);
CREATE INDEX IF NOT EXISTS idx_task_excuses_decision ON task_excuses(decision);

-- 6. ORG_ANNOUNCEMENTS - Duyurular
CREATE TABLE IF NOT EXISTS org_announcements (
  id SERIAL PRIMARY KEY,
  party_id INTEGER NOT NULL,
  created_by INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(200) NOT NULL,
  content TEXT NOT NULL,
  target_roles JSONB DEFAULT '[]', -- ['PARTY_MEMBER', 'ORG_STAFF']
  target_province VARCHAR(50),
  target_district VARCHAR(50),
  priority VARCHAR(20) DEFAULT 'normal', -- low, normal, high, urgent
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_org_announcements_party ON org_announcements(party_id);
CREATE INDEX IF NOT EXISTS idx_org_announcements_creator ON org_announcements(created_by);
CREATE INDEX IF NOT EXISTS idx_org_announcements_created ON org_announcements(created_at DESC);

-- 7. ORG_ANNOUNCEMENT_READS - Duyuru okunma kayıtları
CREATE TABLE IF NOT EXISTS org_announcement_reads (
  id SERIAL PRIMARY KEY,
  announcement_id INTEGER NOT NULL REFERENCES org_announcements(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  read_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(announcement_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_org_announcement_reads_announcement ON org_announcement_reads(announcement_id);
CREATE INDEX IF NOT EXISTS idx_org_announcement_reads_user ON org_announcement_reads(user_id);

-- 8. ORG_POLLS - Anketler
CREATE TABLE IF NOT EXISTS org_polls (
  id SERIAL PRIMARY KEY,
  party_id INTEGER NOT NULL,
  created_by INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(200) NOT NULL,
  description TEXT,
  options JSONB NOT NULL DEFAULT '[]', -- ['Seçenek 1', 'Seçenek 2']
  target_roles JSONB DEFAULT '[]',
  target_province VARCHAR(50),
  target_district VARCHAR(50),
  is_anonymous BOOLEAN DEFAULT FALSE,
  multiple_choice BOOLEAN DEFAULT FALSE,
  ends_at TIMESTAMP,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_org_polls_party ON org_polls(party_id);
CREATE INDEX IF NOT EXISTS idx_org_polls_creator ON org_polls(created_by);
CREATE INDEX IF NOT EXISTS idx_org_polls_ends ON org_polls(ends_at);

-- 9. ORG_POLL_VOTES - Anket oyları
CREATE TABLE IF NOT EXISTS org_poll_votes (
  id SERIAL PRIMARY KEY,
  poll_id INTEGER NOT NULL REFERENCES org_polls(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  option_index INTEGER NOT NULL,
  voted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(poll_id, user_id, option_index)
);

CREATE INDEX IF NOT EXISTS idx_org_poll_votes_poll ON org_poll_votes(poll_id);
CREATE INDEX IF NOT EXISTS idx_org_poll_votes_user ON org_poll_votes(user_id);

-- 10. ORG_ACTIVITY_LOG - Tüm işlem logları
CREATE TABLE IF NOT EXISTS org_activity_log (
  id SERIAL PRIMARY KEY,
  party_id INTEGER NOT NULL,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  action_type VARCHAR(50) NOT NULL, -- message_sent, task_assigned, event_created, etc.
  target_type VARCHAR(50), -- user, event, task, announcement, poll
  target_id INTEGER,
  details JSONB DEFAULT '{}',
  ip_address VARCHAR(50),
  user_agent TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_org_activity_party ON org_activity_log(party_id);
CREATE INDEX IF NOT EXISTS idx_org_activity_user ON org_activity_log(user_id);
CREATE INDEX IF NOT EXISTS idx_org_activity_type ON org_activity_log(action_type);
CREATE INDEX IF NOT EXISTS idx_org_activity_created ON org_activity_log(created_at DESC);

-- ============================================
-- Bildirim tiplerini güncelle (mevcut notifications tablosuna)
-- ============================================
-- Yeni bildirim tipleri:
-- org_message, org_announcement, org_event, org_task, org_excuse, org_poll

COMMENT ON TABLE org_messages IS 'Teşkilat mesajlaşma sistemi';
COMMENT ON TABLE org_events IS 'Teşkilat etkinlikleri';
COMMENT ON TABLE org_tasks IS 'Etkinlik görevleri';
COMMENT ON TABLE task_excuses IS 'Görev mazeret bildirimleri';
COMMENT ON TABLE org_announcements IS 'Teşkilat duyuruları';
COMMENT ON TABLE org_polls IS 'Teşkilat anketleri';
COMMENT ON TABLE org_activity_log IS 'Tüm teşkilat işlem logları';
