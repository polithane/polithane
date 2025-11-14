# 🗄️ Veri Modeli ve Database Yapısı

## 📋 İçindekiler

1. [Genel Bakış](#genel-bakış)
2. [Database Stratejisi](#database-stratejisi)
3. [PostgreSQL Schema](#postgresql-schema)
4. [Neo4j Graph Model](#neo4j-graph-model)
5. [MongoDB Collections](#mongodb-collections)
6. [Elasticsearch İndeksler](#elasticsearch-indeksler)
7. [Redis Cache Yapısı](#redis-cache-yapısı)
8. [İlişkiler ve Constraints](#ilişkiler-ve-constraints)
9. [Data Flow](#data-flow)

---

## Genel Bakış

PolitPlatform, **polyglot persistence** yaklaşımı kullanır - her veri tipi için en uygun veritabanı.

### Database Dağılımı

| Database | Kullanım | Veri Tipi |
|----------|----------|-----------|
| **PostgreSQL** | Ana veri | Kullanıcılar, postlar, ilişkiler |
| **Neo4j** | Graph analizi | Parti hiyerarşisi, sosyal ağ |
| **MongoDB** | Log & Analitik | Event logs, metrics |
| **Elasticsearch** | Arama | Full-text search |
| **Redis** | Cache & Queue | Session, PolitPuan cache |

### Toplam Veri Tahminleri (5 Yıl)

- **Kullanıcılar**: 32M kayıt
- **Postlar**: 500M+ post
- **Yorumlar**: 2B+ yorum
- **Etkileşimler**: 10B+ (beğeni, paylaşım)
- **Analitik Events**: 100B+ event

---

## Database Stratejisi

### CQRS Pattern

**Command** (Write) ve **Query** (Read) ayrımı:

```
Write (Commands)
    ↓
PostgreSQL (Master)
    ↓ (Replication)
PostgreSQL (Read Replicas)
    ↓
Redis (Cache)
    ↓
Read (Queries)
```

### Sharding Strategy

Kullanıcı ve post verilerini il bazında shard'lara böl:

```python
def get_shard_id(user_id):
    # Kullanıcı ID'sine göre shard seçimi
    return user_id % NUM_SHARDS  # 16 shard

def get_regional_shard(city_id):
    # İl bazlı shard (bölgesel sorgular için)
    REGION_SHARDS = {
        "istanbul": 0,
        "ankara": 1,
        "izmir": 2,
        # ... 7 bölge
    }
    return REGION_SHARDS.get(city_id, 7)  # Default shard
```

---

## PostgreSQL Schema

### Core Tables

#### 1. users

```sql
CREATE TABLE users (
    id BIGSERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    phone VARCHAR(20) UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    
    -- Profil
    full_name VARCHAR(100) NOT NULL,
    display_name VARCHAR(100),
    bio TEXT,
    avatar_url VARCHAR(500),
    cover_url VARCHAR(500),
    
    -- Kimlik Doğrulama
    is_verified BOOLEAN DEFAULT FALSE,
    verification_method VARCHAR(20), -- 'edevlet', 'phone', 'email'
    tc_kimlik_no VARCHAR(11) UNIQUE, -- Encrypted
    verification_date TIMESTAMP,
    
    -- Rol Sistemi
    role VARCHAR(30) NOT NULL DEFAULT 'citizen', 
    -- 'citizen', 'verified_citizen', 'party_member', 
    -- 'politician', 'journalist', 'organization_manager', 
    -- 'party_admin', 'system_admin'
    role_level INT DEFAULT 1, -- 1-10 yetki seviyesi
    
    -- Meslek ve Demografi
    profession VARCHAR(50),
    profession_verified BOOLEAN DEFAULT FALSE,
    age_group VARCHAR(20), -- '18-24', '25-34', etc.
    education_level VARCHAR(30),
    
    -- Lokasyon
    country VARCHAR(2) DEFAULT 'TR',
    city_id INT REFERENCES cities(id),
    district_id INT REFERENCES districts(id),
    neighborhood_id INT REFERENCES neighborhoods(id),
    
    -- Parti Bilgileri (Eğer parti üyesiyse)
    party_id INT REFERENCES parties(id),
    party_membership_no VARCHAR(50),
    party_role VARCHAR(50), -- 'member', 'delegate', 'manager'
    party_level VARCHAR(30), -- 'neighborhood', 'district', 'city', 'national'
    party_joined_at TIMESTAMP,
    
    -- Siyasetçi Özel (Eğer siyasetçiyse)
    politician_type VARCHAR(30), -- 'district', 'city', 'national', 'mp'
    election_district_id INT,
    office_address TEXT,
    assistant_emails TEXT[], -- Asistan e-postaları
    
    -- Gazeteci Özel
    journalist_verified BOOLEAN DEFAULT FALSE,
    media_organization VARCHAR(100),
    press_card_no VARCHAR(50),
    fact_check_score DECIMAL(3,2) DEFAULT 1.00, -- 0.00-1.00
    
    -- İstatistikler (denormalized for performance)
    followers_count INT DEFAULT 0,
    following_count INT DEFAULT 0,
    posts_count INT DEFAULT 0,
    politpuan_total DECIMAL(12,2) DEFAULT 0,
    politpuan_rank INT,
    
    -- Ayarlar
    is_private BOOLEAN DEFAULT FALSE,
    allow_messages_from VARCHAR(20) DEFAULT 'everyone', -- 'everyone', 'following', 'verified'
    language VARCHAR(5) DEFAULT 'tr',
    
    -- Güvenlik
    is_active BOOLEAN DEFAULT TRUE,
    is_banned BOOLEAN DEFAULT FALSE,
    ban_reason TEXT,
    ban_until TIMESTAMP,
    two_factor_enabled BOOLEAN DEFAULT FALSE,
    
    -- Metadata
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    last_login_at TIMESTAMP,
    last_activity_at TIMESTAMP,
    
    -- İndeksler
    CONSTRAINT check_role CHECK (role IN (
        'citizen', 'verified_citizen', 'party_member', 
        'politician', 'journalist', 'organization_manager', 
        'party_admin', 'system_admin'
    ))
);

-- İndeksler
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_city ON users(city_id);
CREATE INDEX idx_users_party ON users(party_id);
CREATE INDEX idx_users_verified ON users(is_verified);
CREATE INDEX idx_users_politpuan ON users(politpuan_total DESC);
CREATE INDEX idx_users_created ON users(created_at);

-- Full text search
CREATE INDEX idx_users_fulltext ON users 
USING gin(to_tsvector('turkish', full_name || ' ' || COALESCE(bio, '')));
```

#### 2. parties

```sql
CREATE TABLE parties (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL,
    short_name VARCHAR(20) UNIQUE NOT NULL,
    logo_url VARCHAR(500),
    color_primary VARCHAR(7), -- HEX color
    color_secondary VARCHAR(7),
    
    -- Bilgiler
    founded_date DATE,
    headquarters_address TEXT,
    website VARCHAR(255),
    official_email VARCHAR(255),
    phone VARCHAR(20),
    
    -- Dokümantasyon
    charter_url VARCHAR(500), -- Tüzük
    program_url VARCHAR(500), -- Program
    history_text TEXT,
    
    -- Liderlik
    chairman_user_id BIGINT REFERENCES users(id),
    general_secretary_user_id BIGINT REFERENCES users(id),
    spokesperson_user_id BIGINT REFERENCES users(id),
    
    -- İstatistikler
    member_count INT DEFAULT 0,
    follower_count INT DEFAULT 0,
    parliament_seats INT DEFAULT 0,
    municipality_count INT DEFAULT 0,
    
    -- Metadata
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_parties_name ON parties(name);
CREATE INDEX idx_parties_active ON parties(is_active);
```

#### 3. posts

```sql
CREATE TABLE posts (
    id BIGSERIAL PRIMARY KEY,
    author_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- İçerik
    content TEXT NOT NULL,
    content_warning TEXT, -- Uyarı (hassas içerik)
    
    -- Medya
    media_type VARCHAR(20), -- 'text', 'photo', 'video', 'live', 'poll', 'document'
    media_urls TEXT[], -- Fotoğraf/video URL'leri
    media_thumbnails TEXT[],
    video_duration INT, -- saniye
    
    -- Poll (Eğer ankeyse)
    poll_options JSONB, -- [{"option": "Evet", "votes": 150}, ...]
    poll_ends_at TIMESTAMP,
    poll_multiple_choice BOOLEAN DEFAULT FALSE,
    
    -- Referanslar
    reply_to_post_id BIGINT REFERENCES posts(id), -- Yorum ise
    quote_post_id BIGINT REFERENCES posts(id), -- Alıntı paylaşım ise
    repost_of_id BIGINT REFERENCES posts(id), -- Repost ise
    
    -- Lokasyon
    location_text VARCHAR(100),
    location_lat DECIMAL(10,8),
    location_lng DECIMAL(11,8),
    
    -- Etiketler
    hashtags TEXT[], -- ['#ekonomi', '#eğitim']
    mentions BIGINT[], -- [@user_id1, @user_id2]
    
    -- PolitPuan Katmanları
    politpuan_total DECIMAL(12,2) DEFAULT 0,
    politpuan_k1 DECIMAL(10,2) DEFAULT 0, -- Etkileşim
    politpuan_k2 DECIMAL(10,2) DEFAULT 0, -- Kullanıcı profili
    politpuan_k3 DECIMAL(10,2) DEFAULT 0, -- İçerik türü
    politpuan_k4 DECIMAL(10,2) DEFAULT 0, -- Siyasi gerilim
    politpuan_k5 DECIMAL(10,2) DEFAULT 0, -- Zamanlama
    
    -- AI Analiz Sonuçları
    ai_category VARCHAR(30), -- 'supportive', 'critical', 'controversial', etc.
    ai_topic VARCHAR(30), -- 'economy', 'education', 'security', etc.
    ai_sentiment JSONB, -- {"positive": 0.7, "negative": 0.2, "neutral": 0.1}
    ai_gerilim_score DECIMAL(3,2), -- 0-1
    ai_viral_probability DECIMAL(3,2), -- 0-1
    ai_fact_checked BOOLEAN DEFAULT FALSE,
    ai_fact_result VARCHAR(20), -- 'true', 'false', 'misleading', 'unverified'
    
    -- Etkileşim Sayıları (Denormalized)
    views_count INT DEFAULT 0,
    likes_count INT DEFAULT 0,
    comments_count INT DEFAULT 0,
    reposts_count INT DEFAULT 0,
    quotes_count INT DEFAULT 0,
    saves_count INT DEFAULT 0,
    shares_external_count INT DEFAULT 0,
    
    -- Video Özel Metrikler
    video_views_count INT DEFAULT 0,
    video_completed_views INT DEFAULT 0,
    video_avg_watch_time INT DEFAULT 0, -- saniye
    
    -- Görünürlük
    visibility VARCHAR(20) DEFAULT 'public', -- 'public', 'followers', 'party', 'private'
    is_pinned BOOLEAN DEFAULT FALSE,
    
    -- Moderasyon
    is_deleted BOOLEAN DEFAULT FALSE,
    deleted_at TIMESTAMP,
    deleted_by BIGINT REFERENCES users(id),
    is_flagged BOOLEAN DEFAULT FALSE,
    flag_reason TEXT,
    moderation_status VARCHAR(20) DEFAULT 'approved', -- 'pending', 'approved', 'rejected'
    
    -- Metadata
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    edited_at TIMESTAMP,
    
    CONSTRAINT check_media_type CHECK (media_type IN (
        'text', 'photo', 'video', 'live', 'poll', 'document', 'infographic'
    ))
);

-- İndeksler
CREATE INDEX idx_posts_author ON posts(author_id);
CREATE INDEX idx_posts_created ON posts(created_at DESC);
CREATE INDEX idx_posts_politpuan ON posts(politpuan_total DESC);
CREATE INDEX idx_posts_reply_to ON posts(reply_to_post_id);
CREATE INDEX idx_posts_hashtags ON posts USING gin(hashtags);
CREATE INDEX idx_posts_mentions ON posts USING gin(mentions);
CREATE INDEX idx_posts_visibility ON posts(visibility);
CREATE INDEX idx_posts_ai_topic ON posts(ai_topic);
CREATE INDEX idx_posts_deleted ON posts(is_deleted) WHERE is_deleted = FALSE;

-- Composite indexes
CREATE INDEX idx_posts_author_created ON posts(author_id, created_at DESC);
CREATE INDEX idx_posts_topic_politpuan ON posts(ai_topic, politpuan_total DESC);

-- Full text search
CREATE INDEX idx_posts_fulltext ON posts 
USING gin(to_tsvector('turkish', content));
```

#### 4. interactions (Etkileşimler)

```sql
CREATE TABLE interactions (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    post_id BIGINT NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    
    interaction_type VARCHAR(20) NOT NULL, 
    -- 'like', 'comment', 'repost', 'quote', 'save', 'view', 'share'
    
    -- Comment özel
    comment_text TEXT,
    comment_media_url VARCHAR(500),
    
    -- Metadata
    created_at TIMESTAMP DEFAULT NOW(),
    
    CONSTRAINT unique_interaction UNIQUE (user_id, post_id, interaction_type),
    CONSTRAINT check_interaction_type CHECK (interaction_type IN (
        'like', 'comment', 'repost', 'quote', 'save', 'view', 'share'
    ))
);

-- İndeksler
CREATE INDEX idx_interactions_user ON interactions(user_id);
CREATE INDEX idx_interactions_post ON interactions(post_id);
CREATE INDEX idx_interactions_type ON interactions(interaction_type);
CREATE INDEX idx_interactions_created ON interactions(created_at);

-- Composite
CREATE INDEX idx_interactions_post_type ON interactions(post_id, interaction_type);
```

#### 5. follows (Takip İlişkileri)

```sql
CREATE TABLE follows (
    id BIGSERIAL PRIMARY KEY,
    follower_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    following_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Özel bildirim ayarları
    notifications_enabled BOOLEAN DEFAULT TRUE,
    show_reposts BOOLEAN DEFAULT TRUE,
    
    created_at TIMESTAMP DEFAULT NOW(),
    
    CONSTRAINT unique_follow UNIQUE (follower_id, following_id),
    CONSTRAINT no_self_follow CHECK (follower_id != following_id)
);

CREATE INDEX idx_follows_follower ON follows(follower_id);
CREATE INDEX idx_follows_following ON follows(following_id);
CREATE INDEX idx_follows_created ON follows(created_at);
```

#### 6. messages (Direkt Mesajlar)

```sql
CREATE TABLE conversations (
    id BIGSERIAL PRIMARY KEY,
    participant_ids BIGINT[] NOT NULL, -- [user1_id, user2_id] (sorted)
    last_message_at TIMESTAMP DEFAULT NOW(),
    created_at TIMESTAMP DEFAULT NOW(),
    
    CONSTRAINT unique_conversation UNIQUE (participant_ids)
);

CREATE TABLE messages (
    id BIGSERIAL PRIMARY KEY,
    conversation_id BIGINT NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    sender_id BIGINT NOT NULL REFERENCES users(id),
    
    content TEXT NOT NULL,
    media_url VARCHAR(500),
    
    is_read BOOLEAN DEFAULT FALSE,
    read_at TIMESTAMP,
    
    created_at TIMESTAMP DEFAULT NOW(),
    
    -- Şifreleme (E2E encrypted)
    is_encrypted BOOLEAN DEFAULT TRUE,
    encryption_key_id VARCHAR(100)
);

CREATE INDEX idx_messages_conversation ON messages(conversation_id, created_at DESC);
CREATE INDEX idx_messages_sender ON messages(sender_id);
CREATE INDEX idx_messages_read ON messages(is_read);
```

#### 7. notifications (Bildirimler)

```sql
CREATE TABLE notifications (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    type VARCHAR(30) NOT NULL,
    -- 'like', 'comment', 'follow', 'mention', 'repost', 
    -- 'party_announcement', 'task_assigned', 'message'
    
    actor_id BIGINT REFERENCES users(id), -- Kim yaptı?
    target_id BIGINT, -- Post ID, Comment ID, etc.
    
    title VARCHAR(255),
    body TEXT,
    action_url VARCHAR(500),
    
    is_read BOOLEAN DEFAULT FALSE,
    read_at TIMESTAMP,
    
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_notifications_user ON notifications(user_id, created_at DESC);
CREATE INDEX idx_notifications_read ON notifications(user_id, is_read);
CREATE INDEX idx_notifications_type ON notifications(type);
```

#### 8. Geography Tables

```sql
CREATE TABLE cities (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) UNIQUE NOT NULL,
    code VARCHAR(2) UNIQUE NOT NULL, -- '01', '34', etc.
    population INT,
    region VARCHAR(30), -- 'Marmara', 'Ege', etc.
    latitude DECIMAL(10,8),
    longitude DECIMAL(11,8)
);

CREATE TABLE districts (
    id SERIAL PRIMARY KEY,
    city_id INT NOT NULL REFERENCES cities(id),
    name VARCHAR(100) NOT NULL,
    population INT,
    
    UNIQUE(city_id, name)
);

CREATE TABLE neighborhoods (
    id SERIAL PRIMARY KEY,
    district_id INT NOT NULL REFERENCES districts(id),
    name VARCHAR(100) NOT NULL,
    population INT,
    
    UNIQUE(district_id, name)
);

CREATE INDEX idx_districts_city ON districts(city_id);
CREATE INDEX idx_neighborhoods_district ON neighborhoods(district_id);
```

#### 9. party_organization (Teşkilat Yapısı)

```sql
CREATE TABLE party_organization (
    id SERIAL PRIMARY KEY,
    party_id INT NOT NULL REFERENCES parties(id),
    
    level VARCHAR(30) NOT NULL, -- 'national', 'city', 'district', 'neighborhood'
    city_id INT REFERENCES cities(id),
    district_id INT REFERENCES districts(id),
    neighborhood_id INT REFERENCES neighborhoods(id),
    
    -- Yöneticiler
    manager_user_id BIGINT REFERENCES users(id),
    deputy_managers BIGINT[], -- Yardımcılar
    
    -- Alt birimleri
    women_branch_manager BIGINT REFERENCES users(id),
    youth_branch_manager BIGINT REFERENCES users(id),
    
    -- İstatistikler
    member_count INT DEFAULT 0,
    active_member_count INT DEFAULT 0,
    
    -- İletişim
    office_address TEXT,
    phone VARCHAR(20),
    email VARCHAR(255),
    
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    CONSTRAINT unique_org UNIQUE (party_id, level, city_id, district_id, neighborhood_id)
);

CREATE INDEX idx_party_org_party ON party_organization(party_id);
CREATE INDEX idx_party_org_level ON party_organization(level);
CREATE INDEX idx_party_org_city ON party_organization(city_id);
```

#### 10. tasks (Görev Yönetimi)

```sql
CREATE TABLE tasks (
    id BIGSERIAL PRIMARY KEY,
    party_id INT NOT NULL REFERENCES parties(id),
    organization_id INT REFERENCES party_organization(id),
    
    title VARCHAR(255) NOT NULL,
    description TEXT,
    task_type VARCHAR(30), -- 'event', 'door_knock', 'phone_call', 'meeting'
    
    assigned_to BIGINT REFERENCES users(id),
    assigned_by BIGINT REFERENCES users(id),
    
    status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'in_progress', 'completed', 'cancelled'
    priority VARCHAR(20) DEFAULT 'medium', -- 'low', 'medium', 'high', 'urgent'
    
    due_date TIMESTAMP,
    completed_at TIMESTAMP,
    
    -- Lokasyon (Eğer sahada görevse)
    location_city_id INT REFERENCES cities(id),
    location_district_id INT REFERENCES districts(id),
    location_address TEXT,
    
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_tasks_party ON tasks(party_id);
CREATE INDEX idx_tasks_assigned_to ON tasks(assigned_to);
CREATE INDEX idx_tasks_status ON tasks(status);
CREATE INDEX idx_tasks_due ON tasks(due_date);
```

#### 11. media_center (Medya Merkezi)

```sql
CREATE TABLE news_articles (
    id BIGSERIAL PRIMARY KEY,
    journalist_id BIGINT REFERENCES users(id),
    media_organization VARCHAR(100),
    
    title VARCHAR(500) NOT NULL,
    summary TEXT,
    content TEXT NOT NULL,
    
    cover_image_url VARCHAR(500),
    external_url VARCHAR(500),
    
    -- Kategoriler
    category VARCHAR(30), -- 'politics', 'economy', 'sports', etc.
    tags TEXT[],
    
    -- AI Analiz
    ai_bias_score DECIMAL(3,2), -- 0 (tarafsız) - 1 (çok taraflı)
    ai_bias_direction VARCHAR(20), -- 'pro_party_X', 'anti_party_Y', 'neutral'
    ai_fact_checked BOOLEAN DEFAULT FALSE,
    ai_credibility_score DECIMAL(3,2), -- 0-1
    
    -- Etkileşim
    views_count INT DEFAULT 0,
    likes_count INT DEFAULT 0,
    shares_count INT DEFAULT 0,
    
    published_at TIMESTAMP DEFAULT NOW(),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_news_journalist ON news_articles(journalist_id);
CREATE INDEX idx_news_published ON news_articles(published_at DESC);
CREATE INDEX idx_news_category ON news_articles(category);
CREATE INDEX idx_news_tags ON news_articles USING gin(tags);
```

#### 12. polls_system (Anket Sistemi)

```sql
CREATE TABLE polls (
    id BIGSERIAL PRIMARY KEY,
    post_id BIGINT UNIQUE REFERENCES posts(id) ON DELETE CASCADE,
    creator_id BIGINT NOT NULL REFERENCES users(id),
    
    question TEXT NOT NULL,
    options JSONB NOT NULL, -- [{"id": 1, "text": "Evet", "votes": 150}, ...]
    
    allows_multiple_choice BOOLEAN DEFAULT FALSE,
    is_anonymous BOOLEAN DEFAULT TRUE,
    
    starts_at TIMESTAMP DEFAULT NOW(),
    ends_at TIMESTAMP NOT NULL,
    
    total_votes INT DEFAULT 0,
    
    -- Hedef kitle
    target_audience VARCHAR(30) DEFAULT 'public', 
    -- 'public', 'party_members', 'city', 'district'
    target_party_id INT REFERENCES parties(id),
    target_city_id INT REFERENCES cities(id),
    target_district_id INT REFERENCES districts(id),
    
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE poll_votes (
    id BIGSERIAL PRIMARY KEY,
    poll_id BIGINT NOT NULL REFERENCES polls(id) ON DELETE CASCADE,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    option_ids INT[] NOT NULL, -- [1, 3] (multiple choice için)
    
    created_at TIMESTAMP DEFAULT NOW(),
    
    CONSTRAINT unique_poll_vote UNIQUE (poll_id, user_id)
);

CREATE INDEX idx_polls_creator ON polls(creator_id);
CREATE INDEX idx_polls_ends ON polls(ends_at);
CREATE INDEX idx_poll_votes_poll ON poll_votes(poll_id);
```

---

## Neo4j Graph Model

Neo4j, **ilişki analizleri** için kullanılır.

### Node Types

#### 1. User Node

```cypher
CREATE (u:User {
    id: 12345,
    username: "ahmet_yilmaz",
    role: "politician",
    party_id: 1,
    city_id: 34,
    politpuan: 15432.50
})
```

#### 2. Party Node

```cypher
CREATE (p:Party {
    id: 1,
    name: "Örnek Parti",
    member_count: 50000
})
```

#### 3. City/District Node

```cypher
CREATE (c:City {
    id: 34,
    name: "İstanbul",
    population: 15500000
})

CREATE (d:District {
    id: 450,
    name: "Kadıköy",
    city_id: 34
})
```

### Relationship Types

#### 1. FOLLOWS

```cypher
(u1:User)-[:FOLLOWS {since: '2024-01-15'}]->(u2:User)
```

#### 2. MEMBER_OF

```cypher
(u:User)-[:MEMBER_OF {
    role: "delegate",
    level: "district",
    since: '2020-03-10'
}]->(p:Party)
```

#### 3. MANAGES

```cypher
(u:User)-[:MANAGES {
    title: "İl Başkanı",
    level: "city"
}]->(org:Organization)
```

#### 4. LOCATED_IN

```cypher
(u:User)-[:LOCATED_IN]->(c:City)
(u:User)-[:LOCATED_IN]->(d:District)
```

#### 5. INTERACTS_WITH

```cypher
(u1:User)-[:INTERACTS_WITH {
    total_interactions: 250,
    last_interaction: '2024-11-01',
    interaction_types: ['like', 'comment', 'share']
}]->(u2:User)
```

#### 6. SUPPORTS

```cypher
(u:User)-[:SUPPORTS {
    confidence: 0.85,
    inferred_by: "ai_analysis"
}]->(p:Party)
```

### Graph Queries Örnekleri

#### En Etkili Kullanıcıları Bul (PageRank)

```cypher
CALL gds.pageRank.stream('user_network')
YIELD nodeId, score
RETURN gds.util.asNode(nodeId).username AS username, score
ORDER BY score DESC
LIMIT 10
```

#### Parti İçi Ağ Analizi

```cypher
MATCH path = (u1:User)-[:MEMBER_OF]->(p:Party)<-[:MEMBER_OF]-(u2:User)
WHERE p.id = 1
  AND (u1)-[:INTERACTS_WITH]-(u2)
RETURN path
```

#### Influencer'ları Tespit Et

```cypher
MATCH (u:User)
WHERE u.role IN ['politician', 'journalist']
WITH u, size((u)<-[:FOLLOWS]-()) AS followers
WHERE followers > 10000
MATCH (u)-[:INTERACTS_WITH]->(other:User)
WITH u, followers, count(DISTINCT other) AS reach
RETURN u.username, followers, reach, (followers * reach) AS influence_score
ORDER BY influence_score DESC
LIMIT 20
```

#### "Köprü" Kullanıcıları Bul (Betweenness Centrality)

Farklı gruplar arasında bağlantı kuran kullanıcılar:

```cypher
CALL gds.betweenness.stream('user_network')
YIELD nodeId, score
RETURN gds.util.asNode(nodeId).username AS username, score
ORDER BY score DESC
LIMIT 10
```

#### Topluluk Tespiti (Community Detection)

```cypher
CALL gds.louvain.stream('user_network')
YIELD nodeId, communityId
WITH communityId, collect(gds.util.asNode(nodeId).username) AS members
WHERE size(members) > 50
RETURN communityId, size(members) AS member_count, members[0..10] AS sample_members
ORDER BY member_count DESC
```

---

## MongoDB Collections

MongoDB, **log ve analitik veriler** için kullanılır.

### 1. user_activity_logs

```javascript
{
    _id: ObjectId(),
    user_id: 12345,
    event_type: "post_created", // 'post_created', 'login', 'logout', 'profile_view'
    event_data: {
        post_id: 98765,
        content_length: 250,
        media_type: "photo",
        hashtags: ["#ekonomi", "#eğitim"]
    },
    metadata: {
        ip_address: "185.x.x.x",
        user_agent: "Mozilla/5.0...",
        device: "mobile",
        platform: "ios"
    },
    timestamp: ISODate("2024-11-14T10:30:00Z")
}
```

### 2. politpuan_history

```javascript
{
    _id: ObjectId(),
    post_id: 98765,
    author_id: 12345,
    
    // Snapshot her saat
    timestamp: ISODate("2024-11-14T10:00:00Z"),
    
    politpuan: {
        total: 1543.75,
        k1: 385.50,
        k2: 220.00,
        k3: 150.00,
        k4: 500.25,
        k5: 288.00
    },
    
    interactions: {
        views: 5000,
        likes: 250,
        comments: 45,
        shares: 30,
        saves: 15
    }
}
```

### 3. analytics_events

```javascript
{
    _id: ObjectId(),
    event_name: "feed_impression",
    user_id: 12345,
    post_id: 98765,
    
    properties: {
        position: 3, // Feed'de kaçıncı sırada
        feed_type: "following", // 'following', 'trending', 'local'
        scroll_depth: 0.75,
        time_spent: 5.2 // saniye
    },
    
    timestamp: ISODate("2024-11-14T10:30:00Z")
}
```

### 4. ai_analysis_cache

```javascript
{
    _id: ObjectId(),
    content_hash: "abc123def456", // İçeriğin hash'i (tekrar analiz önlemek için)
    
    analysis_type: "sentiment",
    model_version: "bert-turkish-v2",
    
    result: {
        sentiment: {
            positive: 0.15,
            negative: 0.75,
            neutral: 0.10
        },
        emotions: {
            anger: 0.65,
            joy: 0.10,
            fear: 0.15,
            sadness: 0.10
        }
    },
    
    analyzed_at: ISODate("2024-11-14T10:30:00Z"),
    ttl: ISODate("2024-12-14T10:30:00Z") // 30 gün sonra expire
}
```

### 5. trending_topics

```javascript
{
    _id: ObjectId(),
    period: "hourly", // 'hourly', 'daily', 'weekly'
    timestamp: ISODate("2024-11-14T10:00:00Z"),
    
    trends: [
        {
            rank: 1,
            keyword: "#ekonomi",
            type: "hashtag",
            mention_count: 15430,
            unique_users: 8542,
            politpuan_sum: 125430.50,
            sentiment: {
                positive: 0.20,
                negative: 0.65,
                neutral: 0.15
            },
            growth_rate: 2.5 // 2.5x artış
        },
        // ... top 50
    ]
}
```

---

## Elasticsearch İndeksler

### 1. posts_index

```json
{
    "mappings": {
        "properties": {
            "id": {"type": "long"},
            "author_id": {"type": "long"},
            "author_username": {"type": "keyword"},
            "author_full_name": {"type": "text", "analyzer": "turkish"},
            
            "content": {
                "type": "text",
                "analyzer": "turkish",
                "fields": {
                    "keyword": {"type": "keyword"},
                    "suggest": {"type": "completion"}
                }
            },
            
            "hashtags": {"type": "keyword"},
            "mentions": {"type": "long"},
            
            "media_type": {"type": "keyword"},
            "ai_category": {"type": "keyword"},
            "ai_topic": {"type": "keyword"},
            
            "politpuan_total": {"type": "float"},
            "likes_count": {"type": "integer"},
            "created_at": {"type": "date"},
            
            "location": {"type": "geo_point"},
            
            "visibility": {"type": "keyword"},
            "is_deleted": {"type": "boolean"}
        }
    }
}
```

### 2. users_index

```json
{
    "mappings": {
        "properties": {
            "id": {"type": "long"},
            "username": {"type": "keyword"},
            "full_name": {
                "type": "text",
                "analyzer": "turkish",
                "fields": {
                    "keyword": {"type": "keyword"},
                    "suggest": {"type": "completion"}
                }
            },
            "bio": {"type": "text", "analyzer": "turkish"},
            
            "role": {"type": "keyword"},
            "profession": {"type": "keyword"},
            "party_id": {"type": "integer"},
            
            "city": {"type": "keyword"},
            "district": {"type": "keyword"},
            
            "followers_count": {"type": "integer"},
            "politpuan_total": {"type": "float"},
            
            "is_verified": {"type": "boolean"}
        }
    }
}
```

### Arama Örnekleri

#### Gelişmiş Post Arama

```json
{
    "query": {
        "bool": {
            "must": [
                {
                    "multi_match": {
                        "query": "ekonomi politikası",
                        "fields": ["content^2", "author_full_name"],
                        "type": "best_fields",
                        "analyzer": "turkish"
                    }
                }
            ],
            "filter": [
                {"term": {"ai_topic": "economy"}},
                {"range": {"politpuan_total": {"gte": 100}}},
                {"range": {"created_at": {"gte": "now-7d"}}}
            ]
        }
    },
    "sort": [
        {"politpuan_total": "desc"}
    ],
    "aggs": {
        "by_author_role": {
            "terms": {"field": "author_role"}
        },
        "by_sentiment": {
            "terms": {"field": "ai_sentiment"}
        }
    }
}
```

---

## Redis Cache Yapısı

### Key Patterns

```
# User Session
session:{user_id}                    → Hash (user data, permissions)
TTL: 1 day

# PolitPuan Cache
politpuan:post:{post_id}             → String (final score)
politpuan:post:{post_id}:layers      → Hash (k1, k2, k3, k4, k5)
TTL: 5 minutes

# User Profile Cache
user:profile:{user_id}               → Hash (all profile fields)
user:stats:{user_id}                 → Hash (followers, posts, etc.)
TTL: 1 hour

# Feed Cache
feed:user:{user_id}:following        → List (post_ids)
feed:user:{user_id}:trending         → List (post_ids)
feed:global:trending                 → List (post_ids)
TTL: 5 minutes

# Trending Topics
trending:hourly                      → Sorted Set (score = mention_count)
trending:daily                       → Sorted Set
TTL: 1 hour / 1 day

# Rate Limiting
ratelimit:user:{user_id}:posts       → String (count)
TTL: 24 hours

ratelimit:api:{user_id}:{endpoint}   → String (count)
TTL: 1 hour

# Counters
counter:post:{post_id}:views         → String (increment only)
counter:post:{post_id}:likes         → String
No TTL

# Real-time Notifications
notifications:user:{user_id}         → List (notification objects)
TTL: 7 days

# Online Users
online:users                         → Set (user_ids)
TTL: 15 minutes (refresh on activity)
```

### Redis Pub/Sub Channels

```
# Real-time updates
channel:post:{post_id}:updates       → Post etkileşim güncellemeleri
channel:user:{user_id}:notifications → Kullanıcıya özel bildirimler
channel:global:trending              → Trend güncellemeleri
```

---

## İlişkiler ve Constraints

### Foreign Key İlişkileri

```
users
  ↓ (author_id)
posts
  ↓ (post_id)
interactions
  ↑ (user_id)
users

users
  ↓ (follower_id, following_id)
follows
  ↑
users

parties
  ↓ (party_id)
users
  ↓ (author_id)
posts
```

### Cascade Delete Kuralları

```sql
-- User silinirse
users → posts (CASCADE DELETE)
users → interactions (CASCADE DELETE)
users → follows (CASCADE DELETE)
users → messages (CASCADE DELETE)

-- Post silinirse
posts → interactions (CASCADE DELETE)
posts → notifications (SET NULL target_id)

-- Soft delete kullan
UPDATE users SET is_deleted = TRUE WHERE id = 123;
-- Fiziksel silme yerine
```

---

## Data Flow

### Post Oluşturma İşlem Akışı

```
1. Client → API: POST /api/posts
2. API → PostgreSQL: INSERT INTO posts
3. API → Elasticsearch: Index post
4. API → Neo4j: CREATE relationship
5. API → MongoDB: Log activity
6. API → Redis: Invalidate cache
7. API → Message Queue: Publish event
8. Worker → AI Service: Analyze content (async)
9. Worker → PostgreSQL: UPDATE ai_fields
10. Worker → Redis: Cache PolitPuan
11. Worker → Followers: Send notifications
12. Client ← API: Response (post created)
```

### Feed Oluşturma İşlem Akışı

```
1. Client → API: GET /api/feed
2. API → Redis: Check cache
3. If cache miss:
   a. API → PostgreSQL: Query following users
   b. API → Elasticsearch: Search recent posts
   c. API → Redis: Get PolitPuan scores
   d. API → Python Service: Sort by algorithm
   e. API → Redis: Cache result
4. Client ← API: Feed items
```

### Gerçek Zamanlı PolitPuan Güncelleme

```
1. User beğenir bir postu
2. API → PostgreSQL: INSERT interaction
3. API → Redis: Increment counter
4. API → Message Queue: "post.liked" event
5. Worker yakalalar event'i
6. Worker → Recalculate PolitPuan (K1)
7. Worker → PostgreSQL: UPDATE posts.politpuan_*
8. Worker → Redis: Update cache
9. Worker → Elasticsearch: Update index
10. Worker → Redis Pub/Sub: Broadcast update
11. WebSocket → Client: Real-time notification
```

---

## Performans Optimizasyonu

### Database İndeksleme

```sql
-- Composite indexes (sık kullanılan sorgular için)
CREATE INDEX idx_posts_author_created_politpuan 
ON posts(author_id, created_at DESC, politpuan_total DESC);

CREATE INDEX idx_interactions_post_type_created 
ON interactions(post_id, interaction_type, created_at DESC);

-- Partial indexes (sadece aktif veriler)
CREATE INDEX idx_active_users 
ON users(id) WHERE is_active = TRUE AND is_banned = FALSE;

CREATE INDEX idx_visible_posts 
ON posts(id, created_at DESC) 
WHERE is_deleted = FALSE AND visibility = 'public';
```

### Partitioning Strategy

```sql
-- posts tablosu için zaman bazlı partitioning
CREATE TABLE posts (
    ...
) PARTITION BY RANGE (created_at);

CREATE TABLE posts_2024_11 PARTITION OF posts
FOR VALUES FROM ('2024-11-01') TO ('2024-12-01');

CREATE TABLE posts_2024_12 PARTITION OF posts
FOR VALUES FROM ('2024-12-01') TO ('2025-01-01');

-- Eski partitionları archive'a taşı
-- Sık erişilen son 3 ay SSD'de, eski veriler HDD'de
```

### Query Optimization Örnekleri

```sql
-- Kötü: Full table scan
SELECT * FROM posts WHERE content LIKE '%ekonomi%';

-- İyi: Full-text search index kullan
SELECT * FROM posts 
WHERE to_tsvector('turkish', content) @@ to_tsquery('turkish', 'ekonomi');

---

-- Kötü: N+1 problem
SELECT * FROM posts WHERE author_id IN (
    SELECT following_id FROM follows WHERE follower_id = 123
);

-- İyi: JOIN kullan
SELECT p.* FROM posts p
INNER JOIN follows f ON f.following_id = p.author_id
WHERE f.follower_id = 123;
```

---

## Backup ve Recovery

### Backup Stratejisi

```bash
# PostgreSQL - Günlük full backup + sürekli WAL archiving
pg_basebackup -D /backup/postgres/$(date +%Y%m%d)

# MongoDB - Günlük snapshot
mongodump --out /backup/mongo/$(date +%Y%m%d)

# Redis - RDB snapshot her 5 dakikada
save 300 10

# Elasticsearch - Snapshot repository
PUT _snapshot/backup_repository/snapshot_$(date +%Y%m%d)
```

---

**Sonraki Dokümantasyon**: [04-PAGE-STRUCTURES.md](./04-PAGE-STRUCTURES.md)
