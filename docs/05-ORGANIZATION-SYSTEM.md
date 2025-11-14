# 🗺️ Teşkilat Yapılanması ve Harita Sistemi

## 📋 İçindekiler

1. [Genel Bakış](#genel-bakış)
2. [Hiyerarşi Yapısı](#hiyerarşi-yapısı)
3. [İnteraktif Harita Modülü](#interaktif-harita-modülü)
4. [Teşkilat Yönetimi](#teşkilat-yönetimi)
5. [Görev Sistemi](#görev-sistemi)
6. [İletişim Sistemi](#iletişim-sistemi)
7. [Raporlama](#raporlama)

---

## Genel Bakış

Teşkilat sistemi, parti organizasyonlarının **dijital olarak yönetilmesini** sağlar. Türkiye genelinde il-ilçe-mahalle-sandık seviyesinde hiyerarşik yapı.

### Temel Özellikler

- 🗺️ **İnteraktif Harita**: Türkiye haritası üzerinde görselleştirme
- 📊 **Gerçek Zamanlı İstatistikler**: Anlık üye sayıları, aktivite
- 📋 **Görev Yönetimi**: Teşkilata görev atama ve takip
- 💬 **İç İletişim**: Hiyerarşik mesajlaşma sistemi
- 📈 **Analitik**: Bölgesel performans analizleri
- 🎯 **Hedef Takibi**: Kampanya hedefleri ve gerçekleşme oranları

---

## Hiyerarşi Yapısı

### 5 Seviyeli Hiyerarşi

```
Türkiye (Ulusal)
├── Bölge (7 coğrafi bölge)
│   ├── İl (81 il)
│   │   ├── İlçe (973 ilçe)
│   │   │   ├── Mahalle (~35,000 mahalle)
│   │   │   │   └── Sandık (~200,000 sandık)
```

### Her Seviyede Bulunan Bilgiler

#### Ulusal Seviye (Genel Merkez)

```json
{
  "level": "national",
  "party_id": 1,
  "chairman": "user_id_123",
  "general_secretary": "user_id_456",
  "spokesperson": "user_id_789",
  "total_members": 5200000,
  "active_members": 1800000,
  "stats": {
    "cities": 81,
    "districts": 973,
    "neighborhoods": 35000,
    "ballot_boxes": 200000
  }
}
```

#### İl Seviyesi

```json
{
  "level": "city",
  "party_id": 1,
  "city_id": 34,
  "city_name": "İstanbul",
  "manager": "user_id_1001",
  "deputy_managers": ["user_id_1002", "user_id_1003"],
  "women_branch_manager": "user_id_1004",
  "youth_branch_manager": "user_id_1005",
  "members": 350000,
  "active_members": 120000,
  "delegates": 1250,
  "office_address": "...",
  "phone": "+90...",
  "email": "istanbul@ornekparti.org.tr",
  "stats": {
    "districts": 39,
    "neighborhoods": 967,
    "ballot_boxes": 18500,
    "strength_score": 85
  }
}
```

#### İlçe Seviyesi

```json
{
  "level": "district",
  "party_id": 1,
  "city_id": 34,
  "district_id": 450,
  "district_name": "Kadıköy",
  "manager": "user_id_2001",
  "deputy_managers": ["user_id_2002"],
  "members": 8500,
  "active_members": 3200,
  "delegates": 85,
  "stats": {
    "neighborhoods": 21,
    "ballot_boxes": 450,
    "strength_score": 92
  }
}
```

#### Mahalle Seviyesi

```json
{
  "level": "neighborhood",
  "party_id": 1,
  "district_id": 450,
  "neighborhood_id": 8001,
  "neighborhood_name": "Fenerbahçe",
  "representative": "user_id_3001",
  "members": 320,
  "active_members": 150,
  "stats": {
    "ballot_boxes": 18,
    "strength_score": 88
  }
}
```

#### Sandık Seviyesi

```json
{
  "level": "ballot_box",
  "neighborhood_id": 8001,
  "ballot_box_no": "1234-5678",
  "address": "Fenerbahçe İlkokulu",
  "responsible": "user_id_4001",
  "volunteers": ["user_id_4002", "user_id_4003"],
  "estimated_voters": 280,
  "party_members": 12,
  "last_election_result": {
    "party_vote": 125,
    "party_percentage": 44.6,
    "turnout": 280
  }
}
```

### Yönetici Rolleri ve Yetkileri

| Rol | Seviye | Yetkileri |
|-----|--------|-----------|
| **Genel Başkan** | Ulusal | Tüm teşkilat, stratejik kararlar |
| **İl Başkanı** | İl | İl ve altındaki tüm yapılar |
| **İlçe Başkanı** | İlçe | İlçe ve mahalleler |
| **Kadın Kolları Başkanı** | İl/İlçe | Kadın üyeler, kadın etkinlikleri |
| **Gençlik Kolları Başkanı** | İl/İlçe | Genç üyeler, kampüs teşkilatı |
| **Mahalle Temsilcisi** | Mahalle | Mahalle üyeleri, sandık organizasyonu |
| **Sandık Görevlisi** | Sandık | Seçim günü sandık sorumluluğu |

---

## İnteraktif Harita Modülü

### Harita Teknolojisi

**Kullanılan Kütüphane**: Mapbox GL JS

```javascript
import mapboxgl from 'mapbox-gl';

// Harita başlatma
const map = new mapboxgl.Map({
  container: 'map',
  style: 'mapbox://styles/mapbox/light-v11',
  center: [35.2433, 38.9637], // Türkiye merkezi
  zoom: 6,
  minZoom: 5,
  maxZoom: 18
});
```

### Harita Katmanları (Layers)

#### 1. İl Sınırları Layer

```javascript
map.addLayer({
  id: 'cities-layer',
  type: 'fill',
  source: 'cities',
  paint: {
    'fill-color': [
      'interpolate',
      ['linear'],
      ['get', 'strength_score'],
      0, '#ff0000',    // Zayıf (Kırmızı)
      50, '#ffff00',   // Orta (Sarı)
      100, '#00ff00'   // Güçlü (Yeşil)
    ],
    'fill-opacity': 0.6,
    'fill-outline-color': '#000000'
  }
});
```

#### 2. İlçe Sınırları Layer

```javascript
map.addLayer({
  id: 'districts-layer',
  type: 'fill',
  source: 'districts',
  paint: {
    'fill-color': [
      'interpolate',
      ['linear'],
      ['get', 'strength_score'],
      0, '#ff0000',
      50, '#ffff00',
      100, '#00ff00'
    ],
    'fill-opacity': 0.4
  },
  minzoom: 8 // Sadece yakın zoomda görünür
});
```

#### 3. Teşkilat Noktaları Layer

```javascript
map.addLayer({
  id: 'offices-layer',
  type: 'symbol',
  source: 'offices',
  layout: {
    'icon-image': 'office-marker',
    'icon-size': [
      'interpolate',
      ['linear'],
      ['zoom'],
      8, 0.5,
      12, 1.0,
      18, 1.5
    ],
    'text-field': ['get', 'office_name'],
    'text-offset': [0, 1.5],
    'text-anchor': 'top'
  }
});
```

#### 4. Heat Map (Üye Yoğunluğu)

```javascript
map.addLayer({
  id: 'members-heatmap',
  type: 'heatmap',
  source: 'members-locations',
  paint: {
    'heatmap-weight': [
      'interpolate',
      ['linear'],
      ['get', 'member_count'],
      0, 0,
      1000, 1
    ],
    'heatmap-intensity': [
      'interpolate',
      ['linear'],
      ['zoom'],
      0, 1,
      9, 3
    ],
    'heatmap-color': [
      'interpolate',
      ['linear'],
      ['heatmap-density'],
      0, 'rgba(33,102,172,0)',
      0.2, 'rgb(103,169,207)',
      0.4, 'rgb(209,229,240)',
      0.6, 'rgb(253,219,199)',
      0.8, 'rgb(239,138,98)',
      1, 'rgb(178,24,43)'
    ],
    'heatmap-radius': [
      'interpolate',
      ['linear'],
      ['zoom'],
      0, 2,
      9, 20
    ]
  }
}, 'waterway-label');
```

### İnteraktif Özellikler

#### Tıklama Olayları

```javascript
// İl tıklaması
map.on('click', 'cities-layer', (e) => {
  const city = e.features[0];
  const cityId = city.properties.city_id;
  
  // Popup göster
  new mapboxgl.Popup()
    .setLngLat(e.lngLat)
    .setHTML(renderCityPopup(city.properties))
    .addTo(map);
  
  // Detay panelini güncelle
  loadCityDetails(cityId);
  
  // İlçelere zoom
  map.fitBounds(city.geometry.coordinates, {
    padding: 50
  });
});

// İlçe tıklaması
map.on('click', 'districts-layer', (e) => {
  const district = e.features[0];
  loadDistrictDetails(district.properties.district_id);
});

// Ofis marker tıklaması
map.on('click', 'offices-layer', (e) => {
  const office = e.features[0].properties;
  showOfficeDetails(office);
});
```

#### Hover Efektleri

```javascript
let hoveredStateId = null;

map.on('mousemove', 'cities-layer', (e) => {
  if (e.features.length > 0) {
    if (hoveredStateId !== null) {
      map.setFeatureState(
        { source: 'cities', id: hoveredStateId },
        { hover: false }
      );
    }
    hoveredStateId = e.features[0].id;
    map.setFeatureState(
      { source: 'cities', id: hoveredStateId },
      { hover: true }
    );
    
    // Cursor değiştir
    map.getCanvas().style.cursor = 'pointer';
    
    // Tooltip göster
    showTooltip(e.lngLat, e.features[0].properties);
  }
});

map.on('mouseleave', 'cities-layer', () => {
  if (hoveredStateId !== null) {
    map.setFeatureState(
      { source: 'cities', id: hoveredStateId },
      { hover: false }
    );
  }
  hoveredStateId = null;
  map.getCanvas().style.cursor = '';
  hideTooltip();
});
```

### Filtreleme ve Arama

```javascript
// İl ara ve focus
function searchCity(cityName) {
  const city = citiesData.find(c => c.name === cityName);
  if (city) {
    map.flyTo({
      center: [city.lng, city.lat],
      zoom: 9,
      speed: 1.5
    });
    highlightCity(city.id);
  }
}

// Güç skoruna göre filtrele
function filterByStrength(minScore, maxScore) {
  map.setFilter('cities-layer', [
    'all',
    ['>=', ['get', 'strength_score'], minScore],
    ['<=', ['get', 'strength_score'], maxScore]
  ]);
}

// Parti filtreleme
function filterByParty(partyId) {
  map.setFilter('offices-layer', [
    '==', ['get', 'party_id'], partyId
  ]);
}
```

### Popup Şablonları

#### İl Popup

```javascript
function renderCityPopup(city) {
  return `
    <div class="map-popup">
      <h3>${city.city_name}</h3>
      <div class="strength-indicator" style="background: ${getStrengthColor(city.strength_score)}">
        Güç: ${city.strength_score}/100
      </div>
      <ul class="stats">
        <li>👥 Üye: ${city.members.toLocaleString()}</li>
        <li>✅ Aktif: ${city.active_members.toLocaleString()}</li>
        <li>🏢 İlçe: ${city.districts_count}</li>
        <li>🗳️ Sandık: ${city.ballot_boxes.toLocaleString()}</li>
      </ul>
      <div class="manager-info">
        <img src="${city.manager_avatar}" alt="" />
        <div>
          <strong>${city.manager_name}</strong>
          <span>İl Başkanı</span>
        </div>
      </div>
      <button onclick="viewDetails('${city.city_id}')">
        Detayları Gör →
      </button>
    </div>
  `;
}
```

---

## Teşkilat Yönetimi

### Yönetici Dashboard'u

```
┌──────────────────────────────────────────────────┐
│ 🏛️ İstanbul İl Teşkilatı                         │
├──────────────────────────────────────────────────┤
│ Özet İstatistikler:                               │
│                                                   │
│ ┌───────┬───────┬───────┬───────┐                │
│ │ 👥    │ ✅    │ 🏢    │ 🗳️    │                │
│ │ 350K  │ 120K  │ 39    │ 18.5K │                │
│ │ Üye   │ Aktif │ İlçe  │ Sandık│                │
│ └───────┴───────┴───────┴───────┘                │
│                                                   │
│ 📊 Son 30 Gün Aktivite:                          │
│ • Yeni üye: +2,500 (↗️ %0.7)                     │
│ • Etkinlik: 45 toplantı                           │
│ • Görev tamamlama: %78                            │
│ • Ortalama katılım: 250 kişi/etkinlik            │
│                                                   │
│ 📈 Güç Trendi:                                    │
│ [████████████████████▒▒▒] 85/100                 │
│ Son ay: ↗️ +3 puan                               │
│                                                   │
│ 🎯 Güncel Hedefler:                              │
│ ☑️ 5,000 yeni üye (4,850/5,000) %97             │
│ ☑️ 50 etkinlik (45/50) %90                       │
│ ☐ %80 görev tamamlama (%78) - Eksik             │
└──────────────────────────────────────────────────┘
```

### İlçe Listesi ve Yönetimi

```
┌──────────────────────────────────────────────────┐
│ 📋 İlçe Teşkilatları (39)                        │
├──────────────────────────────────────────────────┤
│ Filtre: [Güç ▼] [Üye Sayısı ▼] [Aktivite ▼]    │
├──────────────────────────────────────────────────┤
│                                                   │
│ 🟢 Kadıköy (Güçlü)                               │
│    İlçe Başkanı: Mehmet Yılmaz                   │
│    👥 8,500 üye · ✅ 3,200 aktif                 │
│    📊 Güç: 92/100 · 📈 Trend: ↗️ +2             │
│    🗳️ 21 mahalle, 450 sandık                    │
│    [Detaylar] [Mesaj Gönder] [Rapor]            │
│                                                   │
│ 🟢 Beşiktaş (Güçlü)                              │
│    İlçe Başkanı: Ayşe Kaya                       │
│    👥 6,200 üye · ✅ 2,400 aktif                 │
│    📊 Güç: 88/100 · 📈 Trend: → 0               │
│    [Detaylar] [Mesaj Gönder] [Rapor]            │
│                                                   │
│ 🟡 Fatih (Orta)                                  │
│    İlçe Başkanı: Can Demir                       │
│    👥 4,500 üye · ✅ 1,200 aktif                 │
│    📊 Güç: 65/100 · 📈 Trend: ↘️ -3             │
│    ⚠️ Uyarı: Aktivite düşük                      │
│    [Detaylar] [Mesaj Gönder] [Rapor]            │
└──────────────────────────────────────────────────┘
```

### Üye Yönetimi

```
┌──────────────────────────────────────────────────┐
│ 👥 Üye Yönetimi                                   │
├──────────────────────────────────────────────────┤
│ Arama: [_____________] 🔍                        │
│ Filtre: [Durum ▼] [İlçe ▼] [Rol ▼]             │
├──────────────────────────────────────────────────┤
│                                                   │
│ 👤 Ahmet Yılmaz                                  │
│    Üyelik No: 34-12345                            │
│    Kadıköy · Delegeli Üye                        │
│    ✅ Aktif · Son aktivite: 2 gün önce           │
│    📊 Katılım skoru: 85/100                      │
│    [Profil] [Görev Ata] [İletişim]              │
│                                                   │
│ 👤 Mehmet Kaya                                   │
│    Üyelik No: 34-12346                            │
│    Şişli · Sandık Görevlisi                      │
│    ✅ Aktif · Son aktivite: Bugün                │
│    📊 Katılım skoru: 92/100                      │
│    [Profil] [Görev Ata] [İletişim]              │
│                                                   │
│ [Sayfa: 1 2 3 ... 150]                           │
└──────────────────────────────────────────────────┘
```

### Yeni Üye Kayıt

```
┌──────────────────────────────────────────────────┐
│ ➕ Yeni Üye Kaydı                                │
├──────────────────────────────────────────────────┤
│ Kişisel Bilgiler:                                 │
│ Ad Soyad: [________________]                     │
│ TC Kimlik No: [___________]                      │
│ Doğum Tarihi: [__/__/____]                       │
│ Cinsiyet: ⚪ Erkek ⚪ Kadın                      │
│                                                   │
│ İletişim:                                         │
│ Telefon: [+90 ___ ___ __ __]                     │
│ E-posta: [________________]                      │
│                                                   │
│ Adres:                                            │
│ İl: [İstanbul ▼]                                 │
│ İlçe: [Kadıköy ▼]                                │
│ Mahalle: [Fenerbahçe ▼]                          │
│ Tam Adres: [________________]                    │
│                                                   │
│ Teşkilat Bilgileri:                               │
│ Rol: [Üye ▼]                                     │
│ Kademe: ⚪ Mahalle ⚪ İlçe ⚪ İl                 │
│                                                   │
│ ☑️ Üyelik taahhütnamesi onaylandı                │
│ ☑️ KKK kanunu bilgilendirildi                    │
│                                                   │
│            [İptal]  [Kaydet]                      │
└──────────────────────────────────────────────────┘
```

---

## Görev Sistemi

### Görev Oluşturma

```
┌──────────────────────────────────────────────────┐
│ 📋 Yeni Görev Oluştur                            │
├──────────────────────────────────────────────────┤
│ Görev Başlığı:                                    │
│ [_____________________________________]          │
│                                                   │
│ Açıklama:                                         │
│ ┌───────────────────────────────────────────┐   │
│ │                                            │   │
│ │                                            │   │
│ │                                            │   │
│ └───────────────────────────────────────────┘   │
│                                                   │
│ Görev Türü:                                       │
│ ⚪ Etkinlik  ⚪ Saha Çalışması  ⚪ Toplantı      │
│ ⚪ Telefon Görüşmesi  ⚪ Diğer                   │
│                                                   │
│ Atanacak Kişi/Grup:                               │
│ [🔍 Ara veya seç]                                │
│ Seçilenler: Ahmet Y., Mehmet K. (+3)             │
│                                                   │
│ Öncelik:                                          │
│ ⚪ Düşük  🔘 Orta  ⚪ Yüksek  ⚪ Acil            │
│                                                   │
│ Bitiş Tarihi:                                     │
│ 📅 [20.11.2024] ⏰ [18:00]                      │
│                                                   │
│ Lokasyon (Opsiyonel):                             │
│ 📍 [Haritadan seç]                               │
│                                                   │
│ Dosya Ekle:                                       │
│ 📎 [Dosya seç]                                   │
│                                                   │
│ Bildirim Gönder:                                  │
│ ☑️ Atanan kişilere bildirim gönder               │
│ ☑️ E-posta gönder                                │
│                                                   │
│            [İptal]  [Oluştur]                     │
└──────────────────────────────────────────────────┘
```

### Görev Listesi

```
┌──────────────────────────────────────────────────┐
│ 📋 Görevler                           [+ Yeni]   │
├──────────────────────────────────────────────────┤
│ Tab: [Aktif (12)] [Tamamlanan (45)] [İptal (2)] │
├──────────────────────────────────────────────────┤
│ Filtre: [İlçe ▼] [Tür ▼] [Atanan ▼]            │
├──────────────────────────────────────────────────┤
│                                                   │
│ 🔴 ACİL: Seçim İzleme Toplantısı                │
│    Atanan: Mehmet K., Ayşe Y. (+8)               │
│    📅 Yarın 10:00 · 📍 İl Merkezi                │
│    ⏳ Kalan: 1 gün                               │
│    [Detay] [Güncelle]                            │
│                                                   │
│ 🟠 YÜKSEK: Mahalle Ziyaretleri                   │
│    Atanan: Kadıköy Ekibi (15 kişi)               │
│    📅 Bu hafta · 📍 21 mahalle                   │
│    ⏳ Kalan: 5 gün                               │
│    ✅ Tamamlanan: 12/21 (%57)                    │
│    [Detay] [Rapor Al]                            │
│                                                   │
│ 🟡 ORTA: Üye Kayıt Günü                          │
│    Atanan: Tüm ilçeler                            │
│    📅 20.11.2024 · 📍 39 nokta                   │
│    ⏳ Kalan: 6 gün                               │
│    Hazırlık: %75 tamamlandı                       │
│    [Detay] [Kontrol Et]                          │
└──────────────────────────────────────────────────┘
```

### Görev Detay ve Takip

```
┌──────────────────────────────────────────────────┐
│ 📋 Görev Detayı                                   │
├──────────────────────────────────────────────────┤
│ Mahalle Ziyaretleri - Kadıköy                     │
│ 🟠 Yüksek Öncelik · ⏳ 5 gün kaldı               │
│                                                   │
│ Açıklama:                                         │
│ Kadıköy'ün 21 mahallesinde kapı kapı ziyaret      │
│ yapılacak. Her mahallede en az 50 hane...         │
│                                                   │
│ Atanan Ekip: (15 kişi)                            │
│ 👤 Ahmet Y. (Ekip Lideri)                        │
│ 👤 Mehmet K., Ayşe D., Can Y. (+12)              │
│                                                   │
│ İlerleme: 12/21 Mahalle Tamamlandı (%57)         │
│ [████████████░░░░░░░░] 57%                       │
│                                                   │
│ ✅ Tamamlanan Mahalleler:                        │
│ • Fenerbahçe (50 hane)                            │
│ • Erenköy (45 hane)                               │
│ • Suadiye (60 hane)                               │
│ ... 9 mahalle daha                                │
│                                                   │
│ 🔄 Devam Eden:                                    │
│ • Göztepe (25/50 hane)                            │
│ • Caddebostan (30/50 hane)                        │
│                                                   │
│ 📊 İstatistikler:                                 │
│ • Toplam ziyaret: 587 hane                        │
│ • Olumlu karşılama: %78                           │
│ • Yeni üye adayı: 45 kişi                         │
│                                                   │
│ 💬 Güncellemeler (3):                             │
│ Ahmet Y. - 2 saat önce                            │
│ "Fenerbahçe tamamlandı. Çok olumlu tepkiler..."  │
│                                                   │
│ 📎 Dosyalar:                                      │
│ • Ziyaret Listesi.xlsx                            │
│ • Konuşma Rehberi.pdf                             │
│                                                   │
│ [Güncelle] [Tamamla] [İptal Et] [Rapor]         │
└──────────────────────────────────────────────────┘
```

---

## İletişim Sistemi

### Toplu Mesaj Gönderme

```
┌──────────────────────────────────────────────────┐
│ 📢 Toplu Duyuru Gönder                           │
├──────────────────────────────────────────────────┤
│ Alıcı Grubu:                                      │
│ ☑️ Tüm İl (350K üye)                             │
│ ☐ Sadece Aktif Üyeler (120K)                     │
│ ☐ Delegeler (1,250)                              │
│ ☐ İlçe Başkanları (39)                           │
│ ☐ Özel Seçim:                                     │
│    İlçe: [Seç ▼]                                 │
│    Rol: [Seç ▼]                                  │
│                                                   │
│ Mesaj Türü:                                       │
│ ⚪ Platform Bildirimi  ⚪ E-posta  ⚪ SMS         │
│                                                   │
│ Başlık:                                           │
│ [_____________________________________]          │
│                                                   │
│ Mesaj:                                            │
│ ┌───────────────────────────────────────────┐   │
│ │                                            │   │
│ │                                            │   │
│ └───────────────────────────────────────────┘   │
│ 📎 Dosya ekle  🔗 Link ekle                      │
│                                                   │
│ Zamanlama:                                        │
│ 🔘 Şimdi Gönder                                  │
│ ⚪ Zamanla: 📅 [__/__/____] ⏰ [__:__]          │
│                                                   │
│ Önizleme:                                         │
│ ┌───────────────────────────────────────────┐   │
│ │ [Mesajın nasıl görüneceği]                 │   │
│ └───────────────────────────────────────────┘   │
│                                                   │
│ ⚠️ 350,000 kişiye gönderilecek                   │
│ Tahmini maliyet: 0.05₺ × 350K = 17,500₺          │
│                                                   │
│            [İptal]  [Gönder]                      │
└──────────────────────────────────────────────────┘
```

### İç Hiyerarşik İletişim

```
┌──────────────────────────────────────────────────┐
│ 💬 Teşkilat İletişim                             │
├──────────────────────────────────────────────────┤
│ Kanallar:                                         │
│                                                   │
│ 🏢 İl Yönetimi (5 kişi)                          │
│    Son mesaj: "Toplantı cumartesi..." - 1 saat   │
│    [Aç]                                           │
│                                                   │
│ 📍 İlçe Başkanları (39 kişi)                     │
│    Son mesaj: "Kadıköy raporu..." - 2 saat       │
│    3 okunmamış                                    │
│    [Aç]                                           │
│                                                   │
│ 👥 Kadıköy Ekibi (15 kişi)                       │
│    Son mesaj: "Bugün 50 hane..." - 30 dk         │
│    [Aç]                                           │
│                                                   │
│ 📣 Genel Duyurular (Sadece okuma)                │
│    Son mesaj: "Seçim takvimi..." - Dün           │
│    [Aç]                                           │
└──────────────────────────────────────────────────┘
```

---

## Raporlama

### Otomatik Periyodik Raporlar

```javascript
// Haftalık rapor (Her Pazartesi 09:00)
const weeklyReport = {
  report_type: "weekly",
  party_id: 1,
  city_id: 34,
  week: "2024-W46",
  
  summary: {
    new_members: 125,
    new_members_change: "+15%",
    active_members: 120450,
    active_rate: 34.4,
    events_held: 12,
    tasks_completed: 45,
    task_completion_rate: 78
  },
  
  districts: [
    {
      district_name: "Kadıköy",
      new_members: 18,
      events: 3,
      tasks_completed: 8,
      score_change: +2
    },
    // ... diğer ilçeler
  ],
  
  top_performers: [
    {name: "Ahmet Yılmaz", role: "İlçe Başkanı", metric: "En çok yeni üye (18)"},
    {name: "Mehmet Kaya", role: "Mahalle Temsilcisi", metric: "En yüksek katılım (%95)"}
  ],
  
  alerts: [
    "Fatih ilçesinde aktivite düşüşü (-12%)",
    "3 görev gecikmeli durumda"
  ]
};
```

### Rapor Şablonları

#### İl Seviyesi Aylık Rapor

```markdown
# İstanbul İl Teşkilatı - Kasım 2024 Raporu

## Özet
- **Üye Sayısı**: 350,000 (+2,500)
- **Aktif Üye**: 120,000 (%34.3)
- **Yeni Üye**: 2,500 (↗️ %0.7)
- **Güç Skoru**: 85/100 (↗️ +3)

## Faaliyetler
- Toplantı: 45
- Etkinlik: 28
- Saha Çalışması: 120 mahalle
- Toplam Katılım: 11,250 kişi

## İlçe Performansları

### En İyi 5 İlçe
1. **Kadıköy**: 92/100 (↗️ +2)
2. **Beşiktaş**: 88/100 (→ 0)
3. **Şişli**: 86/100 (↗️ +1)
4. **Üsküdar**: 84/100 (↗️ +3)
5. **Bakırköy**: 82/100 (↗️ +2)

### Dikkat Gerektiren İlçeler
- **Fatih**: 65/100 (↘️ -3) - Aktivite düşüşü
- **Eyüp**: 62/100 (↘️ -2) - Katılım oranı düşük

## Hedefler ve Gerçekleşmeler
- ✅ 5,000 yeni üye: 4,850 (%97)
- ✅ 50 etkinlik: 45 (%90)
- ⚠️ %80 görev tamamlama: %78 (Hedefin altında)

## Öneriler
1. Fatih ilçesinde destek toplantısı düzenlensin
2. Dijital üye kayıt sistemi daha aktif kullanılmalı
3. Gençlik kolları aktivitesi artırılmalı

---
Rapor Tarihi: 30.11.2024
Hazırlayan: Sistem (Otomatik)
```

### Excel/PDF Export

```typescript
interface ReportExport {
  format: 'excel' | 'pdf';
  sections: string[]; // ['summary', 'districts', 'members', 'tasks']
  dateRange: {
    start: Date;
    end: Date;
  };
  filters: {
    city_id?: number;
    district_id?: number;
    party_id: number;
  };
}

async function exportReport(config: ReportExport): Promise<Blob> {
  const data = await generateReportData(config);
  
  if (config.format === 'excel') {
    return generateExcel(data);
  } else {
    return generatePDF(data);
  }
}
```

---

**Sonraki Dokümantasyon**: [06-AI-ANALYTICS.md](./06-AI-ANALYTICS.md)
