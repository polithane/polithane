-- Migration: 002_profile_extensions.sql
-- Description: Profil kategorilerine özel extension tabloları
-- Date: 2025-11-28

-- ============================================
-- 1. MİLLETVEKİLİ PROFİLLERİ
-- ============================================

CREATE TABLE IF NOT EXISTS mp_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Temel Bilgiler
    parliament_id VARCHAR(20) UNIQUE, -- TBMM sicil no
    election_district VARCHAR(100), -- Seçim bölgesi (İl)
    current_term INTEGER, -- Mevcut dönem numarası
    total_terms INTEGER DEFAULT 1, -- Toplam dönem sayısı
    first_election_date DATE, -- İlk seçildiği tarih
    
    -- Meclis Bilgileri
    parliamentary_group VARCHAR(100), -- Parti grubu
    group_position VARCHAR(100), -- Grup içi görev
    is_group_chairman BOOLEAN DEFAULT FALSE,
    is_group_deputy_chairman BOOLEAN DEFAULT FALSE,
    
    -- Komisyon Bilgileri
    main_commission VARCHAR(200), -- Ana komisyon
    sub_commissions TEXT[], -- Alt komisyonlar (array)
    commission_chairman_of VARCHAR(200), -- Başkanı olduğu komisyon
    
    -- Yasama Faaliyetleri
    total_law_proposals INTEGER DEFAULT 0, -- Toplam kanun teklifi
    accepted_law_proposals INTEGER DEFAULT 0, -- Kabul edilen teklifler
    total_motions INTEGER DEFAULT 0, -- Toplam önerge
    total_questions INTEGER DEFAULT 0, -- Toplam soru önergesi
    total_interpellations INTEGER DEFAULT 0, -- Toplam gensoru
    total_investigations INTEGER DEFAULT 0, -- Toplam meclis araştırması
    
    -- Katılım İstatistikleri
    attendance_rate DECIMAL(5,2), -- Genel kurula katılım oranı (%)
    voting_participation_rate DECIMAL(5,2), -- Oylama katılım oranı (%)
    commission_attendance_rate DECIMAL(5,2), -- Komisyon katılım oranı (%)
    
    -- Oylama Analizi
    votes_with_party INTEGER DEFAULT 0, -- Parti ile oy kullanma sayısı
    votes_against_party INTEGER DEFAULT 0, -- Parti karşıtı oy
    abstention_count INTEGER DEFAULT 0, -- Çekimser kalma sayısı
    party_loyalty_rate DECIMAL(5,2), -- Parti sadakati oranı (%)
    
    -- Bütçe ve Mali
    budget_proposals INTEGER DEFAULT 0, -- Bütçe önergeleri
    budget_speeches INTEGER DEFAULT 0, -- Bütçe konuşmaları
    
    -- Konuşmalar ve Aktivite
    total_speeches INTEGER DEFAULT 0, -- Toplam konuşma sayısı
    speech_duration_minutes INTEGER DEFAULT 0, -- Toplam konuşma süresi (dk)
    interruption_count INTEGER DEFAULT 0, -- Söz kesme sayısı
    
    -- Özel Durumlar
    is_minister BOOLEAN DEFAULT FALSE, -- Bakan mı?
    minister_position VARCHAR(200), -- Bakanlık görevi
    ministership_start_date DATE,
    is_speaker BOOLEAN DEFAULT FALSE, -- Meclis Başkanı mı?
    is_deputy_speaker BOOLEAN DEFAULT FALSE, -- Meclis Başkan Vekili mi?
    
    -- Uzmanlık Alanları
    expertise_areas TEXT[], -- Uzmanlık alanları
    education_background TEXT, -- Eğitim geçmişi
    previous_profession VARCHAR(200), -- Önceki meslek
    
    -- İletişim ve Şeffaflık
    has_public_declaration BOOLEAN DEFAULT FALSE, -- Mal bildirimi açık mı?
    declaration_year INTEGER,
    website_url VARCHAR(500),
    social_media_activity_level VARCHAR(20), -- 'high', 'medium', 'low'
    
    -- Performans Metrikleri
    activity_score INTEGER, -- Aktivite puanı (0-100)
    effectiveness_score INTEGER, -- Etkinlik puanı (0-100)
    transparency_score INTEGER, -- Şeffaflık puanı (0-100)
    
    -- Metadata
    profile_completeness INTEGER DEFAULT 0, -- Profil tamamlanma oranı (%)
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(user_id)
);

-- Milletvekili Meclis Dönemleri
CREATE TABLE IF NOT EXISTS mp_parliamentary_terms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    mp_profile_id UUID NOT NULL REFERENCES mp_profiles(id) ON DELETE CASCADE,
    
    term_number INTEGER NOT NULL, -- Dönem numarası (27, 28, 29...)
    election_date DATE,
    start_date DATE NOT NULL,
    end_date DATE,
    election_district VARCHAR(100), -- O dönemdeki seçim bölgesi
    party_id UUID REFERENCES parties(id),
    party_name VARCHAR(200),
    
    is_current BOOLEAN DEFAULT FALSE,
    
    -- Dönem içi görevler
    roles TEXT[], -- O dönemdeki görevler
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(mp_profile_id, term_number)
);

-- Milletvekili Komisyon Üyelikleri
CREATE TABLE IF NOT EXISTS mp_commissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    mp_profile_id UUID NOT NULL REFERENCES mp_profiles(id) ON DELETE CASCADE,
    
    commission_name VARCHAR(200) NOT NULL,
    position VARCHAR(100), -- 'Başkan', 'Başkan Vekili', 'Üye', 'Raportör'
    start_date DATE,
    end_date DATE,
    is_current BOOLEAN DEFAULT TRUE,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Milletvekili Yasama Faaliyetleri Detay
CREATE TABLE IF NOT EXISTS mp_legislation_activities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    mp_profile_id UUID NOT NULL REFERENCES mp_profiles(id) ON DELETE CASCADE,
    
    activity_type VARCHAR(50) NOT NULL, -- 'law_proposal', 'motion', 'question', 'interpellation'
    title TEXT NOT NULL,
    summary TEXT,
    submission_date DATE,
    status VARCHAR(50), -- 'pending', 'accepted', 'rejected', 'withdrawn'
    
    -- İlgili dökümanlar
    document_url VARCHAR(500),
    tbmm_document_id VARCHAR(50),
    
    -- Co-sponsors
    co_sponsors TEXT[], -- Ortak imza sahipleri
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- 2. PARTİ/TEŞKİLAT GÖREVLİSİ PROFİLLERİ
-- ============================================

CREATE TABLE IF NOT EXISTS party_official_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    party_id UUID REFERENCES parties(id),
    
    -- Görev Bilgileri
    position_title VARCHAR(200) NOT NULL, -- 'Genel Başkan', 'Genel Başkan Yardımcısı', 'MYK Üyesi'
    position_level VARCHAR(50), -- 'national', 'provincial', 'district', 'local'
    organization_unit VARCHAR(200), -- 'MYK', 'İl Başkanlığı', 'İlçe Başkanlığı'
    
    -- Lokasyon (il/ilçe görevlileri için)
    province VARCHAR(100),
    district VARCHAR(100),
    
    -- Görev Süresi
    position_start_date DATE,
    position_end_date DATE,
    is_current_position BOOLEAN DEFAULT TRUE,
    
    -- Sorumluluk Alanları
    responsibilities TEXT[], -- 'Organizasyon', 'Gençlik', 'Kadın Kolları'
    committee_memberships TEXT[], -- Komite üyelikleri
    
    -- Parti İçi Deneyim
    total_years_in_party INTEGER,
    previous_positions TEXT[], -- Önceki görevler
    party_membership_number VARCHAR(50),
    
    -- Organizasyon Başarıları
    organized_events_count INTEGER DEFAULT 0,
    recruited_members_count INTEGER DEFAULT 0,
    campaign_participations INTEGER DEFAULT 0,
    
    -- Seçim Deneyimi
    election_campaigns TEXT[], -- Katıldığı seçim kampanyaları
    campaign_roles TEXT[], -- Kampanyalardaki roller
    
    -- İletişim
    office_phone VARCHAR(20),
    office_address TEXT,
    office_email VARCHAR(255),
    
    -- Metadata
    profile_completeness INTEGER DEFAULT 0,
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(user_id)
);

-- Parti Görevlisi Görev Geçmişi
CREATE TABLE IF NOT EXISTS party_official_positions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    party_official_profile_id UUID NOT NULL REFERENCES party_official_profiles(id) ON DELETE CASCADE,
    
    position_title VARCHAR(200) NOT NULL,
    party_id UUID REFERENCES parties(id),
    party_name VARCHAR(200),
    
    start_date DATE NOT NULL,
    end_date DATE,
    province VARCHAR(100),
    district VARCHAR(100),
    
    achievements TEXT, -- Görev dönemindeki başarılar
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- 3. VATANDAŞ PROFİLLERİ
-- ============================================

CREATE TABLE IF NOT EXISTS citizen_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Demografik Bilgiler
    birth_year INTEGER,
    gender VARCHAR(20), -- 'male', 'female', 'other', 'prefer_not_to_say'
    province VARCHAR(100),
    district VARCHAR(100),
    
    -- Eğitim
    education_level VARCHAR(50), -- 'ilkokul', 'ortaokul', 'lise', 'önlisans', 'lisans', 'yüksek_lisans', 'doktora'
    university VARCHAR(200),
    graduation_year INTEGER,
    field_of_study VARCHAR(200),
    
    -- Meslek
    profession VARCHAR(200),
    sector VARCHAR(100), -- 'kamu', 'özel', 'serbest', 'emekli', 'öğrenci', 'işsiz'
    company_name VARCHAR(200),
    
    -- Siyasi İlgi Alanları
    interested_topics TEXT[], -- 'ekonomi', 'eğitim', 'sağlık', 'çevre'
    followed_politicians TEXT[], -- Takip ettiği siyasetçiler
    followed_parties TEXT[], -- Takip ettiği partiler
    
    -- Platform Aktivitesi
    total_posts INTEGER DEFAULT 0,
    total_comments INTEGER DEFAULT 0,
    total_likes_given INTEGER DEFAULT 0,
    total_likes_received INTEGER DEFAULT 0,
    
    -- Topluluk Katılımı
    joined_communities TEXT[], -- Katıldığı topluluklar
    community_roles TEXT[], -- Topluluklardaki roller
    
    -- Tercihler
    political_stance VARCHAR(50), -- 'sağ', 'sol', 'merkez', 'milliyetçi', 'liberal', vb.
    is_first_time_voter BOOLEAN,
    voting_history_years INTEGER[], -- Oy kullandığı yıllar
    
    -- Gizlilik
    show_province BOOLEAN DEFAULT TRUE,
    show_education BOOLEAN DEFAULT TRUE,
    show_profession BOOLEAN DEFAULT TRUE,
    
    -- Metadata
    profile_completeness INTEGER DEFAULT 0,
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(user_id)
);

-- ============================================
-- 4. PARTİ ÜYESİ VATANDAŞ PROFİLLERİ
-- ============================================

CREATE TABLE IF NOT EXISTS party_member_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    citizen_profile_id UUID REFERENCES citizen_profiles(id),
    party_id UUID REFERENCES parties(id),
    
    -- Üyelik Bilgileri
    membership_number VARCHAR(50),
    membership_start_date DATE NOT NULL,
    membership_end_date DATE,
    is_active_member BOOLEAN DEFAULT TRUE,
    
    -- Üyelik Türü
    membership_type VARCHAR(50), -- 'regular', 'youth', 'woman', 'senior'
    membership_status VARCHAR(50), -- 'active', 'passive', 'suspended', 'resigned'
    
    -- Parti İçi Aktivite
    attended_meetings_count INTEGER DEFAULT 0,
    volunteered_events_count INTEGER DEFAULT 0,
    recruited_members_count INTEGER DEFAULT 0,
    
    -- Kollar
    youth_branch_member BOOLEAN DEFAULT FALSE,
    women_branch_member BOOLEAN DEFAULT FALSE,
    senior_branch_member BOOLEAN DEFAULT FALSE,
    
    -- Gönüllü Çalışmalar
    volunteer_roles TEXT[], -- 'Sandık görevlisi', 'Organizatör', vb.
    campaign_contributions TEXT[], -- Kampanyalarda yaptığı katkılar
    
    -- Eğitim ve Gelişim
    completed_trainings TEXT[], -- Tamamladığı parti içi eğitimler
    certifications TEXT[], -- Sertifikalar
    
    -- Üyelik Geçmişi
    previous_parties TEXT[], -- Önceki parti üyelikleri
    
    -- İletişim Tercihleri
    receive_party_news BOOLEAN DEFAULT TRUE,
    receive_event_invitations BOOLEAN DEFAULT TRUE,
    available_for_volunteering BOOLEAN DEFAULT FALSE,
    
    -- Metadata
    profile_completeness INTEGER DEFAULT 0,
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(user_id)
);

-- ============================================
-- 5. ESKİ SİYASETÇİ PROFİLLERİ
-- ============================================

CREATE TABLE IF NOT EXISTS ex_politician_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Siyasi Kariyer Özeti
    career_summary TEXT,
    total_years_in_politics INTEGER,
    retirement_date DATE,
    retirement_reason VARCHAR(200), -- 'emekli', 'istifa', 'seçim kaybı', 'diğer'
    
    -- En Yüksek Görev
    highest_position VARCHAR(200), -- 'Cumhurbaşkanı', 'Başbakan', 'Bakan', 'Milletvekili'
    highest_position_start_date DATE,
    highest_position_end_date DATE,
    
    -- Görev Özeti
    total_parliamentary_terms INTEGER DEFAULT 0,
    served_as_minister BOOLEAN DEFAULT FALSE,
    ministerial_positions TEXT[], -- Bakanlıklar
    served_as_pm BOOLEAN DEFAULT FALSE,
    served_as_president BOOLEAN DEFAULT FALSE,
    
    -- Yasama Mirası
    total_laws_enacted INTEGER DEFAULT 0, -- Çıkarılan kanunlar
    notable_laws TEXT[], -- Önemli kanunlar
    total_legislative_work INTEGER DEFAULT 0,
    
    -- Parti Geçmişi
    parties_served TEXT[], -- Görev yaptığı partiler
    founded_party VARCHAR(200), -- Kurduğu parti
    party_leadership_years INTEGER DEFAULT 0,
    
    -- Başarılar ve Ödüller
    awards TEXT[], -- Aldığı ödüller
    achievements TEXT[], -- Başarıları
    international_recognition TEXT[], -- Uluslararası tanınma
    
    -- Mevcut Durum
    current_status VARCHAR(100), -- 'emekli', 'danışman', 'akademisyen', 'iş insanı'
    current_activities TEXT[], -- Mevcut faaliyetler
    
    -- Akademik/Yazarlık
    published_books TEXT[], -- Yayınlanan kitaplar
    academic_works TEXT[], -- Akademik çalışmalar
    newspaper_columns TEXT[], -- Köşe yazarlıkları
    
    -- Miras ve Etki
    political_legacy TEXT, -- Siyasi mirası
    mentored_politicians TEXT[], -- Yetiştirdiği siyasetçiler
    
    -- Mevcut Bağlantılar
    advisory_roles TEXT[], -- Danışmanlık rolleri
    board_memberships TEXT[], -- Yönetim kurulu üyelikleri
    ngo_affiliations TEXT[], -- STK bağlantıları
    
    -- Metadata
    profile_completeness INTEGER DEFAULT 0,
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(user_id)
);

-- Eski Siyasetçi Kariyer Geçmişi
CREATE TABLE IF NOT EXISTS ex_politician_career (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ex_politician_profile_id UUID NOT NULL REFERENCES ex_politician_profiles(id) ON DELETE CASCADE,
    
    position_title VARCHAR(200) NOT NULL,
    organization VARCHAR(200), -- 'TBMM', 'Bakanlık', 'Parti'
    party_id UUID REFERENCES parties(id),
    party_name VARCHAR(200),
    
    start_date DATE NOT NULL,
    end_date DATE,
    
    location VARCHAR(200), -- İl/bölge (milletvekili için)
    achievements TEXT, -- Görev dönemindeki başarılar
    notable_works TEXT[], -- Önemli işler
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(ex_politician_profile_id, position_title, start_date)
);

-- ============================================
-- 6. MEDYA MENSUBU PROFİLLERİ
-- ============================================

CREATE TABLE IF NOT EXISTS media_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Meslek Bilgileri
    profession_title VARCHAR(200), -- 'Gazeteci', 'Editör', 'Köşe Yazarı', 'Muhabir', 'Haber Müdürü'
    specialization TEXT[], -- Uzmanlık alanları: 'siyaset', 'ekonomi', 'spor'
    beat VARCHAR(200), -- Sorumlu olduğu alan/beat
    
    -- Mevcut İş
    current_employer VARCHAR(200), -- Çalıştığı kurum
    employer_type VARCHAR(50), -- 'tv', 'newspaper', 'digital', 'radio', 'agency'
    position VARCHAR(200), -- Pozisyon
    employment_start_date DATE,
    
    -- Yayınlar ve Programlar
    tv_program_name VARCHAR(200), -- TV programı adı
    radio_program_name VARCHAR(200),
    newspaper_column_name VARCHAR(200), -- Köşe adı
    publication_frequency VARCHAR(50), -- 'daily', 'weekly', 'monthly'
    
    -- Gazetecilik Deneyimi
    total_years_experience INTEGER,
    press_card_number VARCHAR(50), -- Basın kartı numarası
    journalists_union_member BOOLEAN DEFAULT FALSE,
    
    -- İçerik ve Uzmanlaşma
    content_types TEXT[], -- 'haber', 'röportaj', 'yorum', 'analiz', 'köşe'
    coverage_areas TEXT[], -- 'TBMM', 'siyasi partiler', 'seçimler', 'yerel yönetimler'
    languages TEXT[], -- Diller
    
    -- Eserler ve Yayınlar
    published_books TEXT[], -- Kitaplar
    documentary_works TEXT[], -- Belgeseller
    investigative_reports TEXT[], -- Araştırmacı haberler
    
    -- Ödüller ve Tanınma
    awards TEXT[], -- Gazetecilik ödülleri
    notable_interviews TEXT[], -- Önemli röportajlar
    exclusive_stories TEXT[], -- Özel haberler
    
    -- Sosyal Medya ve Erişim
    avg_article_views INTEGER, -- Ortalama makale görüntüleme
    avg_tv_viewers INTEGER, -- Ortalama TV izleyici sayısı
    social_media_reach INTEGER, -- Sosyal medya erişimi
    
    -- Etik ve Standartlar
    follows_press_ethics BOOLEAN DEFAULT TRUE,
    fact_checker BOOLEAN DEFAULT FALSE,
    editorial_independence_rating INTEGER, -- 1-10
    
    -- Network ve İlişkiler
    political_connections TEXT[], -- Siyasi bağlantılar (şeffaflık için)
    source_network_strength VARCHAR(50), -- 'strong', 'moderate', 'developing'
    
    -- Metadata
    profile_completeness INTEGER DEFAULT 0,
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(user_id)
);

-- Medya Mensubu İş Geçmişi
CREATE TABLE IF NOT EXISTS media_work_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    media_profile_id UUID NOT NULL REFERENCES media_profiles(id) ON DELETE CASCADE,
    
    employer_name VARCHAR(200) NOT NULL,
    employer_type VARCHAR(50), -- 'tv', 'newspaper', 'digital', 'radio'
    position VARCHAR(200),
    
    start_date DATE NOT NULL,
    end_date DATE,
    is_current BOOLEAN DEFAULT FALSE,
    
    notable_works TEXT[], -- O kurumda yaptığı önemli işler
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Medya Mensubu Yayınları
CREATE TABLE IF NOT EXISTS media_publications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    media_profile_id UUID NOT NULL REFERENCES media_profiles(id) ON DELETE CASCADE,
    
    publication_type VARCHAR(50), -- 'book', 'article', 'documentary', 'column'
    title VARCHAR(500) NOT NULL,
    description TEXT,
    publisher VARCHAR(200),
    publication_date DATE,
    
    url VARCHAR(500),
    isbn VARCHAR(20), -- Kitaplar için
    
    awards_received TEXT[], -- Aldığı ödüller
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- İNDEXLER (Performans için)
-- ============================================

-- Milletvekili indexes
CREATE INDEX IF NOT EXISTS idx_mp_profiles_user_id ON mp_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_mp_profiles_district ON mp_profiles(election_district);
CREATE INDEX IF NOT EXISTS idx_mp_profiles_current_term ON mp_profiles(current_term);
CREATE INDEX IF NOT EXISTS idx_mp_parliamentary_terms_mp_id ON mp_parliamentary_terms(mp_profile_id);
CREATE INDEX IF NOT EXISTS idx_mp_commissions_mp_id ON mp_commissions(mp_profile_id);

-- Parti görevlisi indexes
CREATE INDEX IF NOT EXISTS idx_party_official_profiles_user_id ON party_official_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_party_official_profiles_party_id ON party_official_profiles(party_id);
CREATE INDEX IF NOT EXISTS idx_party_official_profiles_province ON party_official_profiles(province);

-- Vatandaş indexes
CREATE INDEX IF NOT EXISTS idx_citizen_profiles_user_id ON citizen_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_citizen_profiles_province ON citizen_profiles(province);

-- Parti üyesi indexes
CREATE INDEX IF NOT EXISTS idx_party_member_profiles_user_id ON party_member_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_party_member_profiles_party_id ON party_member_profiles(party_id);

-- Eski siyasetçi indexes
CREATE INDEX IF NOT EXISTS idx_ex_politician_profiles_user_id ON ex_politician_profiles(user_id);

-- Medya indexes
CREATE INDEX IF NOT EXISTS idx_media_profiles_user_id ON media_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_media_profiles_employer ON media_profiles(current_employer);

-- ============================================
-- TRİGGERLAR (Otomatik güncellemeler)
-- ============================================

-- Son güncelleme trigger'ları
CREATE OR REPLACE FUNCTION update_profile_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.last_updated = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER mp_profiles_updated_at BEFORE UPDATE ON mp_profiles
    FOR EACH ROW EXECUTE FUNCTION update_profile_updated_at();

CREATE TRIGGER party_official_profiles_updated_at BEFORE UPDATE ON party_official_profiles
    FOR EACH ROW EXECUTE FUNCTION update_profile_updated_at();

CREATE TRIGGER citizen_profiles_updated_at BEFORE UPDATE ON citizen_profiles
    FOR EACH ROW EXECUTE FUNCTION update_profile_updated_at();

CREATE TRIGGER party_member_profiles_updated_at BEFORE UPDATE ON party_member_profiles
    FOR EACH ROW EXECUTE FUNCTION update_profile_updated_at();

CREATE TRIGGER ex_politician_profiles_updated_at BEFORE UPDATE ON ex_politician_profiles
    FOR EACH ROW EXECUTE FUNCTION update_profile_updated_at();

CREATE TRIGGER media_profiles_updated_at BEFORE UPDATE ON media_profiles
    FOR EACH ROW EXECUTE FUNCTION update_profile_updated_at();
