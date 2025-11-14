# 🏛️ Siyasi Sosyal Medya Platformu - Kapsamlı Blueprint

## 📚 Dokümantasyon İndeksi

Bu proje, Türkiye'nin siyasi sosyal medya ekosistemi için kapsamlı bir platform blueprint'idir. Platform, Twitter + LinkedIn + e-Devlet + Parti Teşkilatı + Politika Analitiği özelliklerini birleştiren mega bir sistemdir.

### 📖 Ana Dokümantasyonlar

1. **[BLUEPRINT.md](./BLUEPRINT.md)** - Ana mimari dokümantasyonu
   - Genel mimari genel bakış
   - Kullanıcı rolleri ve yetkiler
   - Sayfa akışları
   - Yazılım mimarisi
   - Güvenlik ve ölçeklenebilirlik

2. **[POLITPUAN_ALGORITHM.md](./POLITPUAN_ALGORITHM.md)** - PolitPuan algoritması detayları
   - 5 katmanlı puanlama sistemi
   - Matematiksel formüller
   - Hesaplama örnekleri
   - Güncelleme stratejileri

3. **[DATA_MODELS.md](./DATA_MODELS.md)** - Veri modeli dokümantasyonu
   - PostgreSQL şemaları
   - Graph database (Neo4j) yapısı
   - TypeScript type definitions
   - Migration örnekleri

4. **[API_DOCUMENTATION.md](./API_DOCUMENTATION.md)** - API dokümantasyonu
   - Tüm REST API endpoint'leri
   - Request/Response örnekleri
   - WebSocket API
   - Error handling

5. **[IMPLEMENTATION_EXAMPLES.md](./IMPLEMENTATION_EXAMPLES.md)** - Kod örnekleri
   - Frontend bileşenleri (React/Next.js)
   - Backend servisleri (NestJS)
   - AI model örnekleri (Python)
   - Real-time örnekleri (Socket.io)

6. **[ORGANIZATION_MAP_MODULE.md](./ORGANIZATION_MAP_MODULE.md)** - Teşkilat ve harita modülü
   - Hiyerarşik yapı
   - Harita özellikleri
   - UI bileşenleri
   - API endpoint'leri

## 🎯 Platform Özellikleri

### Kullanıcı Rolleri

- **Vatandaş (Doğrulanmamış)** - Temel görüntüleme ve sınırlı etkileşim
- **Doğrulanmış Vatandaş** - Tam özellikli vatandaş deneyimi
- **Parti Üyesi** - Parti içi içerik ve etkileşim
- **Siyasetçi** - İlçe/İl/Genel Merkez seviyelerinde
- **Milletvekili** - TBMM entegrasyonu ve seçim bölgesi yönetimi
- **Gazeteci** - Medya merkezi ve fact-checking araçları
- **Teşkilat Yöneticileri** - İl/İlçe başkanları, kollar
- **Parti Genel Merkez Admin** - Parti genelinde yönetim
- **Sistem Administrator** - Platform genelinde yönetim

### PolitPuan Süper Algoritması

5 katmanlı puanlama sistemi:

1. **Katman 1:** Temel etkileşim puanı (son 5 post ağırlıklı)
2. **Katman 2:** Kullanıcının genel etki profili (takipçi, meslek, bölge, vb.)
3. **Katman 3:** İçeriğin türü (metin, görsel, video, canlı yayın, vb.)
4. **Katman 4:** İçeriğin siyasi gerilim derecesi (AI analiz)
5. **Katman 5:** Zamanlama ve trend etkisi (seçim dönemi, gündem, viral potansiyel)

### Ana Özellikler

- ✅ **Kişiselleştirilmiş Feed'ler** (Genel, Parti, Yerel, Takip, Trend, Medya, Önerilen)
- ✅ **Teşkilat Yapılanması** (İl → İlçe → Mahalle → Sandık hiyerarşisi)
- ✅ **İnteraktif Harita** (Türkiye haritası üzerinde teşkilat görselleştirmesi)
- ✅ **Medya Merkezi** (Haberler, fact-checking, röportajlar)
- ✅ **AI Destekli Gündem** (Otomatik gündem üretimi ve analiz)
- ✅ **Siyasi Analitik Paneli** (İmaj skoru, trend analizi, rakip karşılaştırma)
- ✅ **AI İçerik Motoru** (Paylaşım önerileri, konuşma metni önerileri)
- ✅ **Real-time Bildirimler** (WebSocket tabanlı)
- ✅ **Rozet Sistemi** (PolitPuan bazlı gamification)

## 🏗️ Teknoloji Stack

### Frontend
- Next.js 14+ (React 18+)
- TypeScript
- Tailwind CSS
- React Query / SWR
- Socket.io Client
- Mapbox / Leaflet
- Recharts / D3.js

### Backend
- Node.js / NestJS
- TypeScript
- PostgreSQL
- Neo4j / TigerGraph
- Redis
- Elasticsearch

### AI/ML
- Python FastAPI
- TensorFlow / PyTorch
- Transformers (Hugging Face)
- BERT-based Turkish NLP

### Infrastructure
- Docker & Kubernetes
- AWS / Azure / GCP
- CDN (CloudFront / Cloudflare)
- Message Queue (RabbitMQ / Kafka)

## 📊 Veri Modeli Özeti

### Ana Varlıklar
- **Users** - Kullanıcılar ve profilleri
- **Posts** - İçerikler (metin, görsel, video, canlı yayın, anket)
- **Interactions** - Etkileşimler (beğeni, yorum, paylaşım, kaydetme)
- **Parties** - Siyasi partiler
- **Organizations** - Teşkilat yapılanması
- **MediaArticles** - Medya haberleri
- **Agendas** - Gündem konuları
- **PolitPuanHistory** - Puan geçmişi
- **Analytics** - Analitik veriler

### Graph Database İlişkileri
- User → FOLLOWS → User
- User → MEMBER_OF → Party
- User → LEADS → Organization
- Post → CREATED_BY → User
- Post → ABOUT → Topic
- Organization → PART_OF → Organization

## 🚀 Hızlı Başlangıç

### Gereksinimler
- Node.js 18+
- PostgreSQL 14+
- Redis 6+
- Docker (opsiyonel)

### Kurulum

```bash
# Repository'yi klonlayın
git clone <repository-url>
cd polit-platform

# Bağımlılıkları yükleyin
npm install

# Environment değişkenlerini ayarlayın
cp .env.example .env
# .env dosyasını düzenleyin

# Veritabanını oluşturun
npm run db:migrate

# Development server'ı başlatın
npm run dev
```

## 📝 Dokümantasyon Kullanımı

1. **Yeni başlayanlar için:** [BLUEPRINT.md](./BLUEPRINT.md) dosyasından başlayın
2. **PolitPuan algoritması için:** [POLITPUAN_ALGORITHM.md](./POLITPUAN_ALGORITHM.md)
3. **Veri modeli için:** [DATA_MODELS.md](./DATA_MODELS.md)
4. **API entegrasyonu için:** [API_DOCUMENTATION.md](./API_DOCUMENTATION.md)
5. **Kod örnekleri için:** [IMPLEMENTATION_EXAMPLES.md](./IMPLEMENTATION_EXAMPLES.md)
6. **Harita modülü için:** [ORGANIZATION_MAP_MODULE.md](./ORGANIZATION_MAP_MODULE.md)

## 🔒 Güvenlik

- JWT tabanlı kimlik doğrulama
- TC Kimlik No şifreleme (AES-256)
- Role-Based Access Control (RBAC)
- API rate limiting
- Input validation
- SQL injection koruması
- XSS koruması
- CSRF koruması

## 📈 Ölçeklenebilirlik

- Mikroservis mimarisi
- Horizontal scaling
- Database read replicas
- Redis caching
- CDN kullanımı
- Message queue ile async işlemler

## 🤝 Katkıda Bulunma

Bu blueprint açık kaynaklıdır ve geliştirmeye açıktır. Katkıda bulunmak için:

1. Fork edin
2. Feature branch oluşturun (`git checkout -b feature/amazing-feature`)
3. Commit edin (`git commit -m 'Add amazing feature'`)
4. Push edin (`git push origin feature/amazing-feature`)
5. Pull Request açın

## 📄 Lisans

Bu proje [MIT Lisansı](./LICENSE) altında lisanslanmıştır.

## 📞 İletişim

Sorularınız veya önerileriniz için issue açabilirsiniz.

---

**Not:** Bu blueprint, platformun tüm bileşenlerini kapsamlı bir şekilde açıklamaktadır. Implementasyon sırasında bu dokümantasyonlar referans alınmalıdır.
