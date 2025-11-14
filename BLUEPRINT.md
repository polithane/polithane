# 🏛️ Siyasi Sosyal Medya Platformu - Kapsamlı Blueprint

## 📋 İçindekiler
1. [Kullanıcı Rolleri ve Yetkiler](#1-kullanıcı-rolleri)
2. [PolitPuan Algoritması](#2-politpuan-algoritması)
3. [Veri Modeli](#3-veri-modeli)
4. [Sayfa Akışları](#4-sayfa-akışları)
5. [Teşkilat Yapılanması](#5-teşkilat-yapılanması)
6. [AI Sistemleri](#6-ai-sistemleri)
7. [Yazılım Mimarisi](#7-yazılım-mimarisi)
8. [UI/UX Tasarım](#8-uiux-tasarım)

---

## 1. Kullanıcı Rolleri ve Yetkiler

### 1.1 Rol Hiyerarşisi

```
Sistem Admin (Level 10)
├── Parti Genel Merkez Admin (Level 9)
│   ├── Teşkilat Yöneticileri (Level 8)
│   │   ├── İl Başkanı (Level 7)
│   │   │   ├── İlçe Başkanı (Level 6)
│   │   │   ├── Kadın Kolları Başkanı (Level 6)
│   │   │   └── Gençlik Kolları Başkanı (Level 6)
│   │   └── Milletvekili (Level 7)
│   ├── Siyasetçi (Level 5-7)
│   │   ├── Genel Merkez (Level 7)
│   │   ├── İl Düzeyi (Level 6)
│   │   └── İlçe Düzeyi (Level 5)
│   └── Parti Üyesi (Level 4)
├── Gazeteci/Basın Mensubu (Level 3)
├── Doğrulanmış Vatandaş (Level 2)
└── Vatandaş (Doğrulanmamış) (Level 1)
```

### 1.2 Rol Detayları ve Yetkiler

#### Vatandaş (Doğrulanmamış)
- **Görünürlük**: Sınırlı (kendi içerikleri + genel feed)
- **Paylaşım**: Metin, fotoğraf (günlük 5 post limiti)
- **Etkileşim**: Beğeni, yorum (günlük 20 limit)
- **Analitik**: Yok
- **PolitPuan Çarpanı**: 0.5x
- **Özel Modüller**: Yok

#### Doğrulanmış Vatandaş
- **Görünürlük**: Tam (tüm partiler, tüm içerikler)
- **Paylaşım**: Tüm formatlar (günlük 15 post)
- **Etkileşim**: Sınırsız
- **Analitik**: Kişisel profil analitiği
- **PolitPuan Çarpanı**: 1.0x
- **Özel Modüller**: Şikayet/Öneri Merkezi, Mahalle Temsilci Sistemi

#### Parti Üyesi
- **Görünürlük**: 
  - Kendi partisi: Tam görünürlük
  - Rakip partiler: %70 görünürlük
- **Paylaşım**: Tüm formatlar (günlük 25 post)
- **Etkileşim**: Sınırsız + Parti içi özel etkileşimler
- **Analitik**: Parti içi analitik + Kişisel analitik
- **PolitPuan Çarpanı**: 1.2x
- **Özel Modüller**: Parti içi feed, Görev yönetimi, Teşkilat bağlantıları

#### Siyasetçi (İlçe/İl/Genel Merkez)
- **Görünürlük**: Tam + Özel içerikler
- **Paylaşım**: Tüm formatlar + Canlı yayın (günlük 50 post)
- **Etkileşim**: Sınırsız + Öncelikli görünürlük
- **Analitik**: Gelişmiş analitik paneli
- **PolitPuan Çarpanı**: 
  - İlçe: 1.5x
  - İl: 2.0x
  - Genel Merkez: 2.5x
- **Özel Modüller**: Konuşma metni önerileri, Kriz iletişimi, Ziyaret takvimi

#### Milletvekili
- **Görünürlük**: Tam + Özel içerikler + Meclis içerikleri
- **Paylaşım**: Tüm formatlar + Meclis içerikleri
- **Etkileşim**: Sınırsız + Öncelikli görünürlük
- **Analitik**: Tam analitik + Seçim bölgesi analitiği
- **PolitPuan Çarpanı**: 3.0x
- **Özel Modüller**: Önerge geçmişi, Basın açıklamaları, STK takibi, Seçim bölgesi nabız analizi

#### Gazeteci/Basın Mensubu
- **Görünürlük**: Tam + Medya içerikleri
- **Paylaşım**: Tüm formatlar + Haber içerikleri
- **Etkileşim**: Sınırsız
- **Analitik**: Medya analitik paneli
- **PolitPuan Çarpanı**: 1.8x
- **Özel Modüller**: Haber doğrulama, Fact-check, Medya merkezi

#### Teşkilat Yöneticileri
- **Görünürlük**: Tam + Teşkilat içerikleri
- **Paylaşım**: Tüm formatlar + Teşkilat duyuruları
- **Etkileşim**: Sınırsız + Teşkilat yönetimi
- **Analitik**: Teşkilat analitik paneli
- **PolitPuan Çarpanı**: 
  - İlçe Başkanı: 2.0x
  - İl Başkanı: 2.5x
- **Özel Modüller**: Teşkilat yönetimi, Üye yönetimi, Bölge analitiği

#### Parti Genel Merkez Admin
- **Görünürlük**: Tam + Tüm parti içerikleri
- **Paylaşım**: Sınırsız
- **Etkileşim**: Sınırsız + Yönetim yetkileri
- **Analitik**: Tam parti analitiği
- **PolitPuan Çarpanı**: 3.5x
- **Özel Modüller**: Parti yönetimi, Tüm teşkilat yönetimi, Parti içi gizli oylama

#### Sistem Administrator
- **Görünürlük**: Tam + Sistem içerikleri
- **Paylaşım**: Sınırsız
- **Etkileşim**: Sınırsız + Sistem yönetimi
- **Analitik**: Tam sistem analitiği
- **PolitPuan Çarpanı**: N/A (sistem dışı)
- **Özel Modüller**: Sistem yönetimi, Platform yönetimi, Güvenlik

---

## 2. PolitPuan Algoritması

### 2.1 5 Katmanlı Sistem Mimarisi

```
PolitPuan Final = Σ(Katman Skoru × Katman Ağırlığı)
```

### Katman 1: Temel Etkileşim Puanı (Ağırlık: 25%)
- Beğeni: +1 puan
- Yorum: +3 puan
- Paylaşım: +5 puan
- DM: +2 puan
- Son 5 post ağırlıkları: 25% / 20% / 15% / 10% / 5%

### Katman 2: Kullanıcı Etki Profili (Ağırlık: 20%)
- Takipçi sayısı: log10(takipçi) × 10
- Meslek çarpanı:
  - Öğretmen: 1.2x
  - Doktor: 1.3x
  - Çiftçi: 1.1x
  - Kamu çalışanı: 1.15x
  - Akademisyen: 1.25x
  - İş insanı: 1.1x
- Bölgesel nüfuz:
  - İstanbul, Ankara, İzmir: 1.5x
  - Büyükşehir: 1.3x
  - İl merkezi: 1.1x
  - İlçe: 1.0x
- Geçmiş 90 gün etkileşim ortalaması: (toplam_etkileşim / 90) × 0.5
- DM yazışma sıklığı: (dm_sayısı / 30) × 2
- Özgünlük oranı: (özgün_post / toplam_post) × 20

### Katman 3: İçerik Türü Çarpanı (Ağırlık: 15%)
- Metin: 1.0x
- Fotoğraf: 1.3x
- Video: 1.8x
- Canlı yayın: 3.0x
- Anket: 1.5x
- Doküman/PDF: 1.2x

### Katman 4: Siyasi Gerilim Derecesi (Ağırlık: 20%)
AI içerik analizi ile:
- Destekleyici içerik: 1.0x
- Bilgilendirici içerik: 1.2x
- Eleştirel içerik: 1.5x
- Tartışmalı konu: 2.0x
- Kriz/afet içeriği: 2.5x
- Yüksek gerilim kategorileri (ekonomi, dış politika, güvenlik): +0.5x

### Katman 5: Zamanlama ve Trend Etkisi (Ağırlık: 20%)
- Seçim dönemi çarpanı: 1.5x (seçimden 6 ay önce başlar)
- Gündemle eşleşme: (eşleşme_yüzdesi / 100) × 30
- Viral potansiyel: AI tahmini × 25
- Zaman çarpanı:
  - İlk 1 saat: 1.5x
  - İlk 24 saat: 1.2x
  - Sonrası: 1.0x

### 2.2 Derin Öğrenme Entegrasyonu
- LSTM/Transformer modeli ile trend tahmini
- BERT tabanlı içerik analizi
- Graph Neural Network ile ağ etkisi analizi

---

## 3. Veri Modeli

Detaylar için `docs/DATA_MODEL.md` dosyasına bakın.

### 3.1 Ana Entity'ler
- User (Kullanıcı)
- Post (İçerik)
- Party (Parti)
- Organization (Teşkilat)
- Location (Konum: İl/İlçe/Mahalle/Sandık)
- Media (Medya)
- Agenda (Gündem)
- Analytics (Analitik)

---

## 4. Sayfa Akışları

Detaylar için `docs/PAGE_FLOWS.md` dosyasına bakın.

### 4.1 Ana Sayfa (Feed)
- Genel Gündem
- Parti Gündemi
- Yerel Gündem
- Takip Edilenler
- Trend Olaylar
- Medya Akışı
- AI Önerileri

### 4.2 Profil Sayfası
- Vatandaş Profili
- Parti Üyesi Profili
- Siyasetçi Profili
- Milletvekili Profili

### 4.3 Teşkilat Haritası
- İnteraktif Türkiye haritası
- İl/İlçe/Mahalle/Sandık hiyerarşisi
- Teşkilat gücü görselleştirme
- Siyasetçi ağı görselleştirme

---

## 5. Teşkilat Yapılanması

Detaylar için `docs/ORGANIZATION.md` dosyasına bakın.

### 5.1 Hiyerarşi
```
Türkiye
├── İl (81)
│   ├── İlçe (~970)
│   │   ├── Mahalle (~50,000)
│   │   │   └── Sandık (~200,000)
```

### 5.2 Her Seviyede Veriler
- Parti gücü skoru
- Aktif siyasetçi sayısı
- Gündem ısı haritası
- Vatandaş geri bildirim yoğunluğu
- Seçim sonuçları geçmişi

---

## 6. AI Sistemleri

### 6.1 İçerik Analizi
- Sentiment analizi
- Gerilim tespiti
- Partizanlık analizi
- Doğruluk kontrolü

### 6.2 Öneri Sistemi
- İçerik önerileri
- Kişi önerileri
- Gündem önerileri
- Etkileşim önerileri

### 6.3 İçerik Motoru
- Paylaşım önerileri
- Konuşma metni önerileri
- Kriz iletişimi önerileri
- Görev hatırlatmaları

---

## 7. Yazılım Mimarisi

Detaylar için `docs/ARCHITECTURE.md` dosyasına bakın.

### 7.1 Mikroservis Yapısı
- User Service
- Content Service
- Analytics Service
- AI Service
- Notification Service
- Media Service

### 7.2 Teknoloji Stack
- Frontend: Next.js 14, React 18, TypeScript
- Backend: Node.js, Express/NestJS
- Database: PostgreSQL (ana), Neo4j (graph), Redis (cache)
- AI/ML: Python, TensorFlow, PyTorch
- Real-time: WebSocket, Socket.io
- Queue: RabbitMQ/Kafka

---

## 8. UI/UX Tasarım

Detaylar için `docs/UI_UX.md` dosyasına bakın.

### 8.1 Tasarım Prensipleri
- Nötr renk paleti (parti renklerinden bağımsız)
- Modern, temiz arayüz
- Mobil-first yaklaşım
- Erişilebilirlik odaklı

### 8.2 Ana Bileşenler
- Feed kartları
- Profil kartları
- Harita modülü
- Analitik dashboard
- PolitPuan göstergesi

---

## 📚 Ek Dokümantasyon

Tüm detaylar için aşağıdaki dosyalara bakın:
- `docs/DATA_MODEL.md` - Veri modeli detayları
- `docs/PAGE_FLOWS.md` - Sayfa akışları
- `docs/ORGANIZATION.md` - Teşkilat yapısı
- `docs/ARCHITECTURE.md` - Yazılım mimarisi
- `docs/UI_UX.md` - UI/UX tasarım
- `docs/API.md` - API dokümantasyonu
- `docs/ALGORITHMS.md` - Algoritma detayları
