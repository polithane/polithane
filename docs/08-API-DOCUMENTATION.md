# 🔌 API Dokümantasyonu

## 📋 İçindekiler

1. [API Genel Bakış](#api-genel-bakış)
2. [Authentication](#authentication)
3. [User Endpoints](#user-endpoints)
4. [Post Endpoints](#post-endpoints)
5. [Feed Endpoints](#feed-endpoints)
6. [Interaction Endpoints](#interaction-endpoints)
7. [Search Endpoints](#search-endpoints)
8. [Analytics Endpoints](#analytics-endpoints)
9. [Party & Organization Endpoints](#party--organization-endpoints)
10. [Error Handling](#error-handling)

---

## API Genel Bakış

**Base URL**: `https://api.politplatform.com/v1`

**Content-Type**: `application/json`

**Rate Limits**:
- Authenticated: 1000 req/hour
- Unauthenticated: 100 req/hour

---

## Authentication

### POST /auth/register

Yeni kullanıcı kaydı.

**Request**:
```json
{
  "username": "ahmet_yilmaz",
  "email": "ahmet@example.com",
  "password": "SecurePass123!",
  "full_name": "Ahmet Yılmaz",
  "phone": "+905551234567"
}
```

**Response** (201):
```json
{
  "user": {
    "id": 12345,
    "username": "ahmet_yilmaz",
    "email": "ahmet@example.com",
    "full_name": "Ahmet Yılmaz",
    "role": "citizen",
    "created_at": "2024-11-14T10:00:00Z"
  },
  "tokens": {
    "access_token": "eyJhbGciOiJIUzI1NiIs...",
    "refresh_token": "eyJhbGciOiJIUzI1NiIs...",
    "expires_in": 3600
  }
}
```

---

### POST /auth/login

Kullanıcı girişi.

**Request**:
```json
{
  "username": "ahmet_yilmaz",
  "password": "SecurePass123!"
}
```

**Response** (200):
```json
{
  "user": {
    "id": 12345,
    "username": "ahmet_yilmaz",
    "role": "verified_citizen",
    "party_id": 1
  },
  "tokens": {
    "access_token": "eyJhbGciOiJIUzI1NiIs...",
    "refresh_token": "eyJhbGciOiJIUzI1NiIs...",
    "expires_in": 3600
  }
}
```

---

### POST /auth/logout

Kullanıcı çıkışı.

**Headers**:
```
Authorization: Bearer {access_token}
```

**Response** (200):
```json
{
  "message": "Logout successful"
}
```

---

## User Endpoints

### GET /users/:id

Kullanıcı profili.

**Response** (200):
```json
{
  "id": 12345,
  "username": "ahmet_yilmaz",
  "full_name": "Ahmet Yılmaz",
  "display_name": "Ahmet",
  "bio": "Eğitim politikalarını takip ediyorum",
  "avatar_url": "https://cdn.politplatform.com/avatars/12345.jpg",
  "cover_url": "https://cdn.politplatform.com/covers/12345.jpg",
  "role": "verified_citizen",
  "is_verified": true,
  "profession": "Öğretmen",
  "city": "İstanbul",
  "district": "Kadıköy",
  "party_id": null,
  "followers_count": 250,
  "following_count": 180,
  "posts_count": 45,
  "politpuan_total": 1543.75,
  "politpuan_rank": 12450,
  "created_at": "2024-01-15T10:00:00Z",
  "badges": [
    {
      "id": "first_post",
      "name": "İlk Paylaşım",
      "icon": "📝",
      "earned_at": "2024-01-15T11:30:00Z"
    }
  ]
}
```

---

### PUT /users/:id

Profil güncelleme.

**Headers**:
```
Authorization: Bearer {access_token}
```

**Request**:
```json
{
  "display_name": "Ahmet Y.",
  "bio": "Yeni bio",
  "profession": "Mühendis",
  "city_id": 34,
  "district_id": 450
}
```

**Response** (200):
```json
{
  "id": 12345,
  "username": "ahmet_yilmaz",
  "display_name": "Ahmet Y.",
  "bio": "Yeni bio",
  "profession": "Mühendis",
  "updated_at": "2024-11-14T10:30:00Z"
}
```

---

### POST /users/:id/follow

Kullanıcı takip et.

**Headers**:
```
Authorization: Bearer {access_token}
```

**Response** (200):
```json
{
  "following": true,
  "follower_count": 251,
  "message": "Ahmet Yılmaz'ı takip etmeye başladınız"
}
```

---

### DELETE /users/:id/follow

Takipten çık.

**Response** (200):
```json
{
  "following": false,
  "follower_count": 250,
  "message": "Takipten çıktınız"
}
```

---

### GET /users/:id/followers

Takipçiler listesi.

**Query Parameters**:
- `limit` (default: 20, max: 100)
- `offset` (default: 0)

**Response** (200):
```json
{
  "total": 250,
  "followers": [
    {
      "id": 67890,
      "username": "mehmet_kaya",
      "full_name": "Mehmet Kaya",
      "avatar_url": "...",
      "is_verified": true,
      "followed_at": "2024-10-15T14:20:00Z"
    }
  ],
  "pagination": {
    "limit": 20,
    "offset": 0,
    "total": 250,
    "has_more": true
  }
}
```

---

## Post Endpoints

### POST /posts

Yeni post oluştur.

**Headers**:
```
Authorization: Bearer {access_token}
```

**Request**:
```json
{
  "content": "Eğitim sistemi hakkında düşüncelerim...",
  "media_urls": [
    "https://cdn.politplatform.com/media/abc123.jpg"
  ],
  "media_type": "photo",
  "hashtags": ["#eğitim", "#politika"],
  "mentions": [67890],
  "visibility": "public",
  "location_text": "İstanbul, Kadıköy"
}
```

**Response** (201):
```json
{
  "id": 98765,
  "author": {
    "id": 12345,
    "username": "ahmet_yilmaz",
    "full_name": "Ahmet Yılmaz",
    "avatar_url": "...",
    "role": "verified_citizen"
  },
  "content": "Eğitim sistemi hakkında düşüncelerim...",
  "media_urls": ["..."],
  "media_type": "photo",
  "hashtags": ["#eğitim", "#politika"],
  "mentions": [67890],
  "politpuan_total": 0,
  "ai_category": "bilgilendirici",
  "ai_topic": "eğitim",
  "ai_sentiment": {
    "positive": 0.6,
    "neutral": 0.3,
    "negative": 0.1
  },
  "views_count": 0,
  "likes_count": 0,
  "comments_count": 0,
  "reposts_count": 0,
  "created_at": "2024-11-14T10:45:00Z"
}
```

---

### GET /posts/:id

Post detayı.

**Response** (200):
```json
{
  "id": 98765,
  "author": {...},
  "content": "...",
  "media_urls": [...],
  "politpuan_total": 1543.75,
  "politpuan_breakdown": {
    "k1": 385.50,
    "k2": 220.00,
    "k3": 150.00,
    "k4": 500.25,
    "k5": 288.00
  },
  "ai_analysis": {
    "category": "eleştirel",
    "topic": "ekonomi",
    "sentiment": {...},
    "gerilim_score": 0.75,
    "viral_probability": 0.85
  },
  "stats": {
    "views": 5000,
    "likes": 250,
    "comments": 45,
    "reposts": 30,
    "saves": 15
  },
  "created_at": "2024-11-14T10:45:00Z",
  "updated_at": null
}
```

---

### DELETE /posts/:id

Post sil.

**Headers**:
```
Authorization: Bearer {access_token}
```

**Response** (200):
```json
{
  "message": "Post deleted successfully"
}
```

---

### GET /posts/:id/comments

Post yorumları.

**Query Parameters**:
- `sort` (popular, newest, oldest)
- `limit` (default: 20)
- `offset` (default: 0)

**Response** (200):
```json
{
  "total": 45,
  "comments": [
    {
      "id": 11111,
      "author": {
        "id": 67890,
        "username": "mehmet_kaya",
        "full_name": "Mehmet Kaya",
        "avatar_url": "...",
        "is_verified": true
      },
      "content": "Harika bir paylaşım, katılıyorum!",
      "likes_count": 15,
      "replies_count": 3,
      "created_at": "2024-11-14T11:00:00Z"
    }
  ],
  "pagination": {...}
}
```

---

## Feed Endpoints

### GET /feed

Kişiselleştirilmiş ana akış.

**Headers**:
```
Authorization: Bearer {access_token}
```

**Query Parameters**:
- `type` (personalized, following, trending, local, party)
- `limit` (default: 20, max: 50)
- `offset` (default: 0)

**Response** (200):
```json
{
  "posts": [
    {
      "id": 98765,
      "author": {...},
      "content": "...",
      "politpuan_total": 1543.75,
      "stats": {...},
      "created_at": "2024-11-14T10:45:00Z"
    }
  ],
  "pagination": {
    "limit": 20,
    "offset": 0,
    "has_more": true
  },
  "meta": {
    "feed_type": "personalized",
    "generated_at": "2024-11-14T12:00:00Z",
    "cache_hit": true
  }
}
```

---

## Interaction Endpoints

### POST /posts/:id/like

Post beğen.

**Headers**:
```
Authorization: Bearer {access_token}
```

**Response** (200):
```json
{
  "liked": true,
  "likes_count": 251
}
```

---

### DELETE /posts/:id/like

Beğeniyi geri al.

**Response** (200):
```json
{
  "liked": false,
  "likes_count": 250
}
```

---

### POST /posts/:id/comment

Yorum yap.

**Request**:
```json
{
  "content": "Harika bir paylaşım!",
  "media_url": null
}
```

**Response** (201):
```json
{
  "id": 11111,
  "post_id": 98765,
  "author": {...},
  "content": "Harika bir paylaşım!",
  "likes_count": 0,
  "created_at": "2024-11-14T11:00:00Z"
}
```

---

### POST /posts/:id/share

Post paylaş (repost).

**Request**:
```json
{
  "comment": "Mutlaka okunmalı!" // Opsiyonel
}
```

**Response** (201):
```json
{
  "id": 99999,
  "repost_of_id": 98765,
  "comment": "Mutlaka okunmalı!",
  "created_at": "2024-11-14T11:05:00Z"
}
```

---

## Search Endpoints

### GET /search

Genel arama.

**Query Parameters**:
- `q` (arama terimi, required)
- `type` (all, users, posts, parties)
- `limit` (default: 20)
- `offset` (default: 0)

**Response** (200):
```json
{
  "query": "ekonomi",
  "results": {
    "users": {
      "total": 150,
      "items": [...]
    },
    "posts": {
      "total": 2500,
      "items": [...]
    },
    "parties": {
      "total": 5,
      "items": [...]
    }
  },
  "suggestions": ["ekonomik reform", "ekonomi politikası"]
}
```

---

### GET /search/autocomplete

Otomatik tamamlama.

**Query Parameters**:
- `q` (partial query)

**Response** (200):
```json
{
  "suggestions": [
    {
      "text": "ekonomi politikası",
      "type": "topic",
      "count": 2500
    },
    {
      "text": "Ahmet Yılmaz",
      "type": "user",
      "user_id": 12345,
      "avatar": "..."
    },
    {
      "text": "#ekonomi",
      "type": "hashtag",
      "count": 15000
    }
  ]
}
```

---

## Analytics Endpoints

### GET /analytics/overview

Kullanıcı analitik özet.

**Headers**:
```
Authorization: Bearer {access_token}
```

**Query Parameters**:
- `user_id` (default: authenticated user)
- `period` (7d, 30d, 90d, 1y)

**Response** (200):
```json
{
  "period": "30d",
  "politpuan": {
    "current": 24953,
    "change": 12.9,
    "change_percent": 12.9,
    "timeline": [
      {"date": "2024-10-15", "value": 22100},
      {"date": "2024-10-16", "value": 22350},
      ...
    ]
  },
  "followers": {
    "total": 150000,
    "new": 2500,
    "lost": 150,
    "net": 2350,
    "demographics": {
      "age_groups": {
        "18-24": 0.25,
        "25-34": 0.35,
        "35-44": 0.20,
        "45-54": 0.15,
        "55+": 0.05
      },
      "gender": {
        "male": 0.58,
        "female": 0.42
      },
      "top_cities": [
        {"city": "İstanbul", "count": 52500, "percent": 35},
        {"city": "Ankara", "count": 27000, "percent": 18},
        {"city": "İzmir", "count": 18000, "percent": 12}
      ]
    }
  },
  "content": {
    "top_posts": [
      {
        "id": 98765,
        "content": "...",
        "politpuan": 24953,
        "stats": {...}
      }
    ],
    "type_breakdown": {
      "text": {"count": 25, "avg_politpuan": 500},
      "photo": {"count": 30, "avg_politpuan": 850},
      "video": {"count": 10, "avg_politpuan": 1200}
    }
  },
  "engagement": {
    "rate": 0.042,
    "by_hour": [...],
    "by_day": [...]
  },
  "sentiment": {
    "positive": 0.45,
    "neutral": 0.35,
    "negative": 0.20
  }
}
```

---

## Party & Organization Endpoints

### GET /parties

Partiler listesi.

**Response** (200):
```json
{
  "parties": [
    {
      "id": 1,
      "name": "Örnek Parti",
      "short_name": "ÖP",
      "logo_url": "...",
      "color_primary": "#FF0000",
      "chairman": {
        "id": 12345,
        "full_name": "..."
      },
      "member_count": 5200000,
      "follower_count": 2300000,
      "parliament_seats": 120
    }
  ]
}
```

---

### GET /parties/:id/organization

Parti teşkilat yapısı.

**Query Parameters**:
- `level` (national, city, district)
- `city_id` (il filtreleme)
- `district_id` (ilçe filtreleme)

**Response** (200):
```json
{
  "party_id": 1,
  "organization": [
    {
      "level": "city",
      "city_id": 34,
      "city_name": "İstanbul",
      "manager": {
        "id": 67890,
        "full_name": "Mehmet Yılmaz",
        "role": "İl Başkanı"
      },
      "members": 350000,
      "active_members": 120000,
      "strength_score": 85,
      "districts": 39
    }
  ]
}
```

---

### GET /politicians

Milletvekilleri listesi.

**Query Parameters**:
- `city_id` (il filtreleme)
- `party_id` (parti filtreleme)
- `commission` (komisyon)

**Response** (200):
```json
{
  "total": 600,
  "politicians": [
    {
      "id": 12345,
      "full_name": "Dr. Ayşe Demir",
      "username": "ayse_demir",
      "avatar_url": "...",
      "party_id": 1,
      "party_name": "Örnek Parti",
      "role": "Milletvekili",
      "election_district": "İstanbul (1. Bölge)",
      "commissions": ["Ekonomi", "Bütçe"],
      "politpuan_total": 24953,
      "followers_count": 150000
    }
  ],
  "pagination": {...}
}
```

---

## Error Handling

### Error Response Format

```json
{
  "error": {
    "code": "INVALID_INPUT",
    "message": "Username is already taken",
    "details": {
      "field": "username",
      "value": "ahmet_yilmaz"
    },
    "timestamp": "2024-11-14T10:00:00Z",
    "request_id": "req_abc123"
  }
}
```

### HTTP Status Codes

| Code | Meaning | Example |
|------|---------|---------|
| 200 | Success | GET request successful |
| 201 | Created | Resource created |
| 204 | No Content | DELETE successful |
| 400 | Bad Request | Invalid input |
| 401 | Unauthorized | Missing/invalid token |
| 403 | Forbidden | Insufficient permissions |
| 404 | Not Found | Resource not found |
| 429 | Too Many Requests | Rate limit exceeded |
| 500 | Internal Server Error | Server error |
| 503 | Service Unavailable | Maintenance |

### Common Error Codes

```
AUTH_REQUIRED - Authentication required
INVALID_TOKEN - Token expired or invalid
INVALID_INPUT - Validation error
NOT_FOUND - Resource not found
RATE_LIMIT_EXCEEDED - Too many requests
PERMISSION_DENIED - Insufficient permissions
DUPLICATE_ENTRY - Resource already exists
SERVER_ERROR - Internal server error
```

---

**Sonraki Dokümantasyon**: [09-ADDITIONAL-FEATURES.md](./09-ADDITIONAL-FEATURES.md)
