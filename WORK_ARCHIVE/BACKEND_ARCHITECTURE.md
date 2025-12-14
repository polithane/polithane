# 🔧 Polithane - Backend Mimarisi

## 🎯 Genel Bakış

Backend API, Node.js + Express + TypeScript ile geliştirilecek mikroservis-hazır bir monolith olarak başlayacak.

---

## 🏗️ Teknoloji Seçimleri

### Backend Framework
**Node.js 20 LTS + Express.js + TypeScript**

**Neden Node.js?**
- Frontend ile aynı dil (JavaScript/TypeScript)
- Mükemmel async/await desteği
- Zengin npm ekosistemi
- Yüksek performans (V8 engine)
- Kolay ölçeklendirme

**Alternatifler değerlendirildi:**
- ❌ Python FastAPI: Daha yavaş, tiplenme zorlukları
- ❌ Go: Öğrenme eğrisi, daha az library
- ❌ Java Spring Boot: Ağır, karmaşık

### Database
**PostgreSQL 16**

**Neden PostgreSQL?**
- ACID compliance (data integrity)
- JSON support (hybrid model)
- Full-text search (Turkish language support)
- Mature replication
- Open source, free

**Schema Design:**
```sql
-- users table
CREATE TABLE users (
  user_id SERIAL PRIMARY KEY,
  username VARCHAR(50) UNIQUE NOT NULL,
  email VARCHAR(100) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  full_name VARCHAR(100) NOT NULL,
  profile_image VARCHAR(255),
  bio TEXT,
  user_type VARCHAR(20) NOT NULL, -- politician, normal, media, etc.
  politician_type VARCHAR(50),
  party_id INTEGER REFERENCES parties(party_id),
  city_code CHAR(2),
  district_name VARCHAR(100),
  verification_badge BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  polit_score BIGINT DEFAULT 0,
  follower_count INTEGER DEFAULT 0,
  following_count INTEGER DEFAULT 0,
  post_count INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- posts table
CREATE TABLE posts (
  post_id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(user_id),
  content_type VARCHAR(10) NOT NULL, -- text, image, video, audio
  content_text TEXT,
  media_urls JSONB, -- Array of media URLs
  thumbnail_url VARCHAR(255),
  media_duration INTEGER, -- For video/audio
  agenda_tag VARCHAR(200),
  polit_score BIGINT DEFAULT 0,
  view_count INTEGER DEFAULT 0,
  like_count INTEGER DEFAULT 0,
  dislike_count INTEGER DEFAULT 0,
  comment_count INTEGER DEFAULT 0,
  share_count INTEGER DEFAULT 0,
  is_featured BOOLEAN DEFAULT FALSE,
  is_deleted BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- likes table
CREATE TABLE likes (
  like_id SERIAL PRIMARY KEY,
  post_id INTEGER NOT NULL REFERENCES posts(post_id),
  user_id INTEGER NOT NULL REFERENCES users(user_id),
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(post_id, user_id)
);

-- comments table
CREATE TABLE comments (
  comment_id SERIAL PRIMARY KEY,
  post_id INTEGER NOT NULL REFERENCES posts(post_id),
  user_id INTEGER NOT NULL REFERENCES users(user_id),
  parent_comment_id INTEGER REFERENCES comments(comment_id),
  comment_text TEXT NOT NULL,
  like_count INTEGER DEFAULT 0,
  is_deleted BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- parties table
CREATE TABLE parties (
  party_id SERIAL PRIMARY KEY,
  party_name VARCHAR(100) NOT NULL,
  party_short_name VARCHAR(50) NOT NULL,
  party_logo VARCHAR(255),
  party_flag VARCHAR(255),
  parliament_seats INTEGER DEFAULT 0,
  party_color VARCHAR(7),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW()
);

-- agendas table
CREATE TABLE agendas (
  agenda_id SERIAL PRIMARY KEY,
  agenda_title VARCHAR(200) NOT NULL,
  agenda_slug VARCHAR(200) UNIQUE NOT NULL,
  total_polit_score BIGINT DEFAULT 0,
  post_count INTEGER DEFAULT 0,
  trend_score INTEGER DEFAULT 0, -- Trending algorithm
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- follows table
CREATE TABLE follows (
  follow_id SERIAL PRIMARY KEY,
  follower_id INTEGER NOT NULL REFERENCES users(user_id),
  following_id INTEGER NOT NULL REFERENCES users(user_id),
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(follower_id, following_id),
  CHECK(follower_id != following_id)
);

-- notifications table
CREATE TABLE notifications (
  notification_id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(user_id),
  actor_id INTEGER REFERENCES users(user_id),
  notification_type VARCHAR(20) NOT NULL, -- like, comment, follow, mention
  reference_id INTEGER, -- post_id or comment_id
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW()
);

-- polit_score_history table
CREATE TABLE polit_score_history (
  history_id SERIAL PRIMARY KEY,
  post_id INTEGER NOT NULL REFERENCES posts(post_id),
  user_id INTEGER NOT NULL REFERENCES users(user_id),
  action_type VARCHAR(20) NOT NULL, -- view, like, comment, share
  actor_type VARCHAR(20) NOT NULL, -- normal, party_member, mp, etc.
  score_added INTEGER NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_posts_user_id ON posts(user_id);
CREATE INDEX idx_posts_created_at ON posts(created_at DESC);
CREATE INDEX idx_posts_polit_score ON posts(polit_score DESC);
CREATE INDEX idx_posts_agenda_tag ON posts(agenda_tag);
CREATE INDEX idx_likes_post_id ON likes(post_id);
CREATE INDEX idx_likes_user_id ON likes(user_id);
CREATE INDEX idx_comments_post_id ON comments(post_id);
CREATE INDEX idx_follows_follower ON follows(follower_id);
CREATE INDEX idx_follows_following ON follows(following_id);
CREATE INDEX idx_notifications_user ON notifications(user_id, is_read);

-- Full-text search index (Turkish)
CREATE INDEX idx_posts_search ON posts USING gin(to_tsvector('turkish', content_text));
CREATE INDEX idx_users_search ON users USING gin(to_tsvector('turkish', full_name));
```

### Cache Layer
**Redis 7**

**Use Cases:**
1. **Session Management**
   ```javascript
   // Store session: 24 hour TTL
   await redis.setex(`session:${userId}`, 86400, JSON.stringify(sessionData));
   ```

2. **Hot Data Cache**
   ```javascript
   // Cache trending posts: 5 minute TTL
   await redis.setex('posts:trending', 300, JSON.stringify(posts));
   ```

3. **Rate Limiting**
   ```javascript
   // Rate limit: 100 requests per 15 minutes
   const key = `ratelimit:${ip}:${endpoint}`;
   const count = await redis.incr(key);
   if (count === 1) await redis.expire(key, 900);
   if (count > 100) throw new Error('Rate limit exceeded');
   ```

4. **Polit Score Aggregation**
   ```javascript
   // Increment post score (atomic)
   await redis.zincrby('posts:scores', scoreIncrease, postId);
   ```

---

## 📁 Proje Yapısı

```
backend/
├── src/
│   ├── config/              # Konfigürasyon
│   │   ├── database.ts
│   │   ├── redis.ts
│   │   ├── aws.ts
│   │   └── env.ts
│   │
│   ├── models/              # Database models (TypeORM / Prisma)
│   │   ├── User.ts
│   │   ├── Post.ts
│   │   ├── Comment.ts
│   │   ├── Party.ts
│   │   └── Agenda.ts
│   │
│   ├── controllers/         # Request handlers
│   │   ├── auth.controller.ts
│   │   ├── user.controller.ts
│   │   ├── post.controller.ts
│   │   ├── comment.controller.ts
│   │   └── agenda.controller.ts
│   │
│   ├── services/            # Business logic
│   │   ├── auth.service.ts
│   │   ├── user.service.ts
│   │   ├── post.service.ts
│   │   ├── politScore.service.ts
│   │   ├── notification.service.ts
│   │   └── media.service.ts
│   │
│   ├── middleware/          # Express middleware
│   │   ├── auth.middleware.ts
│   │   ├── validation.middleware.ts
│   │   ├── rateLimit.middleware.ts
│   │   └── errorHandler.middleware.ts
│   │
│   ├── routes/              # API routes
│   │   ├── auth.routes.ts
│   │   ├── user.routes.ts
│   │   ├── post.routes.ts
│   │   ├── comment.routes.ts
│   │   └── index.ts
│   │
│   ├── utils/               # Helper functions
│   │   ├── jwt.util.ts
│   │   ├── bcrypt.util.ts
│   │   ├── validation.util.ts
│   │   └── slug.util.ts
│   │
│   ├── jobs/                # Background jobs (BullMQ)
│   │   ├── politScore.job.ts
│   │   ├── notification.job.ts
│   │   └── analytics.job.ts
│   │
│   ├── websocket/           # Socket.io handlers
│   │   ├── notification.socket.ts
│   │   └── liveUpdates.socket.ts
│   │
│   └── app.ts               # Express app setup
│   └── server.ts            # Server entry point
│
├── tests/                   # Test files
│   ├── unit/
│   ├── integration/
│   └── e2e/
│
├── docker/                  # Docker configs
│   ├── Dockerfile
│   ├── docker-compose.yml
│   └── nginx.conf
│
├── scripts/                 # Utility scripts
│   ├── seed.ts             # Database seeding
│   ├── migrate.ts          # Database migrations
│   └── deploy.sh           # Deployment script
│
├── .env.example
├── package.json
├── tsconfig.json
└── README.md
```

---

## 🔐 Authentication & Authorization

### JWT Strategy
```typescript
// Generate JWT token
function generateToken(user: User): string {
  const payload = {
    userId: user.user_id,
    email: user.email,
    userType: user.user_type,
    isAdmin: user.is_admin || false
  };
  
  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: '7d',
    issuer: 'polithane',
    audience: 'polithane-api'
  });
}

// Verify JWT token
function verifyToken(token: string): JWTPayload {
  try {
    return jwt.verify(token, JWT_SECRET) as JWTPayload;
  } catch (error) {
    throw new UnauthorizedError('Invalid token');
  }
}
```

### Auth Middleware
```typescript
export const requireAuth = async (req: Request, res: Response, next: NextFunction) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  
  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }
  
  try {
    const payload = verifyToken(token);
    const user = await User.findById(payload.userId);
    
    if (!user || !user.is_active) {
      return res.status(401).json({ error: 'Invalid user' });
    }
    
    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid token' });
  }
};

// Admin only middleware
export const requireAdmin = (req: Request, res: Response, next: NextFunction) => {
  if (!req.user?.is_admin) {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
};
```

---

## 🎯 Polit Puan Algoritması

### Hesaplama Servisi
```typescript
interface PolitScoreConfig {
  view: number;
  like: number;
  comment: number;
  share: number;
}

// Kullanıcı tipi bazlı çarpanlar
const userTypeMultipliers: Record<string, number> = {
  'normal': 1,
  'party_member': 5,
  'party_member_rival': 10,
  'provincial_chair': 15,
  'district_chair': 12,
  'mp': 50,
  'party_chair': 100,
  'ex_politician': 30,
  'media': 20
};

class PolitScoreService {
  // Puan hesapla
  async calculateScore(
    postId: number,
    actionType: 'view' | 'like' | 'comment' | 'share',
    actorUserId: number
  ): Promise<number> {
    const post = await Post.findById(postId);
    const actor = await User.findById(actorUserId);
    
    // Base score
    const baseScores = {
      view: 1,
      like: 5,
      comment: 10,
      share: 50
    };
    
    // Multiplier based on user type
    const multiplier = this.getUserMultiplier(actor, post.user);
    
    // Calculate final score
    const score = baseScores[actionType] * multiplier;
    
    // Save history (async job)
    await this.saveScoreHistory(postId, actorUserId, actionType, score);
    
    // Update post score (atomic)
    await redis.zincrby('posts:scores', score, postId);
    
    // Sync to database (background job)
    await this.queueScoreSync(postId);
    
    return score;
  }
  
  // Kullanıcı çarpanını belirle
  private getUserMultiplier(actor: User, postOwner: User): number {
    let key = actor.user_type;
    
    // Rakip parti üyesi mi?
    if (
      actor.party_id &&
      postOwner.party_id &&
      actor.party_id !== postOwner.party_id
    ) {
      key += '_rival';
    }
    
    return userTypeMultipliers[key] || 1;
  }
  
  // Skor geçmişini kaydet
  private async saveScoreHistory(
    postId: number,
    actorId: number,
    actionType: string,
    score: number
  ) {
    await PolitScoreHistory.create({
      post_id: postId,
      user_id: actorId,
      action_type: actionType,
      score_added: score
    });
  }
  
  // Redis'ten DB'ye senkronizasyon (her 5 dakikada)
  async syncScoresToDatabase() {
    const scores = await redis.zrange('posts:scores', 0, -1, 'WITHSCORES');
    
    for (let i = 0; i < scores.length; i += 2) {
      const postId = parseInt(scores[i]);
      const score = parseInt(scores[i + 1]);
      
      await Post.update(postId, { polit_score: score });
    }
  }
}
```

---

## 📊 API Endpoints

### Authentication
```
POST   /api/auth/register       # Kayıt ol
POST   /api/auth/login          # Giriş yap
POST   /api/auth/logout         # Çıkış yap
POST   /api/auth/refresh        # Token yenile
POST   /api/auth/forgot-password # Şifre sıfırla
```

### Users
```
GET    /api/users/:userId       # Kullanıcı profili
PUT    /api/users/:userId       # Profil güncelle
GET    /api/users/:userId/posts # Kullanıcı postları
GET    /api/users/:userId/followers # Takipçiler
GET    /api/users/:userId/following # Takip edilenler
POST   /api/users/:userId/follow    # Takip et
DELETE /api/users/:userId/follow    # Takibi bırak
```

### Posts
```
GET    /api/posts               # Tüm postlar (paginated)
GET    /api/posts/:postId       # Post detayı
POST   /api/posts               # Yeni post oluştur
PUT    /api/posts/:postId       # Post güncelle
DELETE /api/posts/:postId       # Post sil
POST   /api/posts/:postId/like  # Beğen
DELETE /api/posts/:postId/like  # Beğeniyi kaldır
GET    /api/posts/:postId/comments # Yorumlar
POST   /api/posts/:postId/comments # Yorum yap
POST   /api/posts/:postId/share    # Paylaş
```

### Agendas
```
GET    /api/agendas             # Tüm gündemler
GET    /api/agendas/:slug       # Gündem detayı
GET    /api/agendas/:slug/posts # Gündem postları
```

### Parties
```
GET    /api/parties             # Tüm partiler
GET    /api/parties/:partyId    # Parti detayı
GET    /api/parties/:partyId/mps # Milletvekilleri
```

### Search
```
GET    /api/search?q=...&type=... # Arama (posts, users, agendas)
```

---

## 🚀 Deployment

### Docker Configuration
```dockerfile
# Dockerfile
FROM node:20-alpine

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci --only=production

# Copy source code
COPY . .

# Build TypeScript
RUN npm run build

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s \
  CMD node healthcheck.js || exit 1

# Start server
CMD ["node", "dist/server.js"]
```

### Docker Compose (Development)
```yaml
version: '3.8'

services:
  api:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=development
      - DATABASE_URL=postgresql://user:pass@postgres:5432/polithane
      - REDIS_URL=redis://redis:6379
    depends_on:
      - postgres
      - redis
    volumes:
      - ./src:/app/src

  postgres:
    image: postgres:16-alpine
    environment:
      - POSTGRES_DB=polithane
      - POSTGRES_USER=user
      - POSTGRES_PASSWORD=pass
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data

volumes:
  postgres_data:
  redis_data:
```

---

**Son Güncelleme:** 27 Kasım 2025
**Durum:** Tasarım Aşaması
**Başlangıç:** Q1 2025
