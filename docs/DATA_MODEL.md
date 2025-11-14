# Veri Modeli Dokümantasyonu

## ERD (Entity Relationship Diagram)

```
┌─────────────┐         ┌─────────────┐         ┌─────────────┐
│    User     │─────────│    Role     │─────────│  Permission │
└─────────────┘         └─────────────┘         └─────────────┘
      │                        │
      │                        │
      ├────────────────────────┼────────────────────────┐
      │                        │                        │
      ▼                        ▼                        ▼
┌─────────────┐         ┌─────────────┐         ┌─────────────┐
│    Post     │         │  Location   │         │    Party    │
└─────────────┘         └─────────────┘         └─────────────┘
      │                        │                        │
      │                        │                        │
      ├────────────────────────┼────────────────────────┤
      │                        │                        │
      ▼                        ▼                        ▼
┌─────────────┐         ┌─────────────┐         ┌─────────────┐
│ Interaction │         │ Organization│         │  Analytics  │
└─────────────┘         └─────────────┘         └─────────────┘
```

## Graph Database Model (Neo4j)

### Node Types
- User
- Post
- Party
- Location (City/District/Neighborhood/BallotBox)
- Organization
- Media
- Agenda
- Topic

### Relationship Types
- FOLLOWS
- LIKES
- COMMENTS
- SHARES
- BELONGS_TO (Party)
- LOCATED_IN (Location)
- PART_OF (Organization)
- MENTIONS
- TRENDS_IN

## TypeScript Type Definitions

```typescript
// User Types
enum UserRole {
  CITIZEN = 'citizen',
  VERIFIED_CITIZEN = 'verified_citizen',
  PARTY_MEMBER = 'party_member',
  POLITICIAN_DISTRICT = 'politician_district',
  POLITICIAN_CITY = 'politician_city',
  POLITICIAN_NATIONAL = 'politician_national',
  MP = 'mp',
  JOURNALIST = 'journalist',
  DISTRICT_CHAIRMAN = 'district_chairman',
  CITY_CHAIRMAN = 'city_chairman',
  WOMEN_BRANCH = 'women_branch',
  YOUTH_BRANCH = 'youth_branch',
  PARTY_ADMIN = 'party_admin',
  SYSTEM_ADMIN = 'system_admin'
}

enum VerificationStatus {
  UNVERIFIED = 'unverified',
  VERIFIED = 'verified',
  PENDING = 'pending'
}

interface User {
  id: string;
  email: string;
  username: string;
  fullName: string;
  role: UserRole;
  verificationStatus: VerificationStatus;
  profilePicture?: string;
  bio?: string;
  
  // Location
  cityId: string;
  districtId: string;
  neighborhoodId?: string;
  ballotBoxId?: string;
  
  // Professional
  profession?: string;
  ageGroup?: string;
  
  // Party
  partyId?: string;
  partyMembershipDate?: Date;
  partyPosition?: string;
  
  // Politician specific
  electionDistrict?: string;
  position?: string; // İlçe Başkanı, İl Başkanı, etc.
  
  // MP specific
  parliamentTerm?: number;
  commissionMemberships?: string[];
  
  // Stats
  followerCount: number;
  followingCount: number;
  postCount: number;
  politPuan: number;
  politPuanHistory: PolitPuanHistory[];
  
  // Settings
  visibilitySettings: VisibilitySettings;
  notificationSettings: NotificationSettings;
  
  createdAt: Date;
  updatedAt: Date;
}

interface VisibilitySettings {
  profileVisibility: 'public' | 'party' | 'private';
  postVisibility: 'public' | 'party' | 'followers' | 'private';
  analyticsVisibility: 'public' | 'party' | 'private';
}

// Post Types
enum PostType {
  TEXT = 'text',
  PHOTO = 'photo',
  VIDEO = 'video',
  LIVE = 'live',
  POLL = 'poll',
  DOCUMENT = 'document'
}

enum ContentCategory {
  SUPPORTIVE = 'supportive',
  INFORMATIVE = 'informative',
  CRITICAL = 'critical',
  CONTROVERSIAL = 'controversial',
  CRISIS = 'crisis'
}

enum TopicCategory {
  ECONOMY = 'economy',
  FOREIGN_POLICY = 'foreign_policy',
  SECURITY = 'security',
  EDUCATION = 'education',
  HEALTH = 'health',
  ENVIRONMENT = 'environment',
  CULTURE = 'culture',
  SPORTS = 'sports',
  OTHER = 'other'
}

interface Post {
  id: string;
  authorId: string;
  type: PostType;
  
  // Content
  content: string;
  mediaUrls?: string[];
  pollOptions?: PollOption[];
  
  // Categorization
  category: ContentCategory;
  topicCategory: TopicCategory;
  tags: string[];
  
  // AI Analysis
  sentimentScore?: number; // -1 to 1
  tensionScore?: number; // 0 to 1
  partisanshipScore?: number; // 0 to 1
  viralPotential?: number; // 0 to 1
  
  // Location
  locationId?: string;
  isLocal: boolean;
  
  // Party
  partyId?: string;
  isPartyContent: boolean;
  
  // Engagement
  likeCount: number;
  commentCount: number;
  shareCount: number;
  viewCount: number;
  
  // PolitPuan
  politPuan: number;
  politPuanBreakdown: PolitPuanBreakdown;
  
  // Visibility
  visibility: 'public' | 'party' | 'followers' | 'private';
  targetAudience?: string[]; // Role-based targeting
  
  // Moderation
  isModerated: boolean;
  moderationReason?: string;
  
  createdAt: Date;
  updatedAt: Date;
}

interface PollOption {
  id: string;
  text: string;
  voteCount: number;
}

// Interaction Types
interface Like {
  id: string;
  userId: string;
  postId: string;
  createdAt: Date;
}

interface Comment {
  id: string;
  userId: string;
  postId: string;
  content: string;
  parentCommentId?: string; // For replies
  likeCount: number;
  politPuan: number;
  createdAt: Date;
  updatedAt: Date;
}

interface Share {
  id: string;
  userId: string;
  postId: string;
  comment?: string;
  createdAt: Date;
}

// Party Types
interface Party {
  id: string;
  name: string;
  shortName: string;
  logo: string;
  color: string; // Primary color
  description: string;
  history?: string;
  charter?: string; // Tüzük
  
  // Leadership
  leaderId: string;
  adminIds: string[];
  
  // Stats
  memberCount: number;
  organizationCount: number;
  mpCount: number;
  
  // Location strength
  cityStrength: Map<string, number>; // cityId -> strength score
  
  createdAt: Date;
  updatedAt: Date;
}

// Location Types
interface City {
  id: string;
  name: string;
  code: string; // Plate code
  population: number;
  coordinates: {
    lat: number;
    lng: number;
  };
}

interface District {
  id: string;
  cityId: string;
  name: string;
  population: number;
  coordinates: {
    lat: number;
    lng: number;
  };
}

interface Neighborhood {
  id: string;
  districtId: string;
  name: string;
  population: number;
}

interface BallotBox {
  id: string;
  neighborhoodId: string;
  number: number;
  voterCount: number;
}

// Organization Types
interface Organization {
  id: string;
  partyId: string;
  type: 'city' | 'district' | 'women_branch' | 'youth_branch';
  locationId: string;
  
  // Leadership
  chairmanId: string;
  viceChairmanIds: string[];
  memberIds: string[];
  
  // Stats
  memberCount: number;
  activityScore: number;
  
  createdAt: Date;
  updatedAt: Date;
}

// Media Types
interface Media {
  id: string;
  title: string;
  content: string;
  source: string;
  url: string;
  authorId?: string; // Journalist
  
  // Categorization
  category: string;
  tags: string[];
  
  // Fact-check
  factCheckStatus: 'verified' | 'disputed' | 'false' | 'pending';
  factCheckScore?: number;
  
  // Related
  relatedPostIds: string[];
  mentionedUserIds: string[];
  mentionedPartyIds: string[];
  
  publishedAt: Date;
  createdAt: Date;
}

// Agenda Types
interface Agenda {
  id: string;
  title: string;
  description: string;
  category: 'national' | 'party' | 'regional' | 'civic' | 'complaint';
  
  // Location
  locationId?: string;
  
  // Related
  relatedPostIds: string[];
  relatedMediaIds: string[];
  mentionedPartyIds: string[];
  
  // AI Analysis
  sentimentScore: number;
  tensionScore: number;
  trendScore: number;
  
  // Engagement
  discussionCount: number;
  viewCount: number;
  
  createdAt: Date;
  updatedAt: Date;
}

// Analytics Types
interface UserAnalytics {
  userId: string;
  period: 'daily' | 'weekly' | 'monthly' | 'yearly';
  
  // Engagement
  postCount: number;
  likeCount: number;
  commentCount: number;
  shareCount: number;
  viewCount: number;
  
  // PolitPuan
  politPuan: number;
  politPuanChange: number;
  politPuanRank: number;
  
  // Audience
  followerGrowth: number;
  engagementRate: number;
  reach: number;
  impressions: number;
  
  // Content Performance
  topPosts: string[]; // Post IDs
  bestPerformingCategory: ContentCategory;
  bestPerformingTime: string; // Hour of day
  
  // Sentiment
  averageSentiment: number;
  sentimentDistribution: Map<ContentCategory, number>;
  
  // Comparison
  competitorComparison?: CompetitorComparison;
  
  date: Date;
}

interface CompetitorComparison {
  userId: string;
  competitorIds: string[];
  metrics: {
    politPuan: number;
    followerCount: number;
    engagementRate: number;
    postCount: number;
  };
}

// PolitPuan Types
interface PolitPuanBreakdown {
  layer1: number; // Basic interaction
  layer2: number; // User influence profile
  layer3: number; // Content type
  layer4: number; // Political tension
  layer5: number; // Timing and trend
  total: number;
}

interface PolitPuanHistory {
  date: Date;
  value: number;
  breakdown: PolitPuanBreakdown;
}

// Notification Types
enum NotificationType {
  LIKE = 'like',
  COMMENT = 'comment',
  SHARE = 'share',
  FOLLOW = 'follow',
  MENTION = 'mention',
  MESSAGE = 'message',
  PARTY_ANNOUNCEMENT = 'party_announcement',
  AGENDA_UPDATE = 'agenda_update',
  TASK_REMINDER = 'task_reminder'
}

interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  relatedId?: string; // Post ID, User ID, etc.
  isRead: boolean;
  createdAt: Date;
}

// Task Types (for Party Members)
interface Task {
  id: string;
  organizationId: string;
  assignedToId: string;
  assignedById: string;
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  dueDate: Date;
  completedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

// Complaint/Suggestion Types
interface Complaint {
  id: string;
  userId: string;
  locationId: string;
  category: string;
  title: string;
  description: string;
  status: 'pending' | 'in_review' | 'resolved' | 'rejected';
  assignedToId?: string; // Politician/Representative
  resolution?: string;
  createdAt: Date;
  updatedAt: Date;
}

// Election Types
interface Election {
  id: string;
  type: 'general' | 'local' | 'presidential';
  date: Date;
  results: ElectionResult[];
}

interface ElectionResult {
  locationId: string;
  partyId: string;
  voteCount: number;
  votePercentage: number;
}
```
