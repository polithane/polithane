# 🔌 API Dokümantasyonu

## Base URL

```
Production: https://api.politplatform.com/v1
Staging: https://api-staging.politplatform.com/v1
Development: http://localhost:3000/api/v1
```

## Authentication

Tüm API istekleri (public endpoint'ler hariç) JWT token gerektirir.

### Headers

```
Authorization: Bearer <access_token>
Content-Type: application/json
```

### Token Refresh

```http
POST /api/v1/auth/refresh
Content-Type: application/json

{
  "refreshToken": "string"
}
```

**Response:**
```json
{
  "accessToken": "string",
  "refreshToken": "string",
  "expiresIn": 3600
}
```

---

## User Service

### Register User

```http
POST /api/v1/users/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "SecurePassword123!",
  "firstName": "Ahmet",
  "lastName": "Yılmaz",
  "phone": "+905551234567"
}
```

**Response:**
```json
{
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "role": "citizen",
    "verificationStatus": "unverified"
  },
  "accessToken": "string",
  "refreshToken": "string"
}
```

### Login

```http
POST /api/v1/users/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "SecurePassword123!"
}
```

### Get User Profile

```http
GET /api/v1/users/:userId
Authorization: Bearer <token>
```

**Response:**
```json
{
  "id": "uuid",
  "email": "user@example.com",
  "role": "verified_citizen",
  "profile": {
    "firstName": "Ahmet",
    "lastName": "Yılmaz",
    "city": "Istanbul",
    "district": "Kadıköy",
    "profession": "teacher",
    "avatarUrl": "https://...",
    "politicalTendency": 0.65
  },
  "politPuan": 1234,
  "badge": "gold",
  "followerCount": 567,
  "followingCount": 234
}
```

### Update User Profile

```http
PUT /api/v1/users/:userId/profile
Authorization: Bearer <token>
Content-Type: application/json

{
  "firstName": "Ahmet",
  "lastName": "Yılmaz",
  "bio": "Siyaset meraklısı",
  "profession": "teacher"
}
```

### Verify Identity (e-Devlet)

```http
POST /api/v1/users/:userId/verify
Authorization: Bearer <token>
Content-Type: application/json

{
  "tcKimlikNo": "12345678901",
  "eDevletToken": "string" // e-Devlet OAuth token
}
```

### Follow/Unfollow User

```http
POST /api/v1/users/:userId/follow
Authorization: Bearer <token>
```

```http
DELETE /api/v1/users/:userId/follow
Authorization: Bearer <token>
```

### Get Followers

```http
GET /api/v1/users/:userId/followers?page=1&limit=20
Authorization: Bearer <token>
```

### Get Following

```http
GET /api/v1/users/:userId/following?page=1&limit=20
Authorization: Bearer <token>
```

---

## Post Service

### Get Feed

```http
GET /api/v1/posts/feed?type=general&page=1&limit=20
Authorization: Bearer <token>
```

**Query Parameters:**
- `type`: `general` | `party` | `local` | `following` | `trending` | `media` | `recommended`
- `page`: number (default: 1)
- `limit`: number (default: 20, max: 100)
- `city`: string (optional, for local feed)
- `district`: string (optional, for local feed)

**Response:**
```json
{
  "posts": [
    {
      "id": "uuid",
      "user": {
        "id": "uuid",
        "firstName": "Ahmet",
        "lastName": "Yılmaz",
        "avatarUrl": "https://...",
        "role": "politician",
        "roleBadge": "MP"
      },
      "content": "Bugün önemli bir açıklama...",
      "contentType": "text",
      "mediaUrls": [],
      "location": {
        "city": "Istanbul",
        "district": "Kadıköy"
      },
      "politPuan": 2345,
      "interactionCounts": {
        "likes": 123,
        "comments": 45,
        "shares": 12,
        "saves": 5
      },
      "aiAnalysis": {
        "sentiment": {
          "label": "neutral",
          "score": 0.75
        },
        "topic": {
          "category": "economy",
          "confidence": 0.89
        },
        "controversy": {
          "score": 0.45
        },
        "tension": {
          "level": "medium",
          "score": 0.6
        }
      },
      "createdAt": "2024-01-15T10:30:00Z",
      "userInteraction": {
        "liked": true,
        "saved": false
      }
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "totalPages": 8
  }
}
```

### Create Post

```http
POST /api/v1/posts
Authorization: Bearer <token>
Content-Type: application/json

{
  "content": "Bugün önemli bir açıklama yapıyorum...",
  "contentType": "text",
  "mediaUrls": ["https://..."],
  "visibility": "public",
  "location": {
    "city": "Istanbul",
    "district": "Kadıköy"
  }
}
```

**Response:**
```json
{
  "id": "uuid",
  "content": "Bugün önemli bir açıklama yapıyorum...",
  "contentType": "text",
  "politPuan": 0,
  "createdAt": "2024-01-15T10:30:00Z"
}
```

### Get Post

```http
GET /api/v1/posts/:postId
Authorization: Bearer <token>
```

### Update Post

```http
PUT /api/v1/posts/:postId
Authorization: Bearer <token>
Content-Type: application/json

{
  "content": "Güncellenmiş içerik..."
}
```

### Delete Post

```http
DELETE /api/v1/posts/:postId
Authorization: Bearer <token>
```

### Like Post

```http
POST /api/v1/posts/:postId/like
Authorization: Bearer <token>
```

### Unlike Post

```http
DELETE /api/v1/posts/:postId/like
Authorization: Bearer <token>
```

### Comment on Post

```http
POST /api/v1/posts/:postId/comments
Authorization: Bearer <token>
Content-Type: application/json

{
  "content": "Harika bir açıklama!",
  "parentCommentId": "uuid" // Optional, for nested comments
}
```

### Get Comments

```http
GET /api/v1/posts/:postId/comments?page=1&limit=20
Authorization: Bearer <token>
```

### Share Post

```http
POST /api/v1/posts/:postId/share
Authorization: Bearer <token>
Content-Type: application/json

{
  "comment": "Bu paylaşımı beğendim!" // Optional
}
```

### Save Post

```http
POST /api/v1/posts/:postId/save
Authorization: Bearer <token>
```

### Get Trending Posts

```http
GET /api/v1/posts/trending?period=24h&limit=20
Authorization: Bearer <token>
```

**Query Parameters:**
- `period`: `1h` | `6h` | `24h` | `7d`
- `limit`: number (default: 20)

---

## PolitPuan Service

### Get User PolitPuan

```http
GET /api/v1/politpuan/:userId
Authorization: Bearer <token>
```

**Response:**
```json
{
  "userId": "uuid",
  "currentScore": 1234,
  "badge": "gold",
  "rank": 567,
  "breakdown": {
    "layer1": 300,
    "layer2": 250,
    "layer3": 180,
    "layer4": 200,
    "layer5": 150,
    "baseScore": 1080,
    "roleMultiplier": 1.5
  },
  "trend": {
    "change": 45,
    "changePercent": 3.8,
    "direction": "up"
  }
}
```

### Get PolitPuan History

```http
GET /api/v1/politpuan/:userId/history?period=monthly&limit=30
Authorization: Bearer <token>
```

**Query Parameters:**
- `period`: `daily` | `weekly` | `monthly` | `yearly`
- `limit`: number (default: 30)

**Response:**
```json
{
  "history": [
    {
      "date": "2024-01-15",
      "score": 1234,
      "breakdown": {
        "layer1": 300,
        "layer2": 250,
        "layer3": 180,
        "layer4": 200,
        "layer5": 150
      }
    }
  ]
}
```

### Get Leaderboard

```http
GET /api/v1/politpuan/leaderboard?period=weekly&category=all&limit=100
Authorization: Bearer <token>
```

**Query Parameters:**
- `period`: `daily` | `weekly` | `monthly` | `alltime`
- `category`: `all` | `citizen` | `politician` | `party_member` | `city` | `district`
- `city`: string (optional, for city leaderboard)
- `district`: string (optional, for district leaderboard)
- `limit`: number (default: 100, max: 1000)

**Response:**
```json
{
  "leaderboard": [
    {
      "rank": 1,
      "user": {
        "id": "uuid",
        "firstName": "Ahmet",
        "lastName": "Yılmaz",
        "avatarUrl": "https://...",
        "role": "mp"
      },
      "score": 9876,
      "badge": "legend",
      "change": 123
    }
  ],
  "userRank": 567,
  "userScore": 1234
}
```

---

## Organization Service

### Get Organizations

```http
GET /api/v1/organizations?partyId=uuid&type=province&city=Istanbul
Authorization: Bearer <token>
```

**Query Parameters:**
- `partyId`: UUID (optional)
- `type`: `province` | `district` | `neighborhood` | `polling_station` | `women_branch` | `youth_branch`
- `city`: string (optional)
- `district`: string (optional)

### Get Organization

```http
GET /api/v1/organizations/:orgId
Authorization: Bearer <token>
```

**Response:**
```json
{
  "id": "uuid",
  "party": {
    "id": "uuid",
    "name": "AK Parti",
    "color": "#FF0000"
  },
  "type": "province",
  "name": "İstanbul İl Teşkilatı",
  "leader": {
    "id": "uuid",
    "firstName": "Mehmet",
    "lastName": "Demir",
    "avatarUrl": "https://..."
  },
  "memberCount": 1234,
  "activeMemberCount": 987,
  "location": {
    "coordinates": [28.9784, 41.0082],
    "city": "Istanbul",
    "district": "Kadıköy"
  },
  "hierarchy": {
    "parent": null,
    "children": [
      {
        "id": "uuid",
        "name": "Kadıköy İlçe Teşkilatı",
        "type": "district"
      }
    ]
  },
  "statistics": {
    "averagePolitPuan": 567,
    "postCount": 1234,
    "activeUserCount": 987
  }
}
```

### Get Organization Hierarchy

```http
GET /api/v1/organizations/:orgId/hierarchy
Authorization: Bearer <token>
```

### Get Organization Members

```http
GET /api/v1/organizations/:orgId/members?page=1&limit=20&status=active
Authorization: Bearer <token>
```

### Get Organization Map Data

```http
GET /api/v1/organizations/map?partyId=uuid&zoomLevel=province
Authorization: Bearer <token>
```

**Query Parameters:**
- `partyId`: UUID (optional)
- `zoomLevel`: `country` | `province` | `district` | `neighborhood`
- `bounds`: string (optional, format: "minLng,minLat,maxLng,maxLat")

**Response:**
```json
{
  "organizations": [
    {
      "id": "uuid",
      "name": "İstanbul İl Teşkilatı",
      "location": {
        "coordinates": [28.9784, 41.0082],
        "city": "Istanbul"
      },
      "memberCount": 1234,
      "leader": {
        "id": "uuid",
        "name": "Mehmet Demir"
      },
      "statistics": {
        "averagePolitPuan": 567,
        "activityScore": 0.75
      }
    }
  ],
  "heatmap": {
    "type": "activity",
    "data": [
      {
        "coordinates": [28.9784, 41.0082],
        "intensity": 0.75
      }
    ]
  }
}
```

---

## Media Service

### Get Media Articles

```http
GET /api/v1/media/articles?source=all&category=all&page=1&limit=20
Authorization: Bearer <token>
```

**Query Parameters:**
- `source`: string (optional, media source name)
- `category`: string (optional)
- `relatedPartyId`: UUID (optional)
- `relatedUserId`: UUID (optional)
- `factCheckStatus`: `verified` | `partially_verified` | `unverified` | `false`
- `page`: number
- `limit`: number

**Response:**
```json
{
  "articles": [
    {
      "id": "uuid",
      "title": "Önemli Siyasi Gelişme",
      "content": "Bugün önemli bir gelişme...",
      "source": "Hürriyet",
      "sourceUrl": "https://...",
      "author": {
        "id": "uuid",
        "name": "Ayşe Yılmaz"
      },
      "publishedAt": "2024-01-15T10:00:00Z",
      "factCheckStatus": "verified",
      "factCheckScore": 0.95,
      "aiAnalysis": {
        "neutralityScore": 0.85,
        "tensionScore": 7.5,
        "partisanLabel": "neutral"
      },
      "relatedParties": [
        {
          "id": "uuid",
          "name": "AK Parti"
        }
      ],
      "imageUrl": "https://..."
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 500
  }
}
```

### Get Article

```http
GET /api/v1/media/articles/:articleId
Authorization: Bearer <token>
```

### Fact Check Article

```http
POST /api/v1/media/articles/:articleId/fact-check
Authorization: Bearer <token>
Content-Type: application/json

{
  "status": "verified",
  "score": 0.95,
  "notes": "Doğrulandı"
}
```

---

## Agenda Service

### Get Agendas

```http
GET /api/v1/agendas?category=national&priority=high&limit=20
Authorization: Bearer <token>
```

**Query Parameters:**
- `category`: `national` | `party` | `regional` | `citizen` | `civil_society`
- `priority`: `low` | `medium` | `high` | `critical`
- `city`: string (optional, for regional)
- `partyId`: UUID (optional, for party agenda)
- `limit`: number

**Response:**
```json
{
  "agendas": [
    {
      "id": "uuid",
      "title": "Ekonomi Gündemi",
      "description": "Bugün ekonomi konuları...",
      "category": "national",
      "priority": "high",
      "trendScore": 8.5,
      "relatedPosts": [
        {
          "id": "uuid",
          "content": "Ekonomi hakkında...",
          "user": {
            "id": "uuid",
            "name": "Ahmet Yılmaz"
          }
        }
      ],
      "relatedMedia": [
        {
          "id": "uuid",
          "title": "Ekonomi Haberi"
        }
      ],
      "partyPositions": [
        {
          "party": {
            "id": "uuid",
            "name": "AK Parti"
          },
          "position": "support",
          "statement": "Destekliyoruz"
        }
      ],
      "citizenSentiment": {
        "positive": 45,
        "neutral": 30,
        "negative": 25
      },
      "createdAt": "2024-01-15T08:00:00Z"
    }
  ]
}
```

### Get Agenda Detail

```http
GET /api/v1/agendas/:agendaId
Authorization: Bearer <token>
```

**Response:**
```json
{
  "id": "uuid",
  "title": "Ekonomi Gündemi",
  "description": "Detaylı açıklama...",
  "category": "national",
  "priority": "high",
  "trendScore": 8.5,
  "whoSaidWhat": {
    "politicians": [
      {
        "user": {
          "id": "uuid",
          "name": "Ahmet Yılmaz"
        },
        "statement": "Ekonomi iyi gidiyor",
        "postId": "uuid"
      }
    ],
    "citizens": [
      {
        "user": {
          "id": "uuid",
          "name": "Mehmet Demir"
        },
        "statement": "Ekonomi kötü",
        "postId": "uuid"
      }
    ]
  },
  "partyPositions": [
    {
      "party": {
        "id": "uuid",
        "name": "AK Parti"
      },
      "position": "support",
      "statements": ["..."],
      "internalDisagreements": false
    }
  ],
  "mediaCoverage": [
    {
      "article": {
        "id": "uuid",
        "title": "...",
        "source": "Hürriyet"
      },
      "neutralityScore": 0.85
    }
  ],
  "citizenOpinions": {
    "pollResults": {
      "support": 45,
      "oppose": 30,
      "neutral": 25
    },
    "sentimentAnalysis": {
      "positive": 0.45,
      "neutral": 0.30,
      "negative": 0.25
    },
    "geographicDistribution": {
      "Istanbul": {
        "positive": 0.50,
        "negative": 0.30
      }
    }
  }
}
```

---

## Analytics Service

### Get User Analytics

```http
GET /api/v1/analytics/users/:userId?period=monthly&metrics=all
Authorization: Bearer <token>
```

**Query Parameters:**
- `period`: `daily` | `weekly` | `monthly` | `yearly`
- `metrics`: `all` | comma-separated list (e.g., `politpuan,interactions,reach`)

**Response:**
```json
{
  "userId": "uuid",
  "period": "monthly",
  "metrics": {
    "politPuan": {
      "current": 1234,
      "change": 45,
      "changePercent": 3.8,
      "history": [
        {
          "date": "2024-01-01",
          "value": 1189
        }
      ]
    },
    "interactions": {
      "total": 5678,
      "likes": 2345,
      "comments": 1234,
      "shares": 567,
      "saves": 1232
    },
    "reach": {
      "total": 123456,
      "unique": 98765,
      "average": 1234
    },
    "engagement": {
      "rate": 0.045,
      "average": 56.78
    }
  },
  "imageScore": {
    "overall": 75,
    "categories": {
      "economy": 80,
      "education": 70,
      "health": 75
    },
    "trend": "up"
  },
  "competitorComparison": [
    {
      "user": {
        "id": "uuid",
        "name": "Rakip Siyasetçi"
      },
      "politPuan": 1500,
      "interactions": 6000
    }
  ],
  "constituencyAnalysis": {
    "sentiment": {
      "positive": 0.60,
      "neutral": 0.25,
      "negative": 0.15
    },
    "topIssues": [
      {
        "topic": "economy",
        "mentionCount": 123
      }
    ],
    "feedbackCount": 456
  },
  "partisanshipHeatmap": {
    "data": [
      {
        "location": {
          "city": "Istanbul",
          "district": "Kadıköy"
        },
        "support": 0.65,
        "opposition": 0.35
      }
    ]
  },
  "emotionMap": {
    "happiness": {
      "average": 0.60,
      "distribution": [
        {
          "location": "Istanbul",
          "value": 0.65
        }
      ]
    },
    "anger": {
      "average": 0.20,
      "distribution": []
    },
    "concern": {
      "average": 0.20,
      "distribution": []
    }
  }
}
```

### Get Organization Analytics

```http
GET /api/v1/analytics/organizations/:orgId?period=monthly
Authorization: Bearer <token>
```

---

## Search Service

### Search

```http
GET /api/v1/search?q=ekonomi&type=all&page=1&limit=20
Authorization: Bearer <token>
```

**Query Parameters:**
- `q`: string (search query)
- `type`: `all` | `users` | `posts` | `media` | `agendas` | `organizations`
- `filters`: JSON string (optional, e.g., `{"role": "politician", "city": "Istanbul"}`)
- `page`: number
- `limit`: number

**Response:**
```json
{
  "query": "ekonomi",
  "results": {
    "users": [
      {
        "id": "uuid",
        "name": "Ahmet Yılmaz",
        "role": "politician",
        "relevanceScore": 0.95
      }
    ],
    "posts": [
      {
        "id": "uuid",
        "content": "Ekonomi hakkında...",
        "relevanceScore": 0.89
      }
    ],
    "media": [],
    "agendas": [],
    "organizations": []
  },
  "total": 150,
  "pagination": {
    "page": 1,
    "limit": 20,
    "totalPages": 8
  }
}
```

---

## AI Service

### Get Content Recommendations

```http
GET /api/v1/ai/recommendations?type=posts&limit=20
Authorization: Bearer <token>
```

**Query Parameters:**
- `type`: `posts` | `users` | `agendas` | `events`
- `limit`: number

### Get AI Content Suggestion

```http
POST /api/v1/ai/content-suggestion
Authorization: Bearer <token>
Content-Type: application/json

{
  "topic": "ekonomi",
  "targetAudience": "citizens",
  "tone": "informative",
  "length": "medium"
}
```

**Response:**
```json
{
  "suggestions": [
    {
      "content": "Ekonomi hakkında önemli bilgiler...",
      "tone": "informative",
      "hashtags": ["#ekonomi", "#gündem"],
      "bestTimeToPost": "2024-01-15T14:00:00Z",
      "estimatedEngagement": 1234
    }
  ]
}
```

### Analyze Content

```http
POST /api/v1/ai/analyze
Authorization: Bearer <token>
Content-Type: application/json

{
  "content": "İçerik metni...",
  "includeSentiment": true,
  "includeTopic": true,
  "includeControversy": true
}
```

**Response:**
```json
{
  "analysis": {
    "sentiment": {
      "label": "neutral",
      "score": 0.75
    },
    "topic": {
      "category": "economy",
      "confidence": 0.89
    },
    "controversy": {
      "score": 0.45,
      "factors": []
    },
    "tension": {
      "level": "medium",
      "score": 0.6
    }
  }
}
```

---

## Error Responses

Tüm hatalar aşağıdaki formatta döner:

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message",
    "details": {} // Optional, additional error details
  }
}
```

### Error Codes

- `UNAUTHORIZED` (401): Authentication required
- `FORBIDDEN` (403): Insufficient permissions
- `NOT_FOUND` (404): Resource not found
- `VALIDATION_ERROR` (400): Invalid input
- `RATE_LIMIT_EXCEEDED` (429): Too many requests
- `INTERNAL_ERROR` (500): Server error

---

## Rate Limiting

API rate limit'leri:

- **Free tier**: 100 requests/hour
- **Verified users**: 500 requests/hour
- **Party members**: 1,000 requests/hour
- **Politicians**: 5,000 requests/hour
- **System admins**: Unlimited

Rate limit bilgisi response header'larında:

```
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 987
X-RateLimit-Reset: 1642233600
```

---

## WebSocket API

### Connection

```javascript
const socket = io('https://api.politplatform.com', {
  auth: {
    token: 'access_token'
  }
});
```

### Namespaces

- `/feed` - Feed updates
- `/notifications` - Notifications
- `/live` - Live streams
- `/chat` - Direct messages

### Events

#### Feed Updates

```javascript
socket.on('feed:new_post', (data) => {
  console.log('New post:', data);
});

socket.on('feed:new_interaction', (data) => {
  console.log('New interaction:', data);
});

socket.on('feed:politpuan_update', (data) => {
  console.log('PolitPuan updated:', data);
});
```

#### Notifications

```javascript
socket.on('notification:new', (notification) => {
  console.log('New notification:', notification);
});
```

#### Live Streams

```javascript
socket.on('live:started', (data) => {
  console.log('Live stream started:', data);
});

socket.on('live:ended', (data) => {
  console.log('Live stream ended:', data);
});
```

---

*Bu dokümantasyon, platformun tüm API endpoint'lerini içermektedir. API değişiklikleri bu dokümantasyona yansıtılmalıdır.*
