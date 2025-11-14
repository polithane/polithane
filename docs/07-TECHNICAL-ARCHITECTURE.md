# 🏗️ Teknik Mimari ve Altyapı

## 📋 İçindekiler

1. [Genel Mimari](#genel-mimari)
2. [Mikroservis Yapısı](#mikroservis-yapısı)
3. [Event-Driven Architecture](#event-driven-architecture)
4. [Load Balancing ve Scaling](#load-balancing-ve-scaling)
5. [Caching Strategy](#caching-strategy)
6. [Real-time Sistemi](#real-time-sistemi)
7. [CI/CD Pipeline](#cicd-pipeline)
8. [Monitoring ve Logging](#monitoring-ve-logging)
9. [Security](#security)
10. [Disaster Recovery](#disaster-recovery)

---

## Genel Mimari

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                         CLIENT LAYER                          │
│  Web (React/Next.js)  │  Mobile (React Native)  │  Admin     │
└────────────────┬────────────────────────────────────────────┘
                 │
┌────────────────▼────────────────────────────────────────────┐
│                         API GATEWAY                           │
│  (Kong / AWS API Gateway)                                     │
│  - Rate Limiting  - Authentication  - Routing                │
└────────────────┬────────────────────────────────────────────┘
                 │
┌────────────────▼────────────────────────────────────────────┐
│                     MICROSERVICES LAYER                       │
├───────────────┬──────────────┬──────────────┬───────────────┤
│ User Service  │ Post Service │ Feed Service │ Auth Service  │
├───────────────┼──────────────┼──────────────┼───────────────┤
│ Party Service │ Analytics    │ AI Service   │ Media Service │
├───────────────┼──────────────┼──────────────┼───────────────┤
│ Notification  │ Search       │ Organization │ Task Service  │
└───────────────┴──────────────┴──────────────┴───────────────┘
                 │
┌────────────────▼────────────────────────────────────────────┐
│                      MESSAGE QUEUE                            │
│  RabbitMQ / Apache Kafka                                      │
│  - Event Bus  - Async Processing  - Task Queue               │
└────────────────┬────────────────────────────────────────────┘
                 │
┌────────────────▼────────────────────────────────────────────┐
│                      DATA LAYER                               │
├──────────────┬────────────────┬──────────────┬──────────────┤
│ PostgreSQL   │ Neo4j (Graph)  │ MongoDB      │ Elasticsearch│
├──────────────┼────────────────┼──────────────┼──────────────┤
│ Redis        │ S3 (Media)     │ CDN          │              │
└──────────────┴────────────────┴──────────────┴──────────────┘
```

---

## Mikroservis Yapısı

### 1. User Service

**Sorumluluklar**:
- Kullanıcı kayıt/giriş
- Profil yönetimi
- Takip sistemi
- Kullanıcı doğrulama (E-Devlet)

**Tech Stack**:
- Node.js (NestJS)
- PostgreSQL
- Redis (cache)
- JWT authentication

**API Endpoints**:
```
POST   /api/users/register
POST   /api/users/login
GET    /api/users/:id
PUT    /api/users/:id
POST   /api/users/:id/follow
DELETE /api/users/:id/follow
GET    /api/users/:id/followers
GET    /api/users/:id/following
```

**Database Schema**:
- `users` table (PostgreSQL)
- `follows` table (PostgreSQL)
- `user_sessions` (Redis)

---

### 2. Post Service

**Sorumluluklar**:
- Post oluşturma/silme/güncelleme
- Etkileşimler (like, comment, share)
- PolitPuan hesaplama
- Media upload

**Tech Stack**:
- Node.js (NestJS)
- PostgreSQL
- S3 (media storage)
- Redis (cache)

**API Endpoints**:
```
POST   /api/posts
GET    /api/posts/:id
PUT    /api/posts/:id
DELETE /api/posts/:id
POST   /api/posts/:id/like
POST   /api/posts/:id/comment
POST   /api/posts/:id/share
GET    /api/posts/:id/comments
```

**Event Publishing**:
```javascript
// Post oluşturulduğunda
eventBus.publish('post.created', {
  post_id: post.id,
  author_id: post.author_id,
  content: post.content,
  timestamp: new Date()
});

// Post beğenildiğinde
eventBus.publish('post.liked', {
  post_id: post.id,
  user_id: user.id,
  timestamp: new Date()
});
```

---

### 3. Feed Service

**Sorumluluklar**:
- Personalized feed oluşturma
- Feed sıralaması (PolitPuan + AI)
- Feed cache yönetimi
- Pagination

**Tech Stack**:
- Node.js
- Redis (feed cache)
- PostgreSQL (query)
- Python (ML model service)

**API Endpoints**:
```
GET /api/feed
GET /api/feed/following
GET /api/feed/trending
GET /api/feed/local
GET /api/feed/party
```

**Feed Generation Algorithm**:
```javascript
async function generateFeed(userId, feedType = 'personalized', limit = 20, offset = 0) {
  // 1. Cache check
  const cacheKey = `feed:${userId}:${feedType}`;
  let cachedFeed = await redis.get(cacheKey);
  
  if (cachedFeed) {
    return JSON.parse(cachedFeed).slice(offset, offset + limit);
  }
  
  // 2. Get candidate posts
  let candidates;
  
  if (feedType === 'following') {
    const following = await getFollowing(userId);
    candidates = await getPostsByAuthors(following, limit * 5);
  } else if (feedType === 'trending') {
    candidates = await getTrendingPosts(limit * 5);
  } else {
    // Personalized: Mix of multiple sources
    candidates = await getPersonalizedCandidates(userId, limit * 10);
  }
  
  // 3. Score and rank
  const scoredPosts = await scoreAndRank(userId, candidates);
  
  // 4. Diversity injection
  const diverseFeed = injectDiversity(scoredPosts);
  
  // 5. Cache
  await redis.set(cacheKey, JSON.stringify(diverseFeed), 'EX', 300); // 5 min
  
  return diverseFeed.slice(offset, offset + limit);
}
```

---

### 4. Auth Service

**Sorumluluklar**:
- Authentication (JWT)
- Authorization (RBAC)
- E-Devlet entegrasyonu
- 2FA

**Tech Stack**:
- Node.js (NestJS)
- Redis (sessions)
- PostgreSQL (permissions)

**API Endpoints**:
```
POST /api/auth/login
POST /api/auth/logout
POST /api/auth/refresh
POST /api/auth/verify-2fa
POST /api/auth/edevlet-verify
```

**JWT Structure**:
```json
{
  "sub": "user_id_12345",
  "username": "ahmet_yilmaz",
  "role": "verified_citizen",
  "role_level": 2,
  "party_id": 1,
  "iat": 1699999999,
  "exp": 1700086399
}
```

---

### 5. AI Service

**Sorumluluklar**:
- Sentiment analysis
- Topic classification
- Content moderation
- Recommendation engine
- Viral prediction

**Tech Stack**:
- Python (FastAPI)
- PyTorch / TensorFlow
- Hugging Face Transformers
- GPU instances

**API Endpoints**:
```
POST /api/ai/sentiment
POST /api/ai/topic
POST /api/ai/moderate
POST /api/ai/recommend
POST /api/ai/predict-viral
```

**Microservice Communication**:
```python
# FastAPI
@app.post("/api/ai/analyze-post")
async def analyze_post(post_data: PostAnalysisRequest):
    # Sentiment
    sentiment = await sentiment_analyzer.analyze(post_data.content)
    
    # Topic
    topic = await topic_classifier.predict(post_data.content)
    
    # Moderation
    moderation = await content_moderator.moderate(post_data)
    
    # Viral prediction
    viral_prob = await viral_predictor.predict(post_data)
    
    return {
        'sentiment': sentiment,
        'topic': topic,
        'moderation': moderation,
        'viral_probability': viral_prob
    }
```

---

### 6. Analytics Service

**Sorumluluklar**:
- Real-time analytics
- Dashboard data
- Report generation
- Metric aggregation

**Tech Stack**:
- Node.js
- MongoDB (time-series data)
- Redis (real-time counters)
- Apache Spark (big data processing)

**API Endpoints**:
```
GET /api/analytics/overview
GET /api/analytics/politpuan-history
GET /api/analytics/follower-growth
GET /api/analytics/content-performance
GET /api/analytics/engagement
GET /api/analytics/sentiment
GET /api/analytics/geographic
```

---

### 7. Notification Service

**Sorumluluklar**:
- Push notifications
- Email notifications
- SMS notifications
- In-app notifications

**Tech Stack**:
- Node.js
- RabbitMQ (queue)
- Firebase Cloud Messaging (push)
- SendGrid (email)
- Twilio (SMS)

**Event Subscriptions**:
```javascript
// post.liked event'ini dinle
messageQueue.subscribe('post.liked', async (event) => {
  const { post_id, user_id } = event;
  
  // Post sahibine bildirim gönder
  const post = await getPost(post_id);
  
  await createNotification({
    user_id: post.author_id,
    type: 'like',
    actor_id: user_id,
    target_id: post_id,
    title: 'Paylaşımınız beğenildi',
    body: `${await getUsername(user_id)} paylaşımınızı beğendi`
  });
  
  // Push notification gönder
  await sendPushNotification(post.author_id, notification);
});
```

---

### 8. Search Service

**Sorumluluklar**:
- Full-text search
- Autocomplete
- Advanced filtering
- Indexing

**Tech Stack**:
- Elasticsearch
- Node.js (API wrapper)
- Redis (autocomplete cache)

**API Endpoints**:
```
GET /api/search
GET /api/search/users
GET /api/search/posts
GET /api/search/parties
GET /api/search/autocomplete
```

---

### 9. Media Service

**Sorumluklar**:
- Image/video upload
- Image resizing
- Video transcoding
- CDN management

**Tech Stack**:
- Node.js
- AWS S3
- CloudFront (CDN)
- FFmpeg (video processing)
- Sharp (image processing)

**API Endpoints**:
```
POST /api/media/upload
GET  /api/media/:id
DELETE /api/media/:id
```

**Image Processing Pipeline**:
```javascript
async function processImage(file) {
  // 1. Upload original to S3
  const originalKey = await s3.upload(file);
  
  // 2. Generate thumbnails
  const sizes = [
    { name: 'thumb', width: 150, height: 150 },
    { name: 'small', width: 300, height: 300 },
    { name: 'medium', width: 600, height: 600 },
    { name: 'large', width: 1200, height: 1200 }
  ];
  
  const variants = await Promise.all(
    sizes.map(async (size) => {
      const resized = await sharp(file.buffer)
        .resize(size.width, size.height, { fit: 'inside' })
        .jpeg({ quality: 85 })
        .toBuffer();
      
      const key = await s3.upload(resized, `${size.name}_${file.name}`);
      return { size: size.name, url: getCDNUrl(key) };
    })
  );
  
  return {
    original: getCDNUrl(originalKey),
    variants
  };
}
```

---

## Event-Driven Architecture

### Message Queue (RabbitMQ)

**Exchange Types**:
- **Direct**: Belirli routing key'e göre
- **Topic**: Pattern matching ile
- **Fanout**: Tüm queue'lara broadcast

**Event Flow**:
```
Post Service (Publisher)
    ↓ publish('post.created')
RabbitMQ Exchange
    ↓ route to queues
├─→ Feed Service (update feeds)
├─→ Notification Service (notify followers)
├─→ Analytics Service (track event)
└─→ AI Service (analyze content)
```

**Event Schema**:
```typescript
interface Event {
  id: string;              // Unique event ID
  type: string;            // Event type (e.g., 'post.created')
  timestamp: Date;         // When event occurred
  source: string;          // Which service published
  data: any;               // Event payload
  metadata?: {
    user_id?: string;
    trace_id?: string;     // Distributed tracing
  };
}
```

**Event Examples**:
```javascript
// User events
'user.registered'
'user.verified'
'user.updated'
'user.deleted'

// Post events
'post.created'
'post.updated'
'post.deleted'
'post.liked'
'post.unliked'
'post.commented'
'post.shared'

// Follow events
'user.followed'
'user.unfollowed'

// Analytics events
'analytics.view'
'analytics.click'
'analytics.engagement'
```

---

## Load Balancing ve Scaling

### Load Balancer Setup (Nginx)

```nginx
upstream api_servers {
    least_conn;  # Load balancing method
    
    server api1.politplatform.com:3000 weight=3;
    server api2.politplatform.com:3000 weight=3;
    server api3.politplatform.com:3000 weight=2;
    server api4.politplatform.com:3000 backup;
}

server {
    listen 80;
    server_name api.politplatform.com;
    
    location / {
        proxy_pass http://api_servers;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        
        # Health check
        proxy_next_upstream error timeout http_502 http_503 http_504;
        proxy_connect_timeout 5s;
        proxy_send_timeout 10s;
        proxy_read_timeout 10s;
    }
}
```

### Horizontal Scaling Strategy

**Stateless Services**: Kolayca scale edilebilir
- API Gateway
- All microservices
- Web servers

**Stateful Services**: Dikkatli scale edilmeli
- Database (read replicas)
- Redis (cluster mode)
- Message queue (clustered)

**Auto-scaling Rules (Kubernetes)**:
```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: post-service-hpa
spec:
  scalacrTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: post-service
  minReplicas: 3
  maxReplicas: 20
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
  - type: Resource
    resource:
      name: memory
      target:
        type: Utilization
        averageUtilization: 80
  behavior:
    scaleDown:
      stabilizationWindowSeconds: 300
      policies:
      - type: Percent
        value: 50
        periodSeconds: 60
    scaleUp:
      stabilizationWindowSeconds: 0
      policies:
      - type: Percent
        value: 100
        periodSeconds: 15
```

---

## Caching Strategy

### Multi-Level Cache

```
┌─────────────────────┐
│  Browser Cache      │ (Static assets)
└──────────┬──────────┘
           │
┌──────────▼──────────┐
│  CDN Cache          │ (Images, videos, static)
└──────────┬──────────┘
           │
┌──────────▼──────────┐
│  Redis Cache        │ (API responses, sessions)
└──────────┬──────────┘
           │
┌──────────▼──────────┐
│  Application Cache  │ (In-memory)
└──────────┬──────────┘
           │
┌──────────▼──────────┐
│  Database           │
└─────────────────────┘
```

### Redis Caching Patterns

**1. Cache-Aside (Lazy Loading)**:
```javascript
async function getUser(userId) {
  // 1. Check cache
  const cached = await redis.get(`user:${userId}`);
  if (cached) return JSON.parse(cached);
  
  // 2. Cache miss: Query database
  const user = await db.users.findById(userId);
  
  // 3. Store in cache
  await redis.set(`user:${userId}`, JSON.stringify(user), 'EX', 3600);
  
  return user;
}
```

**2. Write-Through**:
```javascript
async function updateUser(userId, data) {
  // 1. Update database
  const updated = await db.users.update(userId, data);
  
  // 2. Update cache
  await redis.set(`user:${userId}`, JSON.stringify(updated), 'EX', 3600);
  
  return updated;
}
```

**3. Write-Behind (Async)**:
```javascript
async function incrementPostViews(postId) {
  // 1. Increment in Redis
  await redis.incr(`post:${postId}:views`);
  
  // 2. Async flush to database (batch every 5 minutes)
  await queue.add('flush-views', { postId });
}
```

### Cache Invalidation

```javascript
// Event-driven invalidation
eventBus.subscribe('user.updated', async (event) => {
  await redis.del(`user:${event.user_id}`);
  await redis.del(`user:profile:${event.user_id}`);
  await redis.del(`user:stats:${event.user_id}`);
});

eventBus.subscribe('post.created', async (event) => {
  // Invalidate author's feed caches
  const followers = await getFollowers(event.author_id);
  for (const followerId of followers) {
    await redis.del(`feed:${followerId}:following`);
    await redis.del(`feed:${followerId}:personalized`);
  }
});
```

---

## Real-time Sistemi

### WebSocket Architecture (Socket.io)

```javascript
// Server
const io = require('socket.io')(server, {
  cors: { origin: '*' },
  transports: ['websocket', 'polling']
});

// Authentication middleware
io.use(async (socket, next) => {
  const token = socket.handshake.auth.token;
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    socket.userId = decoded.sub;
    next();
  } catch (err) {
    next(new Error('Authentication error'));
  }
});

// Connection
io.on('connection', (socket) => {
  console.log(`User ${socket.userId} connected`);
  
  // Join user's personal room
  socket.join(`user:${socket.userId}`);
  
  // Join followed users' rooms for real-time updates
  const following = await getFollowing(socket.userId);
  following.forEach(userId => {
    socket.join(`updates:${userId}`);
  });
  
  // Mark user as online
  await redis.sadd('online:users', socket.userId);
  
  socket.on('disconnect', async () => {
    await redis.srem('online:users', socket.userId);
  });
});

// Real-time updates
eventBus.subscribe('post.liked', (event) => {
  // Notify post author
  io.to(`user:${event.post_author_id}`).emit('notification', {
    type: 'like',
    post_id: event.post_id,
    user_id: event.user_id
  });
});

eventBus.subscribe('post.created', (event) => {
  // Broadcast to followers
  io.to(`updates:${event.author_id}`).emit('new_post', {
    post_id: event.post_id,
    author_id: event.author_id
  });
});
```

### Client-side (React)

```javascript
import { io } from 'socket.io-client';

const socket = io('wss://api.politplatform.com', {
  auth: {
    token: localStorage.getItem('token')
  }
});

// Listen for notifications
socket.on('notification', (notification) => {
  showNotification(notification);
  updateNotificationBadge();
});

// Listen for new posts
socket.on('new_post', (post) => {
  prependToFeed(post);
});

// Typing indicator
const debouncedTyping = debounce(() => {
  socket.emit('typing', { conversationId: currentConversation });
}, 300);

textarea.addEventListener('input', debouncedTyping);
```

---

## CI/CD Pipeline

### GitHub Actions Workflow

```yaml
name: CI/CD Pipeline

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run tests
        run: npm test
      
      - name: Run linter
        run: npm run lint
      
      - name: Type check
        run: npm run type-check
  
  build:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Build Docker image
        run: docker build -t politplatform/api:${{ github.sha }} .
      
      - name: Push to registry
        run: |
          echo ${{ secrets.DOCKER_PASSWORD }} | docker login -u ${{ secrets.DOCKER_USERNAME }} --password-stdin
          docker push politplatform/api:${{ github.sha }}
  
  deploy:
    needs: build
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    steps:
      - name: Deploy to Kubernetes
        run: |
          kubectl set image deployment/api-deployment api=politplatform/api:${{ github.sha }}
          kubectl rollout status deployment/api-deployment
```

---

## Monitoring ve Logging

### Prometheus + Grafana

**Metrics to Track**:
- Request rate (req/sec)
- Response time (p50, p95, p99)
- Error rate
- CPU/Memory usage
- Database connections
- Cache hit rate
- Queue length

**Example Grafana Dashboard**:
```
┌─────────────────────────────────────────────┐
│ PolitPlatform - Service Health              │
├─────────────────────────────────────────────┤
│ Request Rate: 15,230 req/s  [▲ +12%]       │
│ Avg Response: 87ms          [▼ -5ms]        │
│ Error Rate: 0.02%           [▼ -0.01%]      │
├─────────────────────────────────────────────┤
│ [Graph: Request Rate (24h)]                 │
│ [Graph: Response Time Distribution]         │
│ [Graph: Error Rate]                          │
└─────────────────────────────────────────────┘
```

### Logging (ELK Stack)

**Structured Logging**:
```javascript
logger.info('User login successful', {
  user_id: user.id,
  ip_address: req.ip,
  user_agent: req.headers['user-agent'],
  timestamp: new Date(),
  duration_ms: Date.now() - startTime
});

logger.error('Database query failed', {
  query: 'SELECT * FROM users WHERE id = ?',
  error: error.message,
  stack: error.stack,
  user_id: userId
});
```

---

## Security

### OWASP Top 10 Mitigation

1. **Injection**: Prepared statements
2. **Broken Authentication**: JWT + 2FA
3. **Sensitive Data Exposure**: Encryption at rest/transit
4. **XML External Entities**: N/A (JSON only)
5. **Broken Access Control**: RBAC
6. **Security Misconfiguration**: Security headers
7. **XSS**: Input sanitization
8. **Insecure Deserialization**: Input validation
9. **Using Components with Known Vulnerabilities**: Dependency scanning
10. **Insufficient Logging**: Comprehensive logging

---

## Disaster Recovery

### Backup Strategy

- **Database**: Daily full backup + continuous WAL archiving
- **Media**: S3 versioning enabled
- **Config**: GitOps (all config in git)

### Recovery Time Objective (RTO): 1 hour
### Recovery Point Objective (RPO): 15 minutes

---

**Sonraki Dokümantasyon**: [08-API-DOCUMENTATION.md](./08-API-DOCUMENTATION.md)
