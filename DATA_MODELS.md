# 🗄️ Veri Modelleri - Detaylı Dokümantasyon

## Database Schema (PostgreSQL)

### Users Table

```sql
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    phone VARCHAR(20) UNIQUE,
    tc_kimlik_no_encrypted BYTEA, -- AES-256 encrypted
    role VARCHAR(50) NOT NULL,
    verification_status VARCHAR(50) NOT NULL DEFAULT 'unverified',
    password_hash VARCHAR(255) NOT NULL,
    two_factor_enabled BOOLEAN DEFAULT FALSE,
    two_factor_secret VARCHAR(255),
    last_login_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    deleted_at TIMESTAMP,
    
    CONSTRAINT users_role_check CHECK (role IN (
        'citizen', 'verified_citizen', 'party_member', 
        'politician', 'mp', 'journalist', 
        'org_leader', 'party_admin', 'system_admin'
    ))
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_verification_status ON users(verification_status);
```

### User Profiles Table

```sql
CREATE TABLE user_profiles (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    birth_date DATE,
    gender VARCHAR(20),
    profession VARCHAR(100),
    education VARCHAR(100),
    city VARCHAR(100) NOT NULL,
    district VARCHAR(100) NOT NULL,
    neighborhood VARCHAR(100),
    polling_station VARCHAR(100),
    political_tendency DECIMAL(3,2), -- -1.00 to 1.00, AI predicted
    avatar_url TEXT,
    bio TEXT,
    website_url TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_user_profiles_city ON user_profiles(city);
CREATE INDEX idx_user_profiles_district ON user_profiles(district);
CREATE INDEX idx_user_profiles_profession ON user_profiles(profession);
```

### Parties Table

```sql
CREATE TABLE parties (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL UNIQUE,
    short_name VARCHAR(50) NOT NULL UNIQUE,
    color VARCHAR(7) NOT NULL, -- Hex color code
    logo_url TEXT,
    founded_date DATE,
    headquarters_address TEXT,
    headquarters_city VARCHAR(100),
    description TEXT,
    website_url TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
```

### Party Memberships Table

```sql
CREATE TABLE party_memberships (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    party_id UUID NOT NULL REFERENCES parties(id) ON DELETE CASCADE,
    membership_date DATE NOT NULL,
    membership_level VARCHAR(50) NOT NULL,
    position VARCHAR(100),
    branch VARCHAR(100), -- Şube
    status VARCHAR(50) NOT NULL DEFAULT 'active',
    hierarchy_level INTEGER, -- 1-10
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    UNIQUE(user_id, party_id),
    CONSTRAINT party_memberships_status_check CHECK (status IN ('active', 'inactive', 'suspended'))
);

CREATE INDEX idx_party_memberships_user ON party_memberships(user_id);
CREATE INDEX idx_party_memberships_party ON party_memberships(party_id);
CREATE INDEX idx_party_memberships_status ON party_memberships(status);
```

### Posts Table

```sql
CREATE TABLE posts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    content_type VARCHAR(50) NOT NULL,
    media_urls JSONB, -- Array of URLs
    visibility VARCHAR(50) NOT NULL DEFAULT 'public',
    location_city VARCHAR(100),
    location_district VARCHAR(100),
    ai_analysis JSONB, -- Full AI analysis object
    polit_puan INTEGER DEFAULT 0,
    interaction_counts JSONB DEFAULT '{"likes": 0, "comments": 0, "shares": 0, "saves": 0}',
    is_pinned BOOLEAN DEFAULT FALSE,
    is_deleted BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    CONSTRAINT posts_content_type_check CHECK (content_type IN (
        'text', 'image', 'video', 'live', 'poll', 'link', 'document'
    )),
    CONSTRAINT posts_visibility_check CHECK (visibility IN (
        'public', 'party', 'private'
    ))
);

CREATE INDEX idx_posts_user ON posts(user_id);
CREATE INDEX idx_posts_created_at ON posts(created_at DESC);
CREATE INDEX idx_posts_polit_puan ON posts(polit_puan DESC);
CREATE INDEX idx_posts_visibility ON posts(visibility);
CREATE INDEX idx_posts_location ON posts(location_city, location_district);
CREATE INDEX idx_posts_content_type ON posts(content_type);
CREATE INDEX idx_posts_ai_analysis ON posts USING GIN(ai_analysis); -- GIN index for JSONB
```

### Interactions Table

```sql
CREATE TABLE interactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL,
    content TEXT, -- For comments
    parent_comment_id UUID REFERENCES interactions(id), -- For nested comments
    is_deleted BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    CONSTRAINT interactions_type_check CHECK (type IN (
        'like', 'comment', 'share', 'save'
    )),
    UNIQUE(post_id, user_id, type) -- One interaction per type per user per post
);

CREATE INDEX idx_interactions_post ON interactions(post_id);
CREATE INDEX idx_interactions_user ON interactions(user_id);
CREATE INDEX idx_interactions_type ON interactions(type);
CREATE INDEX idx_interactions_created_at ON interactions(created_at DESC);
CREATE INDEX idx_interactions_parent ON interactions(parent_comment_id);
```

### PolitPuan History Table

```sql
CREATE TABLE politpuan_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    post_id UUID REFERENCES posts(id) ON DELETE SET NULL, -- NULL for user-level score
    score INTEGER NOT NULL,
    layer1_score INTEGER,
    layer2_score INTEGER,
    layer3_score INTEGER,
    layer4_score INTEGER,
    layer5_score INTEGER,
    role_multiplier DECIMAL(3,2),
    base_score INTEGER,
    period VARCHAR(50) NOT NULL, -- 'realtime', 'daily', 'weekly', 'monthly'
    calculated_at TIMESTAMP DEFAULT NOW(),
    
    CONSTRAINT politpuan_history_period_check CHECK (period IN (
        'realtime', 'daily', 'weekly', 'monthly'
    ))
);

CREATE INDEX idx_politpuan_history_user ON politpuan_history(user_id);
CREATE INDEX idx_politpuan_history_post ON politpuan_history(post_id);
CREATE INDEX idx_politpuan_history_calculated_at ON politpuan_history(calculated_at DESC);
CREATE INDEX idx_politpuan_history_period ON politpuan_history(period);
```

### Organizations Table

```sql
CREATE TABLE organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    party_id UUID NOT NULL REFERENCES parties(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL,
    parent_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
    name VARCHAR(255) NOT NULL,
    leader_id UUID REFERENCES users(id) ON DELETE SET NULL,
    member_count INTEGER DEFAULT 0,
    active_member_count INTEGER DEFAULT 0,
    location_coordinates POINT, -- PostGIS point
    location_city VARCHAR(100) NOT NULL,
    location_district VARCHAR(100),
    location_neighborhood VARCHAR(100),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    CONSTRAINT organizations_type_check CHECK (type IN (
        'province', 'district', 'neighborhood', 'polling_station',
        'women_branch', 'youth_branch', 'headquarters'
    ))
);

CREATE INDEX idx_organizations_party ON organizations(party_id);
CREATE INDEX idx_organizations_parent ON organizations(parent_id);
CREATE INDEX idx_organizations_type ON organizations(type);
CREATE INDEX idx_organizations_location ON organizations USING GIST(location_coordinates);
CREATE INDEX idx_organizations_city ON organizations(location_city);
```

### Organization Members Table

```sql
CREATE TABLE organization_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role VARCHAR(100),
    position VARCHAR(100),
    joined_at DATE NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'active',
    created_at TIMESTAMP DEFAULT NOW(),
    
    UNIQUE(organization_id, user_id),
    CONSTRAINT organization_members_status_check CHECK (status IN (
        'active', 'inactive', 'suspended'
    ))
);

CREATE INDEX idx_org_members_org ON organization_members(organization_id);
CREATE INDEX idx_org_members_user ON organization_members(user_id);
```

### Media Articles Table

```sql
CREATE TABLE media_articles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(500) NOT NULL,
    content TEXT NOT NULL,
    source VARCHAR(255) NOT NULL,
    source_url TEXT NOT NULL,
    author_id UUID REFERENCES users(id) ON DELETE SET NULL, -- Journalist
    published_at TIMESTAMP NOT NULL,
    fact_check_status VARCHAR(50),
    fact_check_score DECIMAL(3,2), -- 0.00 to 1.00
    ai_analysis JSONB,
    related_party_ids UUID[], -- Array of party IDs
    image_url TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    CONSTRAINT media_articles_fact_check_status_check CHECK (fact_check_status IN (
        'verified', 'partially_verified', 'unverified', 'false'
    ))
);

CREATE INDEX idx_media_articles_published_at ON media_articles(published_at DESC);
CREATE INDEX idx_media_articles_source ON media_articles(source);
CREATE INDEX idx_media_articles_author ON media_articles(author_id);
CREATE INDEX idx_media_articles_fact_check ON media_articles(fact_check_status);
CREATE INDEX idx_media_articles_related_parties ON media_articles USING GIN(related_party_ids);
```

### Agendas Table

```sql
CREATE TABLE agendas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(500) NOT NULL,
    description TEXT,
    category VARCHAR(50) NOT NULL,
    priority INTEGER DEFAULT 0,
    related_post_ids UUID[],
    related_media_ids UUID[],
    ai_generated BOOLEAN DEFAULT FALSE,
    trend_score DECIMAL(5,2),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    CONSTRAINT agendas_category_check CHECK (category IN (
        'national', 'party', 'regional', 'citizen', 'civil_society'
    ))
);

CREATE INDEX idx_agendas_category ON agendas(category);
CREATE INDEX idx_agendas_priority ON agendas(priority DESC);
CREATE INDEX idx_agendas_trend_score ON agendas(trend_score DESC);
CREATE INDEX idx_agendas_created_at ON agendas(created_at DESC);
```

### Analytics Table

```sql
CREATE TABLE analytics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    metric_type VARCHAR(100) NOT NULL,
    metric_value DECIMAL(15,2) NOT NULL,
    period VARCHAR(50) NOT NULL, -- 'daily', 'weekly', 'monthly'
    dimension JSONB, -- Additional dimensions
    calculated_at TIMESTAMP DEFAULT NOW(),
    
    CONSTRAINT analytics_period_check CHECK (period IN (
        'daily', 'weekly', 'monthly', 'yearly'
    ))
);

CREATE INDEX idx_analytics_user ON analytics(user_id);
CREATE INDEX idx_analytics_org ON analytics(organization_id);
CREATE INDEX idx_analytics_metric_type ON analytics(metric_type);
CREATE INDEX idx_analytics_period ON analytics(period);
CREATE INDEX idx_analytics_calculated_at ON analytics(calculated_at DESC);
```

### Follows Table

```sql
CREATE TABLE follows (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    follower_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    following_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT NOW(),
    
    UNIQUE(follower_id, following_id),
    CONSTRAINT follows_no_self_follow CHECK (follower_id != following_id)
);

CREATE INDEX idx_follows_follower ON follows(follower_id);
CREATE INDEX idx_follows_following ON follows(following_id);
```

### Notifications Table

```sql
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT,
    related_entity_type VARCHAR(50), -- 'post', 'user', 'organization', etc.
    related_entity_id UUID,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW(),
    
    CONSTRAINT notifications_type_check CHECK (type IN (
        'new_follower', 'new_comment', 'new_like', 'new_share',
        'politpuan_update', 'agenda_update', 'party_announcement',
        'task_assigned', 'live_started'
    ))
);

CREATE INDEX idx_notifications_user ON notifications(user_id);
CREATE INDEX idx_notifications_is_read ON notifications(is_read);
CREATE INDEX idx_notifications_created_at ON notifications(created_at DESC);
```

---

## Graph Database Schema (Neo4j)

### Node Labels

- `User`
- `Post`
- `Party`
- `Organization`
- `Location` (City, District, Neighborhood)
- `Topic`
- `MediaArticle`
- `Agenda`

### Relationships

```cypher
// User relationships
(User)-[:FOLLOWS]->(User)
(User)-[:MEMBER_OF]->(Party)
(User)-[:LEADS]->(Organization)
(User)-[:LOCATED_IN]->(Location)
(User)-[:INTERACTED_WITH]->(Post)
(User)-[:MENTIONED_IN]->(Post)

// Post relationships
(Post)-[:CREATED_BY]->(User)
(Post)-[:ABOUT]->(Topic)
(Post)-[:MENTIONS]->(User)
(Post)-[:RELATED_TO]->(Post)
(Post)-[:TRENDING_IN]->(Location)
(Post)-[:PART_OF_AGENDA]->(Agenda)

// Organization relationships
(Organization)-[:PART_OF]->(Organization)
(Organization)-[:LOCATED_IN]->(Location)
(Organization)-[:BELONGS_TO_PARTY]->(Party)

// Media relationships
(MediaArticle)-[:ABOUT]->(Topic)
(MediaArticle)-[:MENTIONS]->(User)
(MediaArticle)-[:RELATED_TO_PARTY]->(Party)
```

### Example Queries

```cypher
// Find influential users in a location
MATCH (u:User)-[:LOCATED_IN]->(l:Location {city: 'Istanbul'})
MATCH (u)-[:CREATED_BY]->(p:Post)
WHERE p.politPuan > 1000
RETURN u, COUNT(p) as postCount, AVG(p.politPuan) as avgPolitPuan
ORDER BY avgPolitPuan DESC
LIMIT 10

// Find trending topics in a party
MATCH (p:Post)-[:CREATED_BY]->(u:User)-[:MEMBER_OF]->(party:Party {name: 'AK Parti'})
MATCH (p)-[:ABOUT]->(t:Topic)
WHERE p.createdAt > datetime() - duration({days: 7})
RETURN t.name, COUNT(p) as postCount, AVG(p.politPuan) as avgScore
ORDER BY postCount DESC
LIMIT 10

// Find organization hierarchy
MATCH path = (org:Organization)-[:PART_OF*]->(parent:Organization)
WHERE org.id = $orgId
RETURN path
```

---

## TypeScript Type Definitions

### Core Types

```typescript
// types/common.ts
export type UUID = string;
export type Timestamp = Date;

export interface BaseEntity {
  id: UUID;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// types/user.ts
export enum UserRole {
  CITIZEN = 'citizen',
  VERIFIED_CITIZEN = 'verified_citizen',
  PARTY_MEMBER = 'party_member',
  POLITICIAN = 'politician',
  MP = 'mp',
  JOURNALIST = 'journalist',
  ORG_LEADER = 'org_leader',
  PARTY_ADMIN = 'party_admin',
  SYSTEM_ADMIN = 'system_admin'
}

export enum VerificationStatus {
  UNVERIFIED = 'unverified',
  EMAIL_VERIFIED = 'email_verified',
  PHONE_VERIFIED = 'phone_verified',
  ID_VERIFIED = 'id_verified', // TC Kimlik + e-Devlet
  FULLY_VERIFIED = 'fully_verified'
}

export interface User extends BaseEntity {
  email: string;
  phone?: string;
  tcKimlikNo?: string; // Encrypted
  role: UserRole;
  verificationStatus: VerificationStatus;
  twoFactorEnabled: boolean;
  lastLoginAt?: Timestamp;
}

export interface UserProfile extends BaseEntity {
  userId: UUID;
  firstName: string;
  lastName: string;
  birthDate?: Date;
  gender?: 'male' | 'female' | 'other';
  profession?: string;
  education?: string;
  city: string;
  district: string;
  neighborhood?: string;
  pollingStation?: string;
  politicalTendency?: number; // -1.00 to 1.00
  avatarUrl?: string;
  bio?: string;
  websiteUrl?: string;
}

// types/post.ts
export enum ContentType {
  TEXT = 'text',
  IMAGE = 'image',
  VIDEO = 'video',
  LIVE = 'live',
  POLL = 'poll',
  LINK = 'link',
  DOCUMENT = 'document'
}

export enum Visibility {
  PUBLIC = 'public',
  PARTY = 'party',
  PRIVATE = 'private'
}

export interface AIAnalysis {
  sentiment: {
    label: 'positive' | 'neutral' | 'negative' | 'aggressive';
    score: number;
  };
  topic: {
    category: string;
    subcategory?: string;
    confidence: number;
  };
  controversy: {
    score: number; // 0-1
    factors: string[];
  };
  tension: {
    level: 'low' | 'medium' | 'high' | 'critical';
    score: number;
  };
  politicalAlignment?: {
    score: number; // -1 to 1
    confidence: number;
  };
}

export interface Post extends BaseEntity {
  userId: UUID;
  content: string;
  contentType: ContentType;
  mediaUrls?: string[];
  visibility: Visibility;
  location?: {
    city: string;
    district: string;
  };
  aiAnalysis?: AIAnalysis;
  politPuan: number;
  interactionCounts: {
    likes: number;
    comments: number;
    shares: number;
    saves: number;
  };
  isPinned: boolean;
  isDeleted: boolean;
}

// types/interaction.ts
export enum InteractionType {
  LIKE = 'like',
  COMMENT = 'comment',
  SHARE = 'share',
  SAVE = 'save'
}

export interface Interaction extends BaseEntity {
  postId: UUID;
  userId: UUID;
  type: InteractionType;
  content?: string; // For comments
  parentCommentId?: UUID;
  isDeleted: boolean;
}

// types/party.ts
export interface Party extends BaseEntity {
  name: string;
  shortName: string;
  color: string; // Hex
  logoUrl?: string;
  foundedDate?: Date;
  headquartersAddress?: string;
  headquartersCity?: string;
  description?: string;
  websiteUrl?: string;
}

export interface PartyMembership extends BaseEntity {
  userId: UUID;
  partyId: UUID;
  membershipDate: Date;
  membershipLevel: string;
  position?: string;
  branch?: string;
  status: 'active' | 'inactive' | 'suspended';
  hierarchyLevel?: number;
}

// types/organization.ts
export enum OrganizationType {
  PROVINCE = 'province',
  DISTRICT = 'district',
  NEIGHBORHOOD = 'neighborhood',
  POLLING_STATION = 'polling_station',
  WOMEN_BRANCH = 'women_branch',
  YOUTH_BRANCH = 'youth_branch',
  HEADQUARTERS = 'headquarters'
}

export interface Organization extends BaseEntity {
  partyId: UUID;
  type: OrganizationType;
  parentId?: UUID;
  name: string;
  leaderId?: UUID;
  memberCount: number;
  activeMemberCount: number;
  location: {
    coordinates: [number, number]; // [longitude, latitude]
    city: string;
    district?: string;
    neighborhood?: string;
  };
}

// types/politpuan.ts
export enum PolitPuanPeriod {
  REALTIME = 'realtime',
  DAILY = 'daily',
  WEEKLY = 'weekly',
  MONTHLY = 'monthly'
}

export interface PolitPuanHistory extends BaseEntity {
  userId: UUID;
  postId?: UUID;
  score: number;
  layer1Score?: number;
  layer2Score?: number;
  layer3Score?: number;
  layer4Score?: number;
  layer5Score?: number;
  roleMultiplier?: number;
  baseScore?: number;
  period: PolitPuanPeriod;
  calculatedAt: Timestamp;
}

// types/media.ts
export enum FactCheckStatus {
  VERIFIED = 'verified',
  PARTIALLY_VERIFIED = 'partially_verified',
  UNVERIFIED = 'unverified',
  FALSE = 'false'
}

export interface MediaArticle extends BaseEntity {
  title: string;
  content: string;
  source: string;
  sourceUrl: string;
  authorId?: UUID;
  publishedAt: Timestamp;
  factCheckStatus?: FactCheckStatus;
  factCheckScore?: number; // 0-1
  aiAnalysis?: AIAnalysis;
  relatedPartyIds: UUID[];
  imageUrl?: string;
}

// types/agenda.ts
export enum AgendaCategory {
  NATIONAL = 'national',
  PARTY = 'party',
  REGIONAL = 'regional',
  CITIZEN = 'citizen',
  CIVIL_SOCIETY = 'civil_society'
}

export interface Agenda extends BaseEntity {
  title: string;
  description?: string;
  category: AgendaCategory;
  priority: number;
  relatedPostIds: UUID[];
  relatedMediaIds: UUID[];
  aiGenerated: boolean;
  trendScore?: number;
}

// types/analytics.ts
export enum AnalyticsPeriod {
  DAILY = 'daily',
  WEEKLY = 'weekly',
  MONTHLY = 'monthly',
  YEARLY = 'yearly'
}

export interface Analytics extends BaseEntity {
  userId?: UUID;
  organizationId?: UUID;
  metricType: string;
  metricValue: number;
  period: AnalyticsPeriod;
  dimension?: Record<string, any>;
  calculatedAt: Timestamp;
}
```

---

## Database Migrations

### Migration Example (using TypeORM)

```typescript
// migrations/001-initial-schema.ts
import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialSchema1234567890 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Users table
    await queryRunner.query(`
      CREATE TABLE users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        email VARCHAR(255) UNIQUE NOT NULL,
        -- ... other columns
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);
    
    // ... other tables
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS users CASCADE;`);
    // ... drop other tables
  }
}
```

---

## Data Validation

### Zod Schemas

```typescript
import { z } from 'zod';

export const UserSchema = z.object({
  email: z.string().email(),
  phone: z.string().regex(/^\+90\d{10}$/).optional(),
  role: z.enum(['citizen', 'verified_citizen', 'party_member', /* ... */]),
  verificationStatus: z.enum(['unverified', 'email_verified', /* ... */])
});

export const PostSchema = z.object({
  content: z.string().min(1).max(5000),
  contentType: z.enum(['text', 'image', 'video', /* ... */]),
  visibility: z.enum(['public', 'party', 'private']),
  location: z.object({
    city: z.string(),
    district: z.string()
  }).optional()
});
```

---

*Bu dokümantasyon, platformun tüm veri modellerini içermektedir. Database şemaları, TypeScript tipleri ve validasyon kuralları bu dokümantasyona göre implement edilmelidir.*
