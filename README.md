# 🏛️ Siyasi Sosyal Medya Platformu

Twitter + LinkedIn + e-Devlet + Partilerin Teşkilat Yapısı + Politika Analitiği karması mega platform.

## 📚 Dokümantasyon

Tüm detaylı dokümantasyon için:

- **[BLUEPRINT.md](./BLUEPRINT.md)** - Genel bakış ve özet
- **[docs/DATA_MODEL.md](./docs/DATA_MODEL.md)** - Veri modeli ve TypeScript tipleri
- **[docs/ALGORITHMS.md](./docs/ALGORITHMS.md)** - Algoritma detayları (PolitPuan, AI analiz)
- **[docs/PAGE_FLOWS.md](./docs/PAGE_FLOWS.md)** - Sayfa akışları ve navigasyon
- **[docs/ORGANIZATION.md](./docs/ORGANIZATION.md)** - Teşkilat yapılanması
- **[docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md)** - Yazılım mimarisi ve mikroservisler
- **[docs/UI_UX.md](./docs/UI_UX.md)** - UI/UX tasarım dokümantasyonu
- **[docs/API.md](./docs/API.md)** - API endpoint dokümantasyonu

## 🎯 Özellikler

### Kullanıcı Rolleri
- Vatandaş (Doğrulanmamış/Doğrulanmış)
- Parti Üyesi
- Siyasetçi (İlçe/İl/Genel Merkez)
- Milletvekili
- Gazeteci/Basın Mensubu
- Teşkilat Yöneticileri
- Sistem Yöneticileri

### PolitPuan Sistemi
5 katmanlı algoritma:
1. Temel Etkileşim (25%)
2. Kullanıcı Etki Profili (20%)
3. İçerik Türü (15%)
4. Siyasi Gerilim (20%)
5. Zamanlama ve Trend (20%)

### Ana Özellikler
- ✅ Kişiselleştirilmiş feed sistemi
- ✅ Teşkilat haritası (İl/İlçe/Mahalle/Sandık)
- ✅ AI destekli içerik analizi
- ✅ Medya merkezi ve fact-check
- ✅ Gündem takibi
- ✅ Gelişmiş analitik paneli
- ✅ Parti içi yönetim araçları

## 🛠️ Teknoloji Stack

### Frontend
- Next.js 14
- React 18
- TypeScript
- Tailwind CSS

### Backend
- Node.js
- Express/NestJS
- PostgreSQL
- Neo4j (Graph DB)
- Redis (Cache)
- Elasticsearch (Search)

### AI/ML
- Python
- TensorFlow/PyTorch
- BERT (Sentiment Analysis)
- Graph Neural Networks

### Infrastructure
- Docker
- Kubernetes
- RabbitMQ/Kafka
- WebSocket (Real-time)

## 📦 Kurulum

```bash
# Bağımlılıkları yükle
npm install

# Development server başlat
npm run dev

# Production build
npm run build
npm start
```

## 📁 Proje Yapısı

```
/workspace
├── src/
│   ├── types/           # TypeScript type definitions
│   ├── services/        # Business logic services
│   │   ├── politPuanCalculator.ts
│   │   └── rolePermissions.ts
│   └── ...
├── docs/               # Detaylı dokümantasyon
│   ├── DATA_MODEL.md
│   ├── ALGORITHMS.md
│   ├── PAGE_FLOWS.md
│   ├── ORGANIZATION.md
│   ├── ARCHITECTURE.md
│   ├── UI_UX.md
│   └── API.md
├── BLUEPRINT.md        # Ana blueprint dokümantasyonu
└── README.md           # Bu dosya
```

## 🚀 Geliştirme Durumu

Bu proje kapsamlı bir blueprint ve tasarım dokümantasyonu içermektedir. Implementasyon aşamasına geçmek için:

1. Veritabanı şemalarını oluştur
2. API endpoint'lerini implement et
3. Frontend bileşenlerini geliştir
4. AI servislerini entegre et
5. Test ve deploy

## 📝 Lisans

Bu proje özel bir projedir.

## 👥 Katkıda Bulunma

Proje geliştirme aşamasındadır. Katkılar için lütfen issue açın veya pull request gönderin.
