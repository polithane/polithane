# Yazılım Mimarisi

## Mikroservis Yapısı

```
┌─────────────────────────────────────────────────────────┐
│                    API Gateway                          │
│              (Kong / AWS API Gateway)                   │
└────────────┬────────────────────────────────────────────┘
             │
    ┌────────┴────────┬──────────────┬──────────────┐
    │                 │              │              │
    ▼                 ▼              ▼              ▼
┌─────────┐    ┌──────────┐   ┌──────────┐  ┌──────────┐
│  User   │    │ Content  │   │Analytics │  │   AI    │
│ Service │    │ Service  │   │ Service  │  │ Service │
└─────────┘    └──────────┘   └──────────┘  └──────────┘
    │                 │              │              │
    ▼                 ▼              ▼              ▼
┌─────────┐    ┌──────────┐   ┌──────────┐  ┌──────────┐
│Notification│ │  Media   │   │Location │  │  Search  │
│  Service   │ │ Service  │   │ Service │  │ Service  │
└─────────┘    └──────────┘   └──────────┘  └──────────┘
```

## Servis Detayları

### 1. User Service
**Teknoloji**: Node.js + Express/NestJS  
**Database**: PostgreSQL  
**Sorumluluklar**:
- Kullanıcı kaydı ve doğrulama
- Rol yönetimi
- Profil yönetimi
- Takipçi/takip sistemi
- Yetkilendirme

**API Endpoints**:
```
POST   /api/users/register
POST   /api/users/login
GET    /api/users/:id
PUT    /api/users/:id
DELETE /api/users/:id
GET    /api/users/:id/followers
GET    /api/users/:id/following
POST   /api/users/:id/follow
DELETE /api/users/:id/follow
GET    /api/users/:id/roles
PUT    /api/users/:id/roles
```

### 2. Content Service
**Teknoloji**: Node.js + Express/NestJS  
**Database**: PostgreSQL + MongoDB (medya için)  
**Sorumluluklar**:
- Post oluşturma/güncelleme/silme
- İçerik moderasyonu
- Etkileşimler (beğeni, yorum, paylaşım)
- Feed oluşturma
- İçerik arama

**API Endpoints**:
```
POST   /api/posts
GET    /api/posts/:id
PUT    /api/posts/:id
DELETE /api/posts/:id
GET    /api/posts/feed
POST   /api/posts/:id/like
POST   /api/posts/:id/comment
POST   /api/posts/:id/share
GET    /api/posts/search
```

### 3. Analytics Service
**Teknoloji**: Python + FastAPI  
**Database**: PostgreSQL + ClickHouse (time-series)  
**Sorumluluklar**:
- PolitPuan hesaplama
- Kullanıcı analitiği
- İçerik performans analizi
- Trend analizi
- Raporlama

**API Endpoints**:
```
GET    /api/analytics/user/:id
GET    /api/analytics/post/:id
GET    /api/analytics/trending
POST   /api/analytics/calculate-politpuan
GET    /api/analytics/comparison
```

### 4. AI Service
**Teknoloji**: Python + FastAPI  
**ML Framework**: TensorFlow, PyTorch  
**Sorumluluklar**:
- Sentiment analizi
- İçerik kategorizasyonu
- Gerilim tespiti
- Partizanlık analizi
- Öneri sistemi
- İçerik önerileri

**API Endpoints**:
```
POST   /api/ai/analyze-sentiment
POST   /api/ai/detect-tension
POST   /api/ai/detect-partisanship
POST   /api/ai/recommend-content
POST   /api/ai/generate-suggestion
POST   /api/ai/fact-check
```

### 5. Notification Service
**Teknoloji**: Node.js + Express  
**Message Queue**: RabbitMQ/Kafka  
**Sorumluluklar**:
- Bildirim oluşturma
- Push notification
- Email bildirimleri
- SMS bildirimleri
- In-app bildirimler

**API Endpoints**:
```
GET    /api/notifications
POST   /api/notifications
PUT    /api/notifications/:id/read
DELETE /api/notifications/:id
```

### 6. Media Service
**Teknoloji**: Node.js + Express  
**Storage**: AWS S3 / MinIO  
**Sorumluluklar**:
- Medya yükleme
- Medya işleme (resize, optimize)
- CDN entegrasyonu
- Haber yönetimi

**API Endpoints**:
```
POST   /api/media/upload
GET    /api/media/:id
DELETE /api/media/:id
GET    /api/media/news
POST   /api/media/news
```

### 7. Location Service
**Teknoloji**: Node.js + Express  
**Database**: PostgreSQL (PostGIS)  
**Sorumluluklar**:
- Konum yönetimi (İl/İlçe/Mahalle/Sandık)
- Harita verileri
- Teşkilat yapısı
- Coğrafi sorgular

**API Endpoints**:
```
GET    /api/locations/cities
GET    /api/locations/cities/:id/districts
GET    /api/locations/districts/:id/neighborhoods
GET    /api/locations/organizations/:locationId
```

### 8. Search Service
**Teknoloji**: Elasticsearch  
**Sorumluluklar**:
- Full-text search
- Faceted search
- Autocomplete
- Geospatial search

**API Endpoints**:
```
GET    /api/search
GET    /api/search/users
GET    /api/search/posts
GET    /api/search/autocomplete
```

## Veri Akış Diyagramı

### Post Oluşturma Akışı

```
User → API Gateway → Content Service
                          │
                          ├─→ PostgreSQL (Post kaydet)
                          ├─→ AI Service (İçerik analizi)
                          │       │
                          │       └─→ Sentiment/Tension/Partisanship
                          │
                          ├─→ Analytics Service (PolitPuan hesapla)
                          │       │
                          │       └─→ ClickHouse (Metrik kaydet)
                          │
                          ├─→ Notification Service (Takipçilere bildir)
                          │       │
                          │       └─→ RabbitMQ → Push/Email/SMS
                          │
                          └─→ Search Service (Index'e ekle)
                                  │
                                  └─→ Elasticsearch
```

### Feed Oluşturma Akışı

```
User → API Gateway → Content Service
                          │
                          ├─→ Redis Cache (Cache kontrol)
                          │       │
                          │       └─→ Cache Hit → Return
                          │
                          ├─→ PostgreSQL (Post sorgula)
                          │       │
                          │       ├─→ Filter by role/visibility
                          │       ├─→ Filter by location
                          │       └─→ Filter by party
                          │
                          ├─→ AI Service (Öneri sistemi)
                          │       │
                          │       └─→ ML Model → Önerilen içerikler
                          │
                          └─→ Analytics Service (PolitPuan sıralama)
                                  │
                                  └─→ Sort by PolitPuan
```

## Event-Driven Architecture

### Event Bus: RabbitMQ / Apache Kafka

**Event Types**:

1. **User Events**
   - `user.created`
   - `user.updated`
   - `user.role.changed`
   - `user.followed`
   - `user.unfollowed`

2. **Content Events**
   - `post.created`
   - `post.updated`
   - `post.deleted`
   - `post.liked`
   - `post.commented`
   - `post.shared`

3. **Analytics Events**
   - `politpuan.calculated`
   - `trend.detected`
   - `viral.content`

4. **AI Events**
   - `content.analyzed`
   - `sentiment.detected`
   - `tension.detected`

### Event Handlers

```
Event Bus
    │
    ├─→ Analytics Service (Metrikleri güncelle)
    ├─→ Notification Service (Bildirim oluştur)
    ├─→ Search Service (Index güncelle)
    └─→ Cache Service (Cache invalidation)
```

## Real-time Socket Yapısı

**Teknoloji**: Socket.io / WebSocket

**Channels**:
- `user:{userId}` - Kullanıcıya özel bildirimler
- `post:{postId}` - Post etkileşimleri
- `feed:{feedType}` - Feed güncellemeleri
- `agenda:{agendaId}` - Gündem güncellemeleri
- `live:{liveId}` - Canlı yayın

**Event Types**:
- `new_post`
- `new_like`
- `new_comment`
- `new_follower`
- `politpuan_updated`
- `trending_update`

## Caching Stratejisi

### Redis Cache Layers

1. **L1 Cache (In-Memory)**
   - User sessions
   - Frequently accessed posts
   - Feed cache

2. **L2 Cache (Redis)**
   - User profiles
   - Post details
   - Feed results
   - PolitPuan scores

3. **L3 Cache (CDN)**
   - Static assets
   - Media files
   - API responses (public)

### Cache Invalidation

```
Event → Event Bus → Cache Service
                        │
                        └─→ Redis (Key invalidation)
```

## Database Schema

### PostgreSQL (Ana Veritabanı)

**Sharding Strategy**: Location-based (İl bazlı)

**Tables**:
- users
- posts
- interactions
- parties
- organizations
- locations
- media
- agenda
- notifications
- tasks
- complaints

### Neo4j (Graph Database)

**Nodes**: User, Post, Party, Location, Topic  
**Relationships**: FOLLOWS, LIKES, COMMENTS, SHARES, BELONGS_TO, LOCATED_IN

**Use Cases**:
- Ağ analizi
- Öneri sistemi
- Viral potansiyel tahmini
- Parti içi ilişkiler

### ClickHouse (Time-Series)

**Tables**:
- politpuan_history
- engagement_metrics
- trend_data

**Use Cases**:
- PolitPuan geçmişi
- Trend analizi
- Zaman serisi analizi

## Load Balancer / Cluster Topolojisi

```
                    ┌─────────────┐
                    │   CDN       │
                    │ (CloudFlare)│
                    └──────┬──────┘
                           │
                    ┌──────┴──────┐
                    │ Load Balancer│
                    │   (Nginx)    │
                    └──────┬──────┘
                           │
        ┌──────────────────┼──────────────────┐
        │                  │                  │
        ▼                  ▼                  ▼
┌─────────────┐   ┌─────────────┐   ┌─────────────┐
│ API Gateway │   │ API Gateway │   │ API Gateway │
│   Node 1    │   │   Node 2    │   │   Node 3    │
└──────┬──────┘   └──────┬──────┘   └──────┬──────┘
       │                 │                 │
       └─────────────────┼─────────────────┘
                         │
        ┌────────────────┼────────────────┐
        │                │                │
        ▼                ▼                ▼
   [Microservices]  [Microservices]  [Microservices]
        │                │                │
        └────────────────┼────────────────┘
                         │
        ┌────────────────┼────────────────┐
        │                │                │
        ▼                ▼                ▼
   [Databases]      [Redis Cluster]   [Message Queue]
```

## Güvenlik Mimarisi

### Authentication & Authorization

**JWT Token Strategy**:
- Access Token (15 min expiry)
- Refresh Token (7 days expiry)
- Role-based access control (RBAC)

**API Security**:
- Rate limiting (per user/IP)
- CORS configuration
- Input validation
- SQL injection prevention
- XSS protection

### Data Security

- Encryption at rest (AES-256)
- Encryption in transit (TLS 1.3)
- PII masking
- GDPR compliance
- Audit logging

## Monitoring & Logging

### Monitoring Stack

- **APM**: New Relic / Datadog
- **Metrics**: Prometheus + Grafana
- **Logging**: ELK Stack (Elasticsearch, Logstash, Kibana)
- **Alerting**: PagerDuty / Opsgenie

### Key Metrics

- Request latency (p50, p95, p99)
- Error rate
- Throughput (RPS)
- Database query performance
- Cache hit rate
- PolitPuan calculation time
- AI service latency

## Deployment Strategy

### Containerization

- **Docker** containers
- **Kubernetes** orchestration
- **Helm** charts for deployment

### CI/CD Pipeline

```
Git Push → GitHub Actions
              │
              ├─→ Build Docker Images
              ├─→ Run Tests
              ├─→ Security Scan
              └─→ Deploy to Kubernetes
```

### Environment Strategy

- **Development**: Local Docker Compose
- **Staging**: Kubernetes cluster
- **Production**: Multi-region Kubernetes

## Scaling Strategy

### Horizontal Scaling

- Stateless microservices → Auto-scaling
- Database read replicas
- Redis cluster
- Message queue partitioning

### Vertical Scaling

- Database optimization
- Query optimization
- Index optimization
- Cache optimization

## Disaster Recovery

- Multi-region deployment
- Database replication
- Automated backups
- RTO: 1 hour
- RPO: 15 minutes
