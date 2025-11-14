# Sayfa Akışları ve Navigasyon

## Ana Sayfa (Feed) Yapısı

### Feed Türleri ve Filtreleme

```
Ana Sayfa (/)
├── Genel Gündem Feed (default)
│   ├── Tüm partilerden içerikler
│   ├── PolitPuan sıralaması
│   └── AI önerileri
│
├── Parti Gündemi Feed (/feed/party/:partyId)
│   ├── Sadece seçili partiden içerikler
│   ├── Parti üyeleri
│   ├── Parti duyuruları
│   └── Parti etkinlikleri
│
├── Yerel Gündem Feed (/feed/local/:cityId/:districtId?)
│   ├── Şehir bazlı içerikler
│   ├── İlçe bazlı içerikler
│   ├── Yerel siyasetçiler
│   └── Yerel gündem konuları
│
├── Takip Edilenler Feed (/feed/following)
│   ├── Takip edilen kullanıcıların içerikleri
│   └── Öncelikli görünürlük
│
├── Trend Olaylar Feed (/feed/trending)
│   ├── Viral içerikler
│   ├── Gündem konuları
│   └── Yükselen tartışmalar
│
├── Medya Akışı Feed (/feed/media)
│   ├── Haberler
│   ├── Röportajlar
│   ├── Canlı yayınlar
│   └── Basın açıklamaları
│
└── AI Önerileri Feed (/feed/recommended)
    ├── Kişiselleştirilmiş öneriler
    ├── İlgi alanına göre içerikler
    └── Yeni keşifler
```

### Post Kartı Bileşenleri

Her post kartında şunlar görünür:

```
┌─────────────────────────────────────┐
│ [Profil Foto] Kullanıcı Adı         │
│         @username · Rol Badge       │
│         PolitPuan: 1,234 ⭐         │
├─────────────────────────────────────┤
│ İçerik Metni                         │
│ [Medya: Fotoğraf/Video varsa]        │
│ [Anket: Seçenekler varsa]            │
├─────────────────────────────────────┤
│ 📍 Konum: İstanbul/Kadıköy          │
│ 🏛️ Parti: CHP (eğer varsa)         │
│ 🎯 Kategori: Ekonomi                │
│ 🔥 Gerilim: Yüksek                  │
│ 🤖 AI Ton: Eleştirel                │
├─────────────────────────────────────┤
│ [Heatmap: Etkileşim yoğunluğu]      │
│ ❤️ 234  💬 45  🔄 12  👁️ 1.2K      │
│ PolitPuan: 456                      │
└─────────────────────────────────────┘
```

## Profil Sayfası Yapısı

### Vatandaş Profili (/profile/:userId)

```
┌─────────────────────────────────────┐
│ [Kapak Fotoğrafı]                  │
│ [Profil Fotoğrafı]                 │
│ İsim Soyisim                        │
│ @username                           │
│ PolitPuan: 1,234 ⭐                │
│ Doğrulanmış Vatandaş ✓             │
├─────────────────────────────────────┤
│ 📍 İstanbul / Kadıköy / Acıbadem   │
│ 💼 Meslek: Öğretmen                │
│ 👥 Takipçi: 234 | Takip: 123       │
├─────────────────────────────────────┤
│ [Sekmeler]                          │
│ ├── İçerikler                      │
│ ├── Beğeniler                      │
│ ├── Medya                          │
│ ├── Analitik                       │
│ └── Politik Eğilim                 │
├─────────────────────────────────────┤
│ [İçerikler Listesi]                │
│ - Post kartları                    │
│ - Filtreleme seçenekleri           │
└─────────────────────────────────────┘
```

### Parti Üyesi Profili (/profile/:userId)

Vatandaş profilindekilere ek olarak:

```
├── Parti Bilgileri
│   ├── Parti: CHP
│   ├── Üyelik Tarihi: 2020-01-15
│   ├── Kademe: İlçe Teşkilatı
│   └── Görevler: [Liste]
│
├── Teşkilat Bağlantıları
│   ├── İl Başkanı: [Link]
│   ├── İlçe Başkanı: [Link]
│   └── Teşkilat Üyeleri: [Liste]
│
├── Parti İçi Görünürlük Haritası
│   └── [İnteraktif harita]
│
└── Parti İçi Analitik
    ├── Parti içi etkileşimler
    ├── Görev tamamlama oranı
    └── Parti içi sıralama
```

### Siyasetçi/Vekil Profili (/profile/:userId)

Ek bölümler:

```
├── Siyasi Bilgiler
│   ├── Seçim Bölgesi: İstanbul 1. Bölge
│   ├── Görev: Milletvekili
│   ├── Dönem: 27. Dönem
│   └── Komisyonlar: [Liste]
│
├── Meclis Aktivitesi
│   ├── Önerge Geçmişi
│   ├── Soru Önergeleri
│   ├── Kanun Teklifleri
│   └── Komisyon Çalışmaları
│
├── Basın Açıklamaları
│   └── [Liste]
│
├── Ziyaret Takvimi
│   └── [Takvim görünümü]
│
├── STK Takibi
│   └── [Takip edilen STK'lar]
│
├── Medya Haberleri
│   └── [Kullanıcı hakkında haberler]
│
├── PolitPuan Geçmişi
│   ├── Haftalık Grafik
│   ├── Aylık Grafik
│   └── Yıllık Grafik
│
├── Rakip Karşılaştırma
│   └── [Rakip siyasetçilerle karşılaştırma]
│
└── Parti İçi Konum Haritası
    └── [Ağ analizi görselleştirmesi]
```

## Teşkilat Haritası Sayfası (/organization/map)

```
┌─────────────────────────────────────┐
│ [Türkiye Haritası - İnteraktif]    │
│                                     │
│ [Filtreler]                         │
│ ├── Parti Seçimi                   │
│ ├── Seviye: İl/İlçe/Mahalle       │
│ └── Gösterge: Güç/Nüfus/Aktivite  │
├─────────────────────────────────────┤
│ [Harita Üzerinde Gösterilenler]    │
│ ├── İl Başkanları (📍)            │
│ ├── İlçe Başkanları (📍)           │
│ ├── Milletvekilleri (🏛️)           │
│ ├── Belediye Başkanları (🏢)       │
│ ├── Gençlik Kolları (👥)           │
│ └── Kadın Kolları (👥)             │
├─────────────────────────────────────┤
│ [Tıklanan Kişi/İlçe Bilgileri]     │
│ └── [Detaylı profil/kart]          │
└─────────────────────────────────────┘
```

### Harita Görselleştirme Özellikleri

- **Isı Haritası**: Parti gücü, gündem yoğunluğu, vatandaş geri bildirimi
- **Renk Kodlaması**: Parti renkleriyle uyumlu
- **Zoom Seviyeleri**: İl → İlçe → Mahalle → Sandık
- **Animasyonlar**: Seçim sonuçları, trend değişimleri

## Medya Sayfası (/media)

```
┌─────────────────────────────────────┐
│ [Sekmeler]                          │
│ ├── Ulusal Medya                   │
│ ├── Yerel Medya                    │
│ ├── Siyasetçi Haberleri            │
│ ├── Canlı Yayınlar                 │
│ ├── Röportajlar                    │
│ └── Parti Açıklamaları             │
├─────────────────────────────────────┤
│ [Filtreler]                         │
│ ├── Tarih Aralığı                  │
│ ├── Kategori                       │
│ ├── Parti                          │
│ └── Doğruluk Durumu                │
├─────────────────────────────────────┤
│ [Haber Kartları]                    │
│ ┌─────────────────────────────┐   │
│ │ [Haber Görseli]             │   │
│ │ Başlık                      │   │
│ │ Kaynak · Tarih              │   │
│ │ [Fact-check Badge]          │   │
│ │ [Tarafsızlık Skoru]         │   │
│ │ [Gerilim Puanı]             │   │
│ │ [Partizanlık Etiketi]       │   │
│ └─────────────────────────────┘   │
└─────────────────────────────────────┘
```

## Gündem Sayfası (/agenda)

```
┌─────────────────────────────────────┐
│ [Günlük Gündem Özeti]               │
│ ├── Ülke Gündemi                   │
│ ├── Parti Gündemi                  │
│ ├── Bölgesel Gündem                │
│ ├── STK Gündemi                    │
│ └── Vatandaş Şikayet/Öneri         │
├─────────────────────────────────────┤
│ [Gündem Konuları Listesi]          │
│ ┌─────────────────────────────┐   │
│ │ Konu Başlığı                │   │
│ │ 📍 Konum                    │   │
│ │ 🔥 Trend Skoru              │   │
│ │ [Kim Ne Demiş?]             │   │
│ │ [Parti Pozisyonları]        │   │
│ │ [Medya Haberleri]           │   │
│ │ [Vatandaş Görüşleri]        │   │
│ └─────────────────────────────┘   │
└─────────────────────────────────────┘
```

### Gündem Detay Sayfası (/agenda/:agendaId)

```
┌─────────────────────────────────────┐
│ [Konu Başlığı]                      │
│ [Açıklama]                          │
│ [AI Analiz]                         │
│ ├── Sentiment Skoru                │
│ ├── Gerilim Skoru                  │
│ └── Trend Skoru                    │
├─────────────────────────────────────┤
│ Kim Ne Demiş?                       │
│ ├── Siyasetçiler                   │
│ ├── Partiler                       │
│ └── Medya                          │
├─────────────────────────────────────┤
│ Parti Pozisyonları                  │
│ ├── CHP: [Pozisyon]                │
│ ├── AKP: [Pozisyon]                │
│ └── ...                            │
├─────────────────────────────────────┤
│ Medya Haberleri                     │
│ └── [Haber listesi]                │
├─────────────────────────────────────┤
│ Vatandaş Görüşleri                  │
│ └── [Post listesi]                 │
└─────────────────────────────────────┘
```

## Analitik Paneli (/analytics)

### Siyasetçi/Gazeteci/Teşkilat Yöneticisi için

```
┌─────────────────────────────────────┐
│ [Sekmeler]                          │
│ ├── Genel Bakış                    │
│ ├── İçerik Performansı             │
│ ├── Audience Analizi               │
│ ├── Rakip Karşılaştırma            │
│ └── Seçim Bölgesi Analizi          │
├─────────────────────────────────────┤
│ [Genel Bakış Dashboard]             │
│ ├── PolitPuan Trendi               │
│ ├── Takipçi Büyümesi               │
│ ├── Etkileşim Oranı                │
│ ├── Erişim/İmpresyon               │
│ └── En İyi Performans Gösteren     │
│     İçerikler                      │
├─────────────────────────────────────┤
│ [İçerik Performansı]               │
│ ├── Kategori Bazlı                 │
│ ├── Zaman Bazlı                    │
│ └── Format Bazlı                   │
├─────────────────────────────────────┤
│ [Audience Analizi]                 │
│ ├── Demografik Dağılım             │
│ ├── Coğrafi Dağılım                │
│ ├── İlgi Alanları                  │
│ └── Aktif Zamanlar                 │
├─────────────────────────────────────┤
│ [Rakip Karşılaştırma]              │
│ └── [Grafikler ve metrikler]       │
├─────────────────────────────────────┤
│ [Seçim Bölgesi Nabız Analizi]      │
│ ├── Gündem Isı Haritası            │
│ ├── Duygu Haritası                 │
│ └── Partizanlık Haritası           │
└─────────────────────────────────────┘
```

## Alt Sayfalar

### Partiler Sayfası (/parties)

```
├── Parti Listesi
│   └── [Tüm partilerin kartları]
│
├── Parti Detay Sayfası (/parties/:partyId)
│   ├── Parti Profili
│   ├── Tarihçe
│   ├── Tüzük
│   ├── Yöneticiler
│   ├── Basın Açıklamaları
│   ├── Teşkilat Bölgeleri
│   └── Yeni Katılanlar
```

### Milletvekilleri Sayfası (/mps)

```
├── Milletvekili Listesi
│   ├── İl Bazlı Filtreleme
│   ├── Uzmanlık Alanı Filtreleme
│   └── Parti Filtreleme
│
└── Milletvekili Detay Sayfası
    ├── Profil
    ├── Komisyon Üyelikleri
    ├── Önerge Geçmişi
    └── Seçim Bölgesi Analizi
```

### Bakanlıklar Sayfası (/ministries)

```
├── Bakanlık Listesi
│
└── Bakanlık Detay Sayfası
    ├── Bakan Profili
    ├── Yardımcılar
    ├── Genel Müdürler
    ├── Projeler
    ├── Bütçe
    └── Hedefler
```

### Belediyeler Sayfası (/municipalities)

```
├── Belediye Listesi
│   ├── İl Bazlı Filtreleme
│   └── İlçe Bazlı Filtreleme
│
└── Belediye Detay Sayfası
    ├── Belediye Başkanı
    ├── Encümen Üyeleri
    ├── İlçe Belediyeleri
    └── Projeler
```

### Vatandaş Modülü (/citizen)

```
├── Şikayet/Öneri Merkezi
│   ├── Yeni Şikayet/Öneri
│   ├── Şikayet/Öneri Listesi
│   └── Durum Takibi
│
├── Mahalle Temsilci Sistemi
│   └── [Temsilci bilgileri ve iletişim]
│
└── Oyunlaştırma Sistemi
    ├── PolitPuan Seviyesi
    ├── Rozetler
    └── Başarımlar
```

## Navigasyon Menüsü

```
┌─────────────────────────────────────┐
│ [Logo] Platform Adı                │
├─────────────────────────────────────┤
│ 🏠 Ana Sayfa                       │
│ 🗺️ Teşkilat Haritası               │
│ 📰 Medya                           │
│ 📅 Gündem                          │
│ 🏛️ Partiler                        │
│ 👥 Milletvekilleri                 │
│ 🏢 Bakanlıklar                     │
│ 🏘️ Belediyeler                     │
│ 📊 Analitik (rol bazlı)            │
│ 👤 Profil                          │
│ ⚙️ Ayarlar                         │
└─────────────────────────────────────┘
```
