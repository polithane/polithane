# 🏗️ Polithane - Altyapı Mimarisi

## 📊 Hedef Trafik Profili

- **İlk Aşama:** 10K - 100K günlük ziyaretçi
- **Orta Vadeli:** 1M günlük ziyaretçi
- **Hedef:** 1M - 30M anlık ziyaretçi kapasitesi
- **Özel Durum:** Sansasyonel siyasi gündemlerde ani trafik patlamaları

## 🎯 Mimari Felsefesi

### İlkeler
1. **Ücretsiz Başla:** Minimum maliyetle başla
2. **Kademeli Ölçeklendirme:** Trafik arttıkça altyapıyı büyüt
3. **Fiyat-Performans:** AWS gibi pahalı çözümlerden kaçın
4. **Otomatik Ölçeklendirme:** Manuel müdahale gerektirmeyen sistem

---

## 🔧 Teknoloji Yığını (Tech Stack)

### Frontend
- **Framework:** React 18 + Vite
- **Styling:** Tailwind CSS
- **State:** Context API + React Query (gelecek)
- **Hosting:** Vercel (ücretsiz + otomatik ölçeklendirme)
- **CDN:** Cloudflare (ücretsiz + global edge network)

### Backend
- **Runtime:** Node.js 20 LTS
- **Framework:** Express.js + TypeScript
- **API Style:** RESTful + GraphQL (opsiyonel)
- **Validation:** Zod / Joi
- **Documentation:** Swagger / OpenAPI

### Database (Çok Katmanlı)
**Primary Database:**
- **PostgreSQL 16** (kullanıcı, post, ilişkiler)
- **Sharding Stratejisi:** Kullanıcı ID bazlı horizontal sharding
- **Replication:** Master-Slave (1 master + 2-3 read replicas)

**Cache Layer:**
- **Redis Cluster** (oturum, hot data, rate limiting)
- **TTL Stratejisi:** 
  - Hot posts: 5 dakika
  - User profiles: 15 dakika
  - Static content: 1 saat

**Analytics & Logs:**
- **MongoDB** (kullanıcı aktivite logları, analytics)
- **Time-series:** TimescaleDB (metrics, polit puan geçmişi)

**Search Engine:**
- **Elasticsearch** (post arama, kullanıcı arama, gündem arama)
- **Meilisearch** (hafif alternatif - ilk aşamada)

### Message Queue & Background Jobs
- **BullMQ** (Redis tabanlı job queue)
- **Use Cases:**
  - Polit puan hesaplama (async)
  - Bildirim gönderimi (async)
  - Email gönderimi (async)
  - Resim optimizasyonu (async)

### Media Storage & CDN
**Faz 1 (Ücretsiz):**
- **Cloudflare R2** (S3-compatible, ücretsiz 10GB)
- **Cloudflare Images** (resim optimizasyonu, ücretsiz 100K/ay)

**Faz 2 (Ücretli - Trafik arttıkça):**
- **Hetzner Object Storage** (S3-compatible, €5/TB)
- **BunnyCDN** ($10/TB - AWS CloudFront'tan 10x ucuz)

### Real-time Features
- **Socket.io** (WebSocket - bildirimler, canlı güncellemeler)
- **Server-Sent Events (SSE)** (hafif alternatif)

---

## 🌐 Cloud Provider Stratejisi

### Faz 1: Ücretsiz / Minimal Maliyet (0-100K ziyaretçi)
**Hosting:**
- **Frontend:** Vercel (ücretsiz, otomatik SSL, global CDN)
- **Backend:** Hetzner Cloud CX21 (2 vCPU, 4GB RAM, €5/ay)
- **Database:** Supabase (ücretsiz PostgreSQL + realtime)
- **Cache:** Upstash Redis (ücretsiz tier, 10K komut/gün)
- **Storage:** Cloudflare R2 (ücretsiz 10GB)
- **CDN:** Cloudflare (ücretsiz)

**Toplam Maliyet:** ~€5/ay ($5.50)

### Faz 2: Büyüme (100K - 1M ziyaretçi)
**Hosting:**
- **Backend:** Hetzner CPX31 (4 vCPU, 8GB RAM, €15/ay) x2 instances
- **Database:** Hetzner CCX33 (8 vCPU, 32GB RAM, €50/ay)
  - PostgreSQL (master)
  - Read replicas: 2x CPX21 (€10/ay each)
- **Redis:** Hetzner CPX11 (2 vCPU, 2GB RAM, €5/ay)
- **Storage:** BunnyCDN (€10/TB)
- **Load Balancer:** Hetzner Load Balancer (€5/ay)

**Toplam Maliyet:** ~€115/ay ($125) + trafik maliyeti

### Faz 3: Ölçeklendirme (1M - 10M ziyaretçi)
**Kubernetes Cluster (Hetzner):**
- **Master Nodes:** 3x CX21 (€15/ay)
- **Worker Nodes:** 5x CPX31 (€75/ay) - auto-scaling
- **Database Cluster:** 
  - Master: CCX53 (16 vCPU, 64GB, €125/ay)
  - Replicas: 3x CCX33 (€150/ay)
- **Redis Cluster:** 3x CPX21 (€30/ay)
- **Elasticsearch:** 2x CPX41 (€80/ay)

**Toplam Maliyet:** ~€475/ay ($520) + trafik

### Faz 4: Enterprise (10M+ ziyaretçi)
**Hybrid Multi-Cloud:**
- **Primary:** Hetzner (maliyet avantajı)
- **CDN & Edge:** Cloudflare Enterprise
- **Database:** Managed PostgreSQL (Aiven / Timescale Cloud)
- **Monitoring:** Datadog / Grafana Cloud

**Toplam Maliyet:** €2000-5000/ay ($2200-5500) + trafik

---

## 📈 Ölçeklendirme Stratejisi

### Horizontal Scaling (Yatay Ölçeklendirme)
**Backend Services:**
- **API Servers:** 1 → 2 → 5 → 10+ instances
- **Load Balancing:** Nginx / HAProxy / Hetzner LB
- **Session Management:** Redis (shared sessions)
- **Sticky Sessions:** Kullanma (stateless API)

**Database:**
- **Read Replicas:** Master + 2-3 slaves
- **Sharding:** Kullanıcı ID bazlı (user_id % N)
  - Shard 1: user_id % 4 = 0
  - Shard 2: user_id % 4 = 1
  - Shard 3: user_id % 4 = 2
  - Shard 4: user_id % 4 = 3

### Vertical Scaling (Dikey Ölçeklendirme)
**Database Sunucuları:**
- Başlangıç: 2 vCPU, 4GB RAM
- Büyüme: 4 vCPU, 8GB RAM
- Ölçek: 8 vCPU, 32GB RAM
- Enterprise: 16 vCPU, 64GB RAM

### Caching Stratejisi
**Cache Katmanları:**
1. **L1 - Application Cache:** In-memory (node-cache)
   - Hot posts (1000 adet)
   - User sessions
   - Rate limit counters
   
2. **L2 - Redis Cache:** Distributed cache
   - Post metadata (5 dakika TTL)
   - User profiles (15 dakika TTL)
   - Gündem listesi (10 dakika TTL)
   
3. **L3 - CDN Cache:** Edge caching
   - Static assets (1 yıl)
   - Images (1 ay)
   - API responses (1-5 dakika)

### Database Query Optimization
**Index Stratejisi:**
```sql
-- Kritik indexler
CREATE INDEX idx_posts_created_at ON posts(created_at DESC);
CREATE INDEX idx_posts_polit_score ON posts(polit_score DESC);
CREATE INDEX idx_posts_user_id ON posts(user_id);
CREATE INDEX idx_posts_agenda_tag ON posts(agenda_tag);

-- Composite indexler
CREATE INDEX idx_posts_type_score ON posts(content_type, polit_score DESC);
CREATE INDEX idx_posts_user_created ON posts(user_id, created_at DESC);

-- Full-text search (PostgreSQL)
CREATE INDEX idx_posts_content_fts ON posts USING gin(to_tsvector('turkish', content_text));
```

**Query Caching:**
- Sık kullanılan sorgular Redis'te cache'le
- Prepared statements kullan
- Connection pooling (max 100 connection)

---

## 🚀 Deployment Stratejisi

### CI/CD Pipeline
**GitHub Actions:**
```yaml
# .github/workflows/deploy.yml
Trigger: Push to main
Steps:
1. Run tests (Jest + Cypress)
2. Build frontend (Vite)
3. Deploy frontend to Vercel (auto)
4. Build backend Docker image
5. Push to Docker Registry (Hetzner)
6. Deploy to production (Blue-Green deployment)
7. Run smoke tests
8. Rollback if fail
```

**Deployment Süreci:**
1. **Blue-Green Deployment:** Sıfır downtime
2. **Canary Release:** %10 trafik → test → %100
3. **Auto Rollback:** Hata durumunda otomatik geri dön

### Monitoring & Alerts
**Metrics:**
- **Server:** CPU, RAM, Disk, Network
- **Application:** Request rate, error rate, latency
- **Database:** Query time, connection count, cache hit rate
- **Business:** DAU, post count, polit puan calculation time

**Tools:**
- **Prometheus + Grafana** (metrics)
- **Loki** (log aggregation)
- **Sentry** (error tracking)
- **UptimeRobot** (uptime monitoring - ücretsiz)

**Alert Channels:**
- Email (kritik hatalar)
- Telegram Bot (tüm alertler)
- PagerDuty (production down - opsiyonel)

---

## 🛡️ Security & Reliability

### Rate Limiting
**Redis tabanlı:**
- **Public API:** 100 req/15min per IP
- **Authenticated API:** 1000 req/15min per user
- **Post Creation:** 10 post/hour per user
- **Like/Comment:** 500 action/hour per user

### DDoS Protection
- **Cloudflare:** Auto DDoS protection (ücretsiz)
- **Rate limiting:** API seviyesinde
- **IP Blacklisting:** Otomatik (suspicious patterns)

### Backup Strategy
**Database Backup:**
- **Daily:** Full backup (otomatik, 7 gün sakla)
- **Hourly:** Incremental backup (24 saat sakla)
- **Storage:** Hetzner Storage Box (€3/TB/ay)

**Recovery Time Objective (RTO):** 15 dakika
**Recovery Point Objective (RPO):** 1 saat

---

## 💰 Maliyet Karşılaştırması

### AWS vs Hetzner (Aylık)
**10M ziyaretçi için örnek:**

| Service | AWS | Hetzner + Cloudflare | Tasarruf |
|---------|-----|---------------------|----------|
| Compute | $500 | $100 | 80% |
| Database | $300 | $125 | 58% |
| Storage | $200 | $30 | 85% |
| CDN/Traffic | $400 | $50 | 87% |
| Load Balancer | $20 | $5 | 75% |
| **TOPLAM** | **$1420** | **$310** | **78%** |

**Yıllık Tasarruf:** ~$13,000

---

## 🔄 Migration Path (Göç Yol Haritası)

### Faz 1 → Faz 2 (100K ziyaretçi eşiği)
**Adımlar:**
1. Hetzner hesabı aç
2. Backend'i Docker'a taşı
3. PostgreSQL migrate et (pg_dump/restore)
4. DNS geçişi (zero downtime)
5. Monitoring kur

**Süre:** 1 gün
**Downtime:** 0 dakika

### Faz 2 → Faz 3 (1M ziyaretçi eşiği)
**Adımlar:**
1. Kubernetes cluster kur
2. Microservices'e geç (kademeli)
3. Database sharding uygula
4. Redis cluster kur
5. Elasticsearch entegre et

**Süre:** 2-4 hafta
**Downtime:** 0 dakika

---

## 📅 Timeline (Zaman Çizelgesi)

### Q1 2025: Foundation (Temel)
- ✅ Frontend (React + Vite) - TAMAMLANDI
- ⏳ Backend API (Node.js + Express)
- ⏳ PostgreSQL schema + mock data
- ⏳ Authentication (JWT)
- ⏳ Basic CRUD operations

### Q2 2025: Core Features (Ana Özellikler)
- Polit Puan algoritması (real-time)
- File upload (images, videos)
- Real-time notifications (Socket.io)
- Search functionality (Meilisearch)
- Admin panel (moderation)

### Q3 2025: Scaling (Ölçeklendirme)
- Redis caching
- Database optimization
- CDN integration
- Monitoring & alerts
- Load testing

### Q4 2025: Advanced (İleri Seviye)
- Microservices migration
- Kubernetes deployment
- Analytics dashboard
- Mobile app (React Native)
- SEO optimization

---

## 🎯 Kritik Başarı Metrikleri (KPIs)

### Teknik Metrikler
- **Uptime:** >99.9% (yılda max 8.76 saat downtime)
- **API Response Time:** p95 < 200ms
- **Page Load Time:** < 2 saniye
- **Database Query Time:** p95 < 50ms

### İş Metrikleri
- **Daily Active Users (DAU):** 1M+
- **Post Creation Rate:** 10K+/gün
- **Polit Puan Generated:** 100M+/gün
- **Search Queries:** 500K+/gün

---

## 🔮 Gelecek Teknolojiler

### Yakın Gelecek (6-12 ay)
- **Edge Computing:** Cloudflare Workers (API'leri edge'e taşı)
- **GraphQL:** REST'e ek olarak GraphQL API
- **WebAssembly:** Kritik hesaplamalar için WASM

### Uzak Gelecek (1-2 yıl)
- **Machine Learning:** İçerik önerisi, spam tespiti
- **Blockchain:** Şeffaflık için immutable audit log
- **AR/VR:** Siyasi etkinliklerde metaverse deneyimi

---

**Son Güncelleme:** 27 Kasım 2025
**Statü:** Aktif Geliştirme
**Versiyon:** 1.0.0-alpha
