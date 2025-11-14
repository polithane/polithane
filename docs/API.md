# API Dokümantasyonu

## Base URL

```
Production: https://api.platform.com/v1
Staging: https://api-staging.platform.com/v1
Development: http://localhost:3000/api/v1
```

## Authentication

Tüm API istekleri JWT token ile yapılır:

```http
Authorization: Bearer {access_token}
```

### Token Yenileme

```http
POST /auth/refresh
Content-Type: application/json

{
  "refreshToken": "string"
}
```

## Endpoint Kategorileri

### 1. Authentication Endpoints

#### Kayıt
```http
POST /auth/register
Content-Type: application/json

{
  "email": "string",
  "username": "string",
  "password": "string",
  "fullName": "string",
  "cityId": "string",
  "districtId": "string"
}
```

#### Giriş
```http
POST /auth/login
Content-Type: application/json

{
  "email": "string",
  "password": "string"
}
```

#### Çıkış
```http
POST /auth/logout
Authorization: Bearer {token}
```

### 2. User Endpoints

#### Kullanıcı Bilgileri
```http
GET /users/:userId
Authorization: Bearer {token}
```

**Response**:
```json
{
  "id": "string",
  "username": "string",
  "fullName": "string",
  "email": "string",
  "role": "verified_citizen",
  "profilePicture": "string",
  "bio": "string",
  "city": {
    "id": "string",
    "name": "string"
  },
  "district": {
    "id": "string",
    "name": "string"
  },
  "politPuan": 1234,
  "followerCount": 234,
  "followingCount": 123,
  "postCount": 45
}
```

#### Profil Güncelleme
```http
PUT /users/:userId
Authorization: Bearer {token}
Content-Type: application/json

{
  "fullName": "string",
  "bio": "string",
  "profilePicture": "string"
}
```

#### Takipçiler
```http
GET /users/:userId/followers
Authorization: Bearer {token}
Query Parameters:
  - page: number (default: 1)
  - limit: number (default: 20)
```

#### Takip Edilenler
```http
GET /users/:userId/following
Authorization: Bearer {token}
Query Parameters:
  - page: number
  - limit: number
```

#### Takip Et/Takipten Çık
```http
POST /users/:userId/follow
DELETE /users/:userId/follow
Authorization: Bearer {token}
```

### 3. Post Endpoints

#### Post Oluşturma
```http
POST /posts
Authorization: Bearer {token}
Content-Type: multipart/form-data

{
  "content": "string",
  "type": "text" | "photo" | "video" | "live" | "poll",
  "media": File[],
  "locationId": "string",
  "partyId": "string",
  "visibility": "public" | "party" | "followers" | "private",
  "tags": string[],
  "pollOptions": string[] (if type is poll)
}
```

**Response**:
```json
{
  "id": "string",
  "authorId": "string",
  "content": "string",
  "type": "text",
  "mediaUrls": ["string"],
  "politPuan": 456,
  "likeCount": 0,
  "commentCount": 0,
  "shareCount": 0,
  "createdAt": "2024-01-01T00:00:00Z"
}
```

#### Post Detayı
```http
GET /posts/:postId
Authorization: Bearer {token}
```

#### Post Güncelleme
```http
PUT /posts/:postId
Authorization: Bearer {token}
Content-Type: application/json

{
  "content": "string"
}
```

#### Post Silme
```http
DELETE /posts/:postId
Authorization: Bearer {token}
```

#### Feed
```http
GET /posts/feed
Authorization: Bearer {token}
Query Parameters:
  - type: "general" | "party" | "local" | "following" | "trending" | "media" | "recommended"
  - partyId: string (if type is party)
  - locationId: string (if type is local)
  - page: number
  - limit: number (default: 20)
```

**Response**:
```json
{
  "posts": [
    {
      "id": "string",
      "author": {
        "id": "string",
        "username": "string",
        "fullName": "string",
        "profilePicture": "string",
        "role": "string",
        "politPuan": 1234
      },
      "content": "string",
      "type": "text",
      "mediaUrls": ["string"],
      "politPuan": 456,
      "politPuanBreakdown": {
        "layer1": 100,
        "layer2": 80,
        "layer3": 60,
        "layer4": 120,
        "layer5": 96,
        "total": 456
      },
      "likeCount": 234,
      "commentCount": 45,
      "shareCount": 12,
      "viewCount": 1200,
      "location": {
        "id": "string",
        "name": "string"
      },
      "party": {
        "id": "string",
        "name": "string",
        "color": "string"
      },
      "category": "critical",
      "topicCategory": "economy",
      "tensionScore": 0.8,
      "aiTone": "eleştirel",
      "createdAt": "2024-01-01T00:00:00Z",
      "isLiked": false,
      "isShared": false
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 100,
    "totalPages": 5
  }
}
```

#### Beğen
```http
POST /posts/:postId/like
Authorization: Bearer {token}
```

#### Beğeniyi Kaldır
```http
DELETE /posts/:postId/like
Authorization: Bearer {token}
```

#### Yorum Yap
```http
POST /posts/:postId/comments
Authorization: Bearer {token}
Content-Type: application/json

{
  "content": "string",
  "parentCommentId": "string" (optional, for replies)
}
```

#### Yorumları Getir
```http
GET /posts/:postId/comments
Authorization: Bearer {token}
Query Parameters:
  - page: number
  - limit: number
```

#### Paylaş
```http
POST /posts/:postId/share
Authorization: Bearer {token}
Content-Type: application/json

{
  "comment": "string" (optional)
}
```

### 4. Analytics Endpoints

#### Kullanıcı Analitiği
```http
GET /analytics/users/:userId
Authorization: Bearer {token}
Query Parameters:
  - period: "daily" | "weekly" | "monthly" | "yearly"
  - startDate: string (ISO date)
  - endDate: string (ISO date)
```

**Response**:
```json
{
  "userId": "string",
  "period": "monthly",
  "politPuan": 1234,
  "politPuanChange": 45,
  "politPuanRank": 123,
  "postCount": 45,
  "likeCount": 2340,
  "commentCount": 450,
  "shareCount": 120,
  "viewCount": 12000,
  "followerGrowth": 23,
  "engagementRate": 0.15,
  "reach": 5000,
  "impressions": 12000,
  "topPosts": ["postId1", "postId2"],
  "bestPerformingCategory": "critical",
  "averageSentiment": 0.2,
  "sentimentDistribution": {
    "supportive": 0.3,
    "informative": 0.4,
    "critical": 0.2,
    "controversial": 0.1
  },
  "trend": {
    "politPuan": [1000, 1100, 1200, 1234],
    "dates": ["2024-01-01", "2024-01-08", "2024-01-15", "2024-01-22"]
  }
}
```

#### Post Analitiği
```http
GET /analytics/posts/:postId
Authorization: Bearer {token}
```

#### PolitPuan Hesaplama
```http
POST /analytics/calculate-politpuan
Authorization: Bearer {token}
Content-Type: application/json

{
  "userId": "string"
}
```

#### Rakip Karşılaştırma
```http
GET /analytics/users/:userId/comparison
Authorization: Bearer {token}
Query Parameters:
  - competitorIds: string[] (comma-separated)
```

#### Trend İçerikler
```http
GET /analytics/trending
Authorization: Bearer {token}
Query Parameters:
  - period: "hourly" | "daily" | "weekly"
  - limit: number (default: 10)
```

### 5. AI Endpoints

#### İçerik Analizi
```http
POST /ai/analyze-content
Authorization: Bearer {token}
Content-Type: application/json

{
  "content": "string",
  "type": "post" | "comment"
}
```

**Response**:
```json
{
  "sentimentScore": 0.2,
  "sentimentLabel": "negative",
  "tensionScore": 0.8,
  "partisanshipScore": 0.6,
  "category": "critical",
  "topicCategory": "economy",
  "viralPotential": 0.7,
  "keywords": ["ekonomi", "kriz", "enflasyon"]
}
```

#### İçerik Önerileri
```http
POST /ai/recommend-content
Authorization: Bearer {token}
Content-Type: application/json

{
  "userId": "string",
  "limit": 10
}
```

**Response**:
```json
{
  "recommendations": [
    {
      "postId": "string",
      "score": 0.85,
      "reason": "İlgi alanınıza uygun içerik"
    }
  ]
}
```

#### Paylaşım Önerisi
```http
POST /ai/suggest-post
Authorization: Bearer {token}
Content-Type: application/json

{
  "userId": "string",
  "context": "string" (optional)
}
```

**Response**:
```json
{
  "suggestions": [
    {
      "content": "string",
      "type": "text",
      "tags": ["string"],
      "bestTime": "2024-01-01T14:00:00Z",
      "expectedEngagement": 0.75
    }
  ]
}
```

#### Fact-Check
```http
POST /ai/fact-check
Authorization: Bearer {token}
Content-Type: application/json

{
  "content": "string",
  "source": "string" (optional)
}
```

**Response**:
```json
{
  "status": "verified" | "disputed" | "false" | "pending",
  "score": 0.85,
  "explanation": "string",
  "sources": ["string"]
}
```

### 6. Location Endpoints

#### Şehirler
```http
GET /locations/cities
Authorization: Bearer {token}
```

#### İlçeler
```http
GET /locations/cities/:cityId/districts
Authorization: Bearer {token}
```

#### Mahalleler
```http
GET /locations/districts/:districtId/neighborhoods
Authorization: Bearer {token}
```

#### Teşkilatlar
```http
GET /locations/organizations
Authorization: Bearer {token}
Query Parameters:
  - locationId: string
  - partyId: string
  - type: "city" | "district" | "women_branch" | "youth_branch"
```

### 7. Party Endpoints

#### Partiler
```http
GET /parties
Authorization: Bearer {token}
```

#### Parti Detayı
```http
GET /parties/:partyId
Authorization: Bearer {token}
```

#### Parti Üyeleri
```http
GET /parties/:partyId/members
Authorization: Bearer {token}
Query Parameters:
  - page: number
  - limit: number
  - role: string (filter by role)
```

### 8. Media Endpoints

#### Haberler
```http
GET /media/news
Authorization: Bearer {token}
Query Parameters:
  - category: "national" | "local" | "politics"
  - partyId: string
  - startDate: string
  - endDate: string
  - page: number
  - limit: number
```

#### Haber Detayı
```http
GET /media/news/:newsId
Authorization: Bearer {token}
```

### 9. Agenda Endpoints

#### Gündem Listesi
```http
GET /agenda
Authorization: Bearer {token}
Query Parameters:
  - category: "national" | "party" | "regional" | "civic" | "complaint"
  - locationId: string
  - date: string (ISO date)
```

#### Gündem Detayı
```http
GET /agenda/:agendaId
Authorization: Bearer {token}
```

### 10. Notification Endpoints

#### Bildirimler
```http
GET /notifications
Authorization: Bearer {token}
Query Parameters:
  - unreadOnly: boolean
  - page: number
  - limit: number
```

#### Bildirimi Okundu İşaretle
```http
PUT /notifications/:notificationId/read
Authorization: Bearer {token}
```

#### Tümünü Okundu İşaretle
```http
PUT /notifications/read-all
Authorization: Bearer {token}
```

## Hata Yönetimi

### Hata Formatı

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Hata mesajı",
    "details": {}
  }
}
```

### HTTP Status Kodları

- `200`: Başarılı
- `201`: Oluşturuldu
- `400`: Geçersiz istek
- `401`: Yetkilendirme gerekli
- `403`: Yetki yok
- `404`: Bulunamadı
- `429`: Çok fazla istek (Rate limit)
- `500`: Sunucu hatası

### Hata Kodları

- `INVALID_CREDENTIALS`: Geçersiz giriş bilgileri
- `USER_NOT_FOUND`: Kullanıcı bulunamadı
- `POST_NOT_FOUND`: Post bulunamadı
- `PERMISSION_DENIED`: Yetki yok
- `RATE_LIMIT_EXCEEDED`: Rate limit aşıldı
- `VALIDATION_ERROR`: Doğrulama hatası
- `SERVER_ERROR`: Sunucu hatası

## Rate Limiting

- **Authenticated Users**: 1000 requests/hour
- **Unauthenticated**: 100 requests/hour
- **AI Endpoints**: 50 requests/hour

Rate limit bilgisi header'larda döner:

```http
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 999
X-RateLimit-Reset: 1640995200
```

## Pagination

Tüm liste endpoint'leri pagination destekler:

```json
{
  "data": [],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 100,
    "totalPages": 5,
    "hasNext": true,
    "hasPrev": false
  }
}
```

## WebSocket Events

### Connection

```javascript
const socket = io('wss://api.platform.com', {
  auth: {
    token: 'access_token'
  }
});
```

### Events

#### Client → Server

- `join:user:{userId}` - Kullanıcı kanalına katıl
- `join:post:{postId}` - Post kanalına katıl
- `join:feed:{feedType}` - Feed kanalına katıl

#### Server → Client

- `new_post` - Yeni post
- `new_like` - Yeni beğeni
- `new_comment` - Yeni yorum
- `new_follower` - Yeni takipçi
- `politpuan_updated` - PolitPuan güncellendi
- `trending_update` - Trend güncellendi
- `notification` - Yeni bildirim
