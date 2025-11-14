# 📋 Proje Özeti

## 🎯 Proje Tanımı

Bu proje, **Twitter + LinkedIn + e-Devlet + Partilerin Teşkilat Yapısı + Politika Analitiği** karması bir mega platformun kapsamlı blueprint'idir.

## 📚 Dokümantasyon Yapısı

### Ana Dokümantasyon
- **BLUEPRINT.md** - Genel bakış ve tüm sistemin özeti
- **README.md** - Proje tanıtımı ve hızlı başlangıç

### Detaylı Dokümantasyon (docs/)
1. **DATA_MODEL.md** - Veri modeli, ERD, Graph DB, TypeScript tipleri
2. **ALGORITHMS.md** - PolitPuan algoritması, AI analiz algoritmaları
3. **PAGE_FLOWS.md** - Sayfa akışları, navigasyon, UI yapısı
4. **ORGANIZATION.md** - Teşkilat yapılanması, harita sistemi
5. **ARCHITECTURE.md** - Mikroservis mimarisi, API yapısı, infrastructure
6. **UI_UX.md** - Tasarım sistemi, bileşenler, renk paleti
7. **API.md** - Tüm API endpoint'leri ve dokümantasyonu
8. **IMPLEMENTATION_GUIDE.md** - Geliştirme aşamaları, checklist'ler

## 🏗️ Kod Yapısı

### TypeScript Types (`src/types/`)
- User rolleri ve tipleri
- Post tipleri
- PolitPuan tipleri
- Party, Location, Organization tipleri

### Services (`src/services/`)
- **politPuanCalculator.ts** - 5 katmanlı PolitPuan hesaplama algoritması
- **rolePermissions.ts** - Rol bazlı yetki yönetimi

## 🎭 Kullanıcı Rolleri

1. **Vatandaş** (Doğrulanmamış/Doğrulanmış)
2. **Parti Üyesi**
3. **Siyasetçi** (İlçe/İl/Genel Merkez)
4. **Milletvekili**
5. **Gazeteci/Basın Mensubu**
6. **Teşkilat Yöneticileri** (İlçe/İl Başkanı, Kadın/Gençlik Kolları)
7. **Parti Genel Merkez Admin**
8. **Sistem Administrator**

Her rol için:
- Özel yetkiler
- Görünürlük ayarları
- PolitPuan çarpanları
- Özel modüller

## 🧠 PolitPuan Sistemi

### 5 Katmanlı Algoritma

1. **Katman 1: Temel Etkileşim** (25%)
   - Beğeni, yorum, paylaşım, görüntülenme
   - Son 5 post ağırlıklı ortalaması

2. **Katman 2: Kullanıcı Etki Profili** (20%)
   - Takipçi sayısı
   - Meslek çarpanı
   - Bölgesel nüfuz
   - 90 günlük etkileşim ortalaması
   - Özgünlük oranı

3. **Katman 3: İçerik Türü** (15%)
   - Metin: 1.0x
   - Fotoğraf: 1.3x
   - Video: 1.8x
   - Canlı yayın: 3.0x
   - Anket: 1.5x

4. **Katman 4: Siyasi Gerilim** (20%)
   - AI içerik analizi
   - Kategori çarpanları
   - Konu bazlı çarpanlar
   - Gerilim skoru

5. **Katman 5: Zamanlama ve Trend** (20%)
   - Seçim dönemi çarpanı
   - Gündemle eşleşme
   - Viral potansiyel
   - Zaman çarpanı

## 🗺️ Teşkilat Yapılanması

### Hiyerarşi
```
Türkiye
├── İl (81)
│   ├── İlçe (~970)
│   │   ├── Mahalle (~50,000)
│   │   │   └── Sandık (~200,000)
```

### Özellikler
- İnteraktif harita görselleştirme
- Parti gücü ısı haritası
- Gündem ısı haritası
- Vatandaş geri bildirim yoğunluğu
- Siyasetçi aktivite haritası
- Zoom seviyeleri (İl → İlçe → Mahalle → Sandık)

## 🤖 AI Sistemleri

1. **İçerik Analizi**
   - Sentiment analizi (BERT)
   - Gerilim tespiti
   - Partizanlık analizi
   - Kategorizasyon

2. **Öneri Sistemi**
   - TF-IDF + Embedding
   - Graph Neural Network
   - Kişiselleştirilmiş öneriler

3. **İçerik Motoru**
   - Paylaşım önerileri
   - Konuşma metni önerileri
   - Kriz iletişimi önerileri

4. **Fact-Check**
   - Haber doğrulama
   - Tarafsızlık analizi

## 🏛️ Ana Özellikler

### Feed Sistemi
- Genel Gündem
- Parti Gündemi
- Yerel Gündem
- Takip Edilenler
- Trend Olaylar
- Medya Akışı
- AI Önerileri

### Profil Sayfaları
- Vatandaş Profili
- Parti Üyesi Profili
- Siyasetçi/Vekil Profili
- Rol bazlı özel bölümler

### Analitik Paneli
- PolitPuan trendi
- İçerik performansı
- Audience analizi
- Rakip karşılaştırma
- Seçim bölgesi nabız analizi
- Duygu haritası

### Medya Merkezi
- Ulusal/Yerel medya
- Siyasetçi haberleri
- Canlı yayınlar
- Fact-check modülü

### Gündem Sistemi
- Otomatik gündem oluşturma
- Ülke/Parti/Bölgesel gündem
- Vatandaş şikayet/öneri gündemi
- AI destekli kategorizasyon

## 🛠️ Teknoloji Stack

### Frontend
- Next.js 14
- React 18
- TypeScript
- Tailwind CSS

### Backend
- Node.js + Express/NestJS
- PostgreSQL (Ana veritabanı)
- Neo4j (Graph database)
- Redis (Cache)
- Elasticsearch (Search)

### AI/ML
- Python + FastAPI
- TensorFlow/PyTorch
- BERT (Sentiment)
- Graph Neural Networks

### Infrastructure
- Docker + Kubernetes
- RabbitMQ/Kafka (Message Queue)
- WebSocket (Real-time)
- CDN (CloudFlare)

## 📊 Veri Modeli

### Ana Entity'ler
- User (Kullanıcı)
- Post (İçerik)
- Party (Parti)
- Organization (Teşkilat)
- Location (Konum)
- Media (Medya)
- Agenda (Gündem)
- Analytics (Analitik)

### Graph Database (Neo4j)
- User → FOLLOWS → User
- User → LIKES → Post
- User → BELONGS_TO → Party
- User → LOCATED_IN → Location
- Organization → PART_OF → Organization

## 🚀 Geliştirme Aşamaları

1. **Faz 1: Temel Altyapı** (2-3 hafta)
2. **Faz 2: Core Features** (4-6 hafta)
3. **Faz 3: Gelişmiş Özellikler** (6-8 hafta)
4. **Faz 4: Medya ve Gündem** (3-4 hafta)
5. **Faz 5: Optimizasyon ve Test** (4-5 hafta)

Detaylar için `IMPLEMENTATION_GUIDE.md` dosyasına bakın.

## 📝 Sonraki Adımlar

1. Veritabanı şemalarını oluştur
2. Backend API'leri implement et
3. Frontend bileşenlerini geliştir
4. AI servislerini entegre et
5. Test ve deploy

## 🔗 Hızlı Bağlantılar

- [Ana Blueprint](./BLUEPRINT.md)
- [Veri Modeli](./DATA_MODEL.md)
- [Algoritmalar](./ALGORITHMS.md)
- [Sayfa Akışları](./PAGE_FLOWS.md)
- [Mimari](./ARCHITECTURE.md)
- [API Dokümantasyonu](./API.md)
- [UI/UX Tasarım](./UI_UX.md)
- [Geliştirme Rehberi](./IMPLEMENTATION_GUIDE.md)

---

**Not**: Bu proje kapsamlı bir blueprint ve tasarım dokümantasyonu içermektedir. Implementasyon aşamasına geçmek için yukarıdaki dokümantasyonları takip edin.
