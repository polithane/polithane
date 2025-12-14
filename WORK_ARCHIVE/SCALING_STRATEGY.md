# 📈 Polithane - Ölçeklendirme Stratejisi

## 🎯 Hedef: 1M - 30M Anlık Ziyaretçi Kapasitesi

Bu doküman, Polithane'nin trafik arttıkça nasıl ölçeklendirileceğini detaylı olarak açıklar.

---

## 📊 Trafik Profilleri ve Eşikler

### Eşik 1: Pilot (0 - 10K günlük ziyaretçi)
**Durum:** İlk lansман, beta test
**Altyapı:** Minimum maliyet
**Odak:** Ürün geliştirme, kullanıcı geri bildirimi

### Eşik 2: Erken Büyüme (10K - 100K)
**Durum:** Organik büyüme başladı
**Altyapı:** Tek sunucu yeterli
**Odak:** Optimizasyon, performans iyileştirme

### Eşik 3: Hızlı Büyüme (100K - 1M)
**Durum:** Viral büyüme, medya ilgisi
**Altyapı:** Load balancing, caching
**Odak:** Stabilite, ölçeklenebilirlik

### Eşik 4: Mainstream (1M - 10M)
**Durum:** Ana akım sosyal medya
**Altyapı:** Microservices, sharding
**Odak:** Yüksek erişilebilirlik, global CDN

### Eşik 5: Enterprise (10M+)
**Durum:** Ulusal platform
**Altyapı:** Multi-region, disaster recovery
**Odak:** Güvenilirlik, compliance, audit

---

## 🏗️ Mimari Evrim

### Mimari 1: Monolith (0-100K)
```
┌─────────────┐
│   Vercel    │ Frontend
│  (React)    │
└──────┬──────┘
       │
┌──────▼──────┐
│   Hetzner   │ Backend (Node.js)
│   CX21      │ + PostgreSQL
└─────────────┘
```

**Avantajlar:**
- Basit deployment
- Düşük maliyet (€5/ay)
- Hızlı geliştirme

**Dezavantajlar:**
- Tek hata noktası
- Sınırlı ölçeklenebilirlik
- Tight coupling

### Mimari 2: Scalable Monolith (100K-1M)
```
┌─────────────┐
│ Cloudflare  │ CDN + DDoS Protection
└──────┬──────┘
       │
┌──────▼──────┐
│   Vercel    │ Frontend
└──────┬──────┘
       │
┌──────▼──────┐
│    Nginx    │ Load Balancer
└──────┬──────┘
       │
   ┌───┴───┐
   │   │   │
┌──▼─┐ │ ┌─▼──┐
│API1│ │ │API2│ Backend Instances
└──┬─┘ │ └─┬──┘
   │   │   │
   └───┼───┘
       │
┌──────▼──────┐
│ PostgreSQL  │ Master
│   + Redis   │
└──────┬──────┘
       │
   ┌───┴───┐
┌──▼──┐ ┌──▼──┐
│Rep1 │ │Rep2 │ Read Replicas
└─────┘ └─────┘
```

**Yeni Eklenenler:**
- Load balancer
- Multiple API instances
- Redis cache
- Database replication

**Maliyet:** €115/ay

### Mimari 3: Microservices (1M-10M)
```
┌─────────────────────────────────────┐
│         Cloudflare Edge             │
└───────────────┬─────────────────────┘
                │
┌───────────────▼─────────────────────┐
│         Kubernetes Cluster          │
│  ┌────────┐  ┌────────┐  ┌────────┐│
│  │Auth Svc│  │Post Svc│  │User Svc││
│  └───┬────┘  └───┬────┘  └───┬────┘│
│      │           │            │     │
│  ┌───▼───────────▼────────────▼───┐ │
│  │     Message Queue (BullMQ)     │ │
│  └────────────────────────────────┘ │
└─────────────────────────────────────┘
                │
        ┌───────┴───────┐
        │               │
┌───────▼────┐   ┌──────▼───────┐
│PostgreSQL  │   │Redis Cluster │
│  Cluster   │   │              │
│ (Sharded)  │   └──────────────┘
└────────────┘
        │
┌───────▼────────┐
│ Elasticsearch  │
└────────────────┘
```

**Servisler:**
1. **Auth Service:** Kimlik doğrulama
2. **User Service:** Profil, takip
3. **Post Service:** İçerik yönetimi
4. **Interaction Service:** Beğeni, yorum
5. **Polit Score Service:** Puan hesaplama
6. **Notification Service:** Bildirimler
7. **Media Service:** Resim/video upload
8. **Search Service:** Elasticsearch proxy
9. **Analytics Service:** Metrikler

**Maliyet:** €475/ay

### Mimari 4: Multi-Region (10M+)
```
┌──────────────────────────────────────┐
│      Cloudflare Global Anycast      │
└──────┬────────────────────┬──────────┘
       │                    │
┌──────▼──────┐      ┌──────▼──────┐
│EU Cluster   │      │US Cluster   │
│(Frankfurt)  │      │(New York)   │
└──────┬──────┘      └──────┬──────┘
       │                    │
       └────────┬───────────┘
                │
         ┌──────▼──────┐
         │Global DB    │
         │(Multi-Master│
         │ Replication)│
         └─────────────┘
```

**Yeni Özellikler:**
- Geo-distributed
- Multi-master replication
- Edge computing
- CDN optimization

**Maliyet:** €2000-5000/ay

---

## 🚦 Otomatik Ölçeklendirme (Auto-Scaling)

### Horizontal Pod Autoscaler (HPA)
**Kubernetes Configuration:**
```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: api-autoscaler
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: api-deployment
  minReplicas: 2
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
```

**Scaling Rules:**
- CPU > 70% → Scale up
- CPU < 30% (5 dakika) → Scale down
- Memory > 80% → Scale up
- Request queue > 100 → Scale up

### Database Auto-Scaling
**Read Replicas:**
```javascript
// Automatic replica routing
if (query.type === 'SELECT') {
  // Load balance across read replicas
  const replica = getHealthyReplica();
  return replica.query(sql);
} else {
  // Write to master
  return master.query(sql);
}
```

**Connection Pooling:**
```javascript
// pg-pool configuration
const pool = new Pool({
  min: 10,        // Minimum connections
  max: 100,       // Maximum connections
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});
```

---

## ⚡ Performans Optimizasyonları

### 1. Database Query Optimization

**N+1 Problem Çözümü:**
```javascript
// ❌ Kötü - N+1 queries
const posts = await Post.findAll();
for (const post of posts) {
  post.user = await User.findById(post.user_id);
  post.party = await Party.findById(post.user.party_id);
}

// ✅ İyi - Single query with joins
const posts = await Post.findAll({
  include: [
    { model: User, include: [Party] }
  ]
});
```

**Pagination:**
```javascript
// ✅ Cursor-based pagination (ölçeklenebilir)
const posts = await Post.findAll({
  where: { created_at: { $lt: cursor } },
  order: [['created_at', 'DESC']],
  limit: 20
});
```

### 2. Redis Caching Strategy

**Cache Hierarchy:**
```javascript
// L1: Application cache (in-memory)
const appCache = new NodeCache({ stdTTL: 60 });

// L2: Redis cache (distributed)
const redis = new Redis(REDIS_URL);

// L3: Database (source of truth)
const db = new PostgreSQL(DB_URL);

// Get with fallback
async function getPost(postId) {
  // Try L1
  let post = appCache.get(`post:${postId}`);
  if (post) return post;
  
  // Try L2
  post = await redis.get(`post:${postId}`);
  if (post) {
    appCache.set(`post:${postId}`, post);
    return JSON.parse(post);
  }
  
  // Fallback to L3
  post = await db.query('SELECT * FROM posts WHERE post_id = $1', [postId]);
  
  // Cache it
  await redis.setex(`post:${postId}`, 300, JSON.stringify(post));
  appCache.set(`post:${postId}`, post);
  
  return post;
}
```

**Cache Invalidation:**
```javascript
// Post updated → invalidate cache
async function updatePost(postId, data) {
  await db.query('UPDATE posts SET ... WHERE post_id = $1', [postId]);
  
  // Invalidate all cache layers
  appCache.del(`post:${postId}`);
  await redis.del(`post:${postId}`);
  
  // Notify other instances via Redis pub/sub
  await redis.publish('cache:invalidate', `post:${postId}`);
}
```

### 3. CDN & Static Asset Optimization

**Image Optimization:**
```javascript
// Cloudflare Images API
const optimizedUrl = `https://imagedelivery.net/${ACCOUNT_HASH}/${imageId}/public`;

// Responsive images
<img 
  src={`${optimizedUrl}/w=800`}
  srcSet={`
    ${optimizedUrl}/w=400 400w,
    ${optimizedUrl}/w=800 800w,
    ${optimizedUrl}/w=1200 1200w
  `}
  loading="lazy"
/>
```

**Bundle Optimization:**
- Code splitting (React.lazy)
- Tree shaking
- Minification
- Gzip/Brotli compression

---

## 🎯 Sansasyonel Gündem Senaryoları

### Senaryo: Ani Trafik Patlaması (10x)
**Trigger:** Büyük siyasi haber (darbe girişimi, erken seçim, vb.)

**Otomatik Tepkiler:**
1. **Auto-Scaling (2 dakika):**
   - API instances: 2 → 20
   - Read replicas: 2 → 5
   - Redis memory: 2GB → 8GB

2. **Rate Limiting Sıkılaştırma:**
   - Public API: 100 req/15min → 50 req/15min
   - Post creation: 10/hour → 5/hour
   - İstisna: Verified users

3. **Cache Aggressive Mode:**
   - TTL uzat: 5 min → 15 min
   - Cache more endpoints
   - Pre-warm hot data

4. **Database Protection:**
   - Read-only mode (yazma geçici durdur)
   - Priority queues (VIP users first)
   - Batch operations

**Manuel Müdahale (opsiyonel):**
- CDN cache artır
- Static content serve et
- Database connection limit artır
- Emergency scaling (double resources)

---

## 💰 Maliyet Optimizasyonu

### Gereksiz Harcamalardan Kaçınma

**❌ Kaçınılacaklar:**
- AWS EC2 (Hetzner'den 5x pahalı)
- AWS RDS (kendi PostgreSQL'imizi yönet)
- Managed Kubernetes (EKS, GKE - çok pahalı)
- Premium support (gereksiz)

**✅ Kullanılacaklar:**
- Hetzner Cloud (maliyet lideri)
- Cloudflare (ücretsiz tier muhteşem)
- BunnyCDN (ucuz, hızlı)
- Self-managed (kontrol + maliyet)

### Maliyet Tahminleri (Aylık)

| Ziyaretçi | Hetzner | AWS | Tasarruf |
|-----------|---------|-----|----------|
| 10K | €5 | €50 | 90% |
| 100K | €50 | €300 | 83% |
| 1M | €115 | €800 | 85% |
| 10M | €475 | €3500 | 86% |
| 30M | €1500 | €12000 | 87% |

---

## 📊 Monitoring & Alerting

### Kritik Metrikler

**RED Method (Rate, Errors, Duration):**
```javascript
// Prometheus metrics
const httpRequestDuration = new Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code']
});

const httpRequestRate = new Counter({
  name: 'http_requests_total',
  help: 'Total HTTP requests',
  labelNames: ['method', 'route', 'status_code']
});
```

**Alert Rules:**
```yaml
# Alert if API response time > 1s
- alert: HighAPILatency
  expr: http_request_duration_seconds{quantile="0.95"} > 1
  for: 5m
  labels:
    severity: warning
  annotations:
    summary: "High API latency detected"

# Alert if error rate > 5%
- alert: HighErrorRate
  expr: rate(http_requests_total{status_code=~"5.."}[5m]) > 0.05
  for: 2m
  labels:
    severity: critical
```

### Dashboard Metrikleri
1. **System Health:** CPU, RAM, Disk, Network
2. **Application:** Request rate, error rate, latency
3. **Database:** Query time, connections, cache hit rate
4. **Business:** DAU, post count, polit puan
5. **Cost:** Daily spending, resource utilization

---

## 🔄 Rollback Strategy (Geri Alma)

### Blue-Green Deployment
```
Production Traffic 100%
         │
    ┌────▼────┐
    │ Blue    │ Current version
    │ (v1.5)  │
    └─────────┘
    
    ┌─────────┐
    │ Green   │ New version (standby)
    │ (v1.6)  │
    └─────────┘

// Deployment sonrası
Production Traffic 100%
         │
    ┌─────────┐
    │ Blue    │ Old version (standby)
    │ (v1.5)  │
    └─────────┘
    
    ┌────▼────┐
    │ Green   │ New version (active)
    │ (v1.6)  │
    └─────────┘
```

**Rollback süresi:** < 30 saniye

### Database Migration Rollback
```sql
-- Migration script
BEGIN;
  -- Forward migration
  ALTER TABLE posts ADD COLUMN new_field TEXT;
  
  -- Rollback script (comment içinde)
  -- ALTER TABLE posts DROP COLUMN new_field;
COMMIT;
```

---

## 🎯 Başarı Kriterleri

### Teknik KPIs
- ✅ **Uptime:** 99.9% (yılda 8.76 saat downtime)
- ✅ **API Latency:** p95 < 200ms
- ✅ **Page Load:** < 2 saniye (mobil 4G)
- ✅ **Database Query:** p95 < 50ms
- ✅ **Cache Hit Rate:** > 80%

### Ölçeklendirme KPIs
- ✅ **Auto-scale Time:** < 2 dakika
- ✅ **Zero Downtime:** Deployment sırasında
- ✅ **Rollback Time:** < 30 saniye
- ✅ **Cost Per User:** < €0.001/ay

---

## 📅 Implementation Timeline

### Ay 1-2: Foundation
- Backend API (Node.js + Express)
- PostgreSQL schema
- Redis cache
- Basic monitoring

### Ay 3-4: Scaling Prep
- Load balancer setup
- Database replication
- CDN integration
- Auto-scaling config

### Ay 5-6: Microservices
- Service decomposition
- Message queue
- Kubernetes setup
- Advanced monitoring

### Ay 7-12: Optimization
- Performance tuning
- Cost optimization
- Security hardening
- Disaster recovery

---

**Son Güncelleme:** 27 Kasım 2025
**Durum:** Planlama Aşaması
**Hedef:** Production Ready (Q2 2025)
