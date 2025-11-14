# Teşkilat Yapılanması Dokümantasyonu

## Hiyerarşik Yapı

```
Türkiye (Country Level)
│
├── İl (City Level) - 81 İl
│   │
│   ├── İlçe (District Level) - ~970 İlçe
│   │   │
│   │   ├── Mahalle (Neighborhood Level) - ~50,000 Mahalle
│   │   │   │
│   │   │   └── Sandık (Ballot Box Level) - ~200,000 Sandık
│   │   │
│   │   └── Teşkilat Yapısı
│   │       ├── İlçe Başkanı
│   │       ├── İlçe Yönetim Kurulu
│   │       ├── Kadın Kolları Başkanı
│   │       └── Gençlik Kolları Başkanı
│   │
│   └── İl Teşkilatı
│       ├── İl Başkanı
│       ├── İl Yönetim Kurulu
│       ├── İl Kadın Kolları
│       └── İl Gençlik Kolları
│
└── Genel Merkez (National Level)
    ├── Genel Başkan
    ├── Merkez Yönetim Kurulu
    ├── Merkez Kadın Kolları
    └── Merkez Gençlik Kolları
```

## Veri Modeli

### Location Entity

```typescript
interface Location {
  id: string;
  type: 'country' | 'city' | 'district' | 'neighborhood' | 'ballot_box';
  name: string;
  code?: string; // Plate code for cities
  parentId?: string; // Parent location ID
  
  // Geographic
  coordinates: {
    lat: number;
    lng: number;
  };
  boundaries?: GeoJSON.Polygon; // For map visualization
  
  // Demographics
  population: number;
  voterCount?: number;
  
  // Political Data
  partyStrength: Map<string, number>; // partyId -> strength score (0-100)
  electionResults?: ElectionResult[];
  
  // Activity Metrics
  activityScore: number; // 0-100
  agendaHeatScore: number; // 0-100
  citizenFeedbackScore: number; // 0-100
  
  // Metadata
  createdAt: Date;
  updatedAt: Date;
}
```

### Organization Entity

```typescript
interface Organization {
  id: string;
  partyId: string;
  type: 'city' | 'district' | 'women_branch' | 'youth_branch' | 'national';
  locationId: string;
  level: number; // 1=National, 2=City, 3=District
  
  // Leadership
  chairmanId: string;
  viceChairmanIds: string[];
  secretaryId?: string;
  treasurerId?: string;
  memberIds: string[];
  
  // Structure
  parentOrganizationId?: string; // For hierarchy
  childOrganizationIds: string[]; // Sub-organizations
  
  // Stats
  memberCount: number;
  activeMemberCount: number;
  activityScore: number; // Based on posts, events, engagement
  
  // Performance Metrics
  lastActivityDate: Date;
  monthlyPostCount: number;
  monthlyEventCount: number;
  
  createdAt: Date;
  updatedAt: Date;
}
```

## Harita Görselleştirme

### Isı Haritası (Heatmap) Katmanları

1. **Parti Gücü Isı Haritası**
   - Her parti için ayrı renk
   - Yoğunluk: Seçim sonuçları + Aktif üye sayısı + Etkileşim
   - Animasyon: Seçim dönemlerinde değişim

2. **Gündem Isı Haritası**
   - Konu bazlı yoğunluk
   - Renk: Kırmızı (yüksek gerilim) → Yeşil (düşük gerilim)
   - Real-time güncelleme

3. **Vatandaş Geri Bildirim Yoğunluğu**
   - Şikayet/öneri sayısına göre
   - Yoğunluk: Son 30 gün içindeki aktivite

4. **Siyasetçi Aktivite Haritası**
   - Aktif siyasetçi sayısı
   - Ziyaret sıklığı
   - Etkileşim yoğunluğu

### Marker Türleri

- **📍 İl Başkanı**: Mavi pin
- **📍 İlçe Başkanı**: Turuncu pin
- **🏛️ Milletvekili**: Kırmızı pin
- **🏢 Belediye Başkanı**: Yeşil pin
- **👥 Gençlik Kolları**: Mor pin
- **👥 Kadın Kolları**: Pembe pin

### Zoom Seviyeleri

1. **Ülke Seviyesi** (Zoom 1-5)
   - Tüm iller görünür
   - İl bazlı parti gücü
   - İl başkanları

2. **İl Seviyesi** (Zoom 6-8)
   - İlçeler görünür
   - İlçe bazlı parti gücü
   - İlçe başkanları, milletvekilleri

3. **İlçe Seviyesi** (Zoom 9-11)
   - Mahalleler görünür
   - Mahalle bazlı aktivite
   - Yerel siyasetçiler

4. **Mahalle Seviyesi** (Zoom 12+)
   - Sandıklar görünür
   - Sandık bazlı seçim sonuçları
   - Mahalle temsilcileri

## Parti Gücü Hesaplama

```typescript
function calculatePartyStrength(
  locationId: string,
  partyId: string
): number {
  const location = getLocation(locationId);
  
  // Election results weight: 40%
  const electionWeight = 0.4;
  const electionScore = getElectionScore(locationId, partyId) * electionWeight;
  
  // Active members weight: 30%
  const memberWeight = 0.3;
  const memberScore = getActiveMemberScore(locationId, partyId) * memberWeight;
  
  // Engagement weight: 20%
  const engagementWeight = 0.2;
  const engagementScore = getEngagementScore(locationId, partyId) * engagementWeight;
  
  // Organization activity weight: 10%
  const activityWeight = 0.1;
  const activityScore = getOrganizationActivityScore(locationId, partyId) * activityWeight;
  
  return Math.min(
    electionScore + memberScore + engagementScore + activityScore,
    100
  );
}

function getElectionScore(locationId: string, partyId: string): number {
  const results = getElectionResults(locationId, partyId);
  if (!results || results.length === 0) return 50; // Neutral if no data
  
  // Average of last 3 elections
  const recentResults = results.slice(-3);
  const avgVotePercentage = recentResults.reduce(
    (sum, r) => sum + r.votePercentage,
    0
  ) / recentResults.length;
  
  return avgVotePercentage;
}

function getActiveMemberScore(locationId: string, partyId: string): number {
  const totalMembers = getTotalMembers(locationId, partyId);
  const activeMembers = getActiveMembers(locationId, partyId, 30); // Last 30 days
  
  if (totalMembers === 0) return 0;
  
  const activityRate = activeMembers / totalMembers;
  return activityRate * 100;
}

function getEngagementScore(locationId: string, partyId: string): number {
  const posts = getPostsByLocationAndParty(locationId, partyId, 30);
  const totalEngagement = posts.reduce(
    (sum, post) => sum + post.likeCount + post.commentCount + post.shareCount,
    0
  );
  
  // Normalize based on population
  const location = getLocation(locationId);
  const normalizedEngagement = (totalEngagement / location.population) * 10000;
  
  return Math.min(normalizedEngagement, 100);
}
```

## Teşkilat Yönetimi

### Rol Bazlı Yetkiler

#### İl Başkanı
- İl teşkilatı üyelerini görüntüleme/yönetme
- İlçe başkanlarını atama
- İl bazlı duyuru yapma
- İl bazlı analitik görüntüleme
- Parti içi gizli oylama başlatma

#### İlçe Başkanı
- İlçe teşkilatı üyelerini görüntüleme/yönetme
- Mahalle temsilcilerini atama
- İlçe bazlı duyuru yapma
- İlçe bazlı analitik görüntüleme
- Görev atama/yönetme

#### Kadın Kolları / Gençlik Kolları Başkanı
- Kollarına özel üyeleri yönetme
- Kollarına özel etkinlikler düzenleme
- Kollarına özel içerik paylaşma
- Kollarına özel analitik görüntüleme

### Üye Yönetimi

```typescript
interface OrganizationMember {
  userId: string;
  organizationId: string;
  role: 'chairman' | 'vice_chairman' | 'secretary' | 'treasurer' | 'member';
  position?: string; // Custom position
  joinDate: Date;
  status: 'active' | 'inactive' | 'suspended';
  
  // Performance
  taskCompletionRate: number;
  postCount: number;
  engagementScore: number;
}
```

### Görev Yönetimi

```typescript
interface Task {
  id: string;
  organizationId: string;
  assignedToId: string;
  assignedById: string;
  title: string;
  description: string;
  category: 'event' | 'campaign' | 'meeting' | 'other';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  dueDate: Date;
  locationId?: string;
  relatedPostIds: string[];
  completedAt?: Date;
  
  createdAt: Date;
  updatedAt: Date;
}
```

## Seçim Sonuçları Entegrasyonu

### Election Result Model

```typescript
interface ElectionResult {
  id: string;
  electionId: string;
  locationId: string;
  partyId: string;
  
  voteCount: number;
  votePercentage: number;
  
  // Comparison
  previousVoteCount?: number;
  previousVotePercentage?: number;
  changePercentage?: number;
  
  // Metadata
  electionDate: Date;
  electionType: 'general' | 'local' | 'presidential';
  recordedAt: Date;
}
```

### Seçim Gecesi Canlı Sonuç Ekranı

- Real-time sonuç güncellemeleri
- Harita animasyonları
- Parti renklerine göre görselleştirme
- İl/İlçe/Mahalle bazlı detaylar
- Trend grafikleri
- Karşılaştırmalı analizler

## Ağ Analizi

### Graph Database Yapısı

```
(User)-[:BELONGS_TO]->(Organization)
(User)-[:LOCATED_IN]->(Location)
(User)-[:FOLLOWS]->(User)
(Organization)-[:PART_OF]->(Organization)
(Organization)-[:LOCATED_IN]->(Location)
```

### Parti İçi Konum Haritası

- Merkezilik skoru (Centrality)
- Etki alanı (Influence)
- Bağlantı yoğunluğu
- Köprü pozisyonları (Bridge positions)

### Görselleştirme

- Node size: PolitPuan veya takipçi sayısı
- Node color: Parti rengi
- Edge thickness: Etkileşim yoğunluğu
- Layout: Force-directed graph

## API Endpoints

### Location Endpoints

```http
GET /locations/cities
GET /locations/cities/:cityId/districts
GET /locations/districts/:districtId/neighborhoods
GET /locations/neighborhoods/:neighborhoodId/ballot-boxes
GET /locations/:locationId/party-strength
GET /locations/:locationId/heatmap-data
```

### Organization Endpoints

```http
GET /organizations
GET /organizations/:organizationId
GET /organizations/:organizationId/members
POST /organizations/:organizationId/members
PUT /organizations/:organizationId/members/:userId
DELETE /organizations/:organizationId/members/:userId
GET /organizations/:organizationId/tasks
POST /organizations/:organizationId/tasks
GET /organizations/:organizationId/analytics
```

### Map Endpoints

```http
GET /map/data
Query Parameters:
  - level: "city" | "district" | "neighborhood"
  - partyId: string
  - heatmapType: "party_strength" | "agenda" | "feedback" | "activity"
  - bounds: "lat1,lng1,lat2,lng2"
  - zoom: number
```
