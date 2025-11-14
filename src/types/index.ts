// User Types
export enum UserRole {
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

export enum VerificationStatus {
  UNVERIFIED = 'unverified',
  VERIFIED = 'verified',
  PENDING = 'pending'
}

export interface User {
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
  position?: string;
  
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

export interface VisibilitySettings {
  profileVisibility: 'public' | 'party' | 'private';
  postVisibility: 'public' | 'party' | 'followers' | 'private';
  analyticsVisibility: 'public' | 'party' | 'private';
}

export interface NotificationSettings {
  email: boolean;
  push: boolean;
  sms: boolean;
  inApp: boolean;
}

// Post Types
export enum PostType {
  TEXT = 'text',
  PHOTO = 'photo',
  VIDEO = 'video',
  LIVE = 'live',
  POLL = 'poll',
  DOCUMENT = 'document'
}

export enum ContentCategory {
  SUPPORTIVE = 'supportive',
  INFORMATIVE = 'informative',
  CRITICAL = 'critical',
  CONTROVERSIAL = 'controversial',
  CRISIS = 'crisis'
}

export enum TopicCategory {
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

export interface Post {
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
  sentimentScore?: number;
  tensionScore?: number;
  partisanshipScore?: number;
  viralPotential?: number;
  
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
  targetAudience?: string[];
  
  // Moderation
  isModerated: boolean;
  moderationReason?: string;
  
  createdAt: Date;
  updatedAt: Date;
}

export interface PollOption {
  id: string;
  text: string;
  voteCount: number;
}

// PolitPuan Types
export interface PolitPuanBreakdown {
  layer1: number;
  layer2: number;
  layer3: number;
  layer4: number;
  layer5: number;
  total: number;
}

export interface PolitPuanHistory {
  date: Date;
  value: number;
  breakdown: PolitPuanBreakdown;
}

// Party Types
export interface Party {
  id: string;
  name: string;
  shortName: string;
  logo: string;
  color: string;
  description: string;
  history?: string;
  charter?: string;
  
  leaderId: string;
  adminIds: string[];
  
  memberCount: number;
  organizationCount: number;
  mpCount: number;
  
  cityStrength: Record<string, number>;
  
  createdAt: Date;
  updatedAt: Date;
}

// Location Types
export interface Location {
  id: string;
  type: 'country' | 'city' | 'district' | 'neighborhood' | 'ballot_box';
  name: string;
  code?: string;
  parentId?: string;
  
  coordinates: {
    lat: number;
    lng: number;
  };
  
  population: number;
  voterCount?: number;
  
  partyStrength: Record<string, number>;
  
  activityScore: number;
  agendaHeatScore: number;
  citizenFeedbackScore: number;
  
  createdAt: Date;
  updatedAt: Date;
}

// Organization Types
export interface Organization {
  id: string;
  partyId: string;
  type: 'city' | 'district' | 'women_branch' | 'youth_branch' | 'national';
  locationId: string;
  level: number;
  
  chairmanId: string;
  viceChairmanIds: string[];
  secretaryId?: string;
  treasurerId?: string;
  memberIds: string[];
  
  parentOrganizationId?: string;
  childOrganizationIds: string[];
  
  memberCount: number;
  activeMemberCount: number;
  activityScore: number;
  
  lastActivityDate: Date;
  monthlyPostCount: number;
  monthlyEventCount: number;
  
  createdAt: Date;
  updatedAt: Date;
}
