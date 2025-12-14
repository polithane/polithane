# ✨ Polithane - Özellikler Detaylı Açıklama

## 🎯 Temel Konsept

Polithane, Türkiye siyasetini şeffaflaştıran, demokratikleştiren ve etkileşimli hale getiren bir sosyal medya platformudur. Her etkileşim "Polit Puan" ile ölçülür ve algoritma tamamen açıktır.

---

## 🏠 ANA SAYFA ÖZELLİKLERİ

### 1. Hero Slider (Öne Çıkan Paylaşımlar)
**Amaç**: En çok etkileşim alan paylaşımları öne çıkarmak

**Özellikler**:
- Otomatik geçiş (5 saniye)
- `is_featured: true` olan postlar
- Büyük görsel + başlık + Polit Puan
- Tıklanabilir (detay sayfasına gider)

**Teknik**:
- Component: `HeroSlider.jsx`
- Auto-scroll ile carousel
- Responsive: Mobilde tek kart, desktop'ta tam genişlik

---

### 2. Meclis Dağılımı (Parliament Bar)
**Amaç**: TBMM'deki sandalye dağılımını görselleştirmek

**Özellikler**:
- Parti bayrakları (genişlik = sandalye oranı)
- Hover ile parti detay popup
  - Milletvekili sayısı
  - Büyükşehir belediye sayısı
  - İlçe belediye sayısı
  - Gündeme katkı
- Tüm bilgiler tıklanabilir (ilgili sayfaya gider)

**Alt Bölüm - İl Plaka Kodları**:
- 1-81 arası tüm il plakaları
- Tek satırda, bitişik, 15px yuvarlak butonlar
- Hover ile il detay popup
  - Milletvekili sayısı
  - Büyükşehir belediyesi durumu
  - İlçe sayısı
  - Paylaşım sayısı
- Tıklanabilir (il detay sayfasına gider)

**Teknik**:
- Component: `ParliamentBar.jsx`
- Popups: `PartyDetailPopup.jsx`, `CityDetailPopup.jsx`
- Data: `currentParliamentDistribution` (data/parliamentDistribution.js)

---

### 3. Stories Bar (Kısa İçerikler)
**Amaç**: Instagram Reels/Stories benzeri kısa video paylaşımları

**Özellikler**:
- 50x50px yuvarlak profil resimleri
- Mavi gradient border (story sayısına göre kesikli)
- Story count badge
- "+" Tümü butonu (sabit sağda)
- Yatay scrollable

**Teknik**:
- Component: `StoriesBar.jsx`
- 20 mock story
- `overflow-x-auto` ile yatay scroll
- Absolute positioned "+" button

---

### 4. Gündem Bar (Agenda Bar)
**Amaç**: Trend olan gündem başlıklarını göstermek

**Desktop Görünümü**:
- **1. Satır**: 3 gündem + REKLAM + 1 gündem
- **2. Satır**: 5 gündem + "TÜM GÜNDEME BAK" butonu
- Ateş ikonları (1., 2., 3. için farklı boyut/renk)
- Flash animasyonları (farklı hızlar)

**Mobil Görünümü**:
- İlk 4 item göster (3 gündem + 1 reklam)
- Pill-shaped butonlar
- "Tümünü Gör" butonu

**Reklam Alanı**:
- 4. pozisyon (desktop)
- "🏦 YusufBANK" gradient butonu
- Tıklanınca yusufbank.com

**Teknik**:
- Component: `AgendaBar.jsx`
- Sticky mobilde
- Consistent 36px yükseklik

---

## 📱 İÇERİK KARTLARI (Post Cards)

### PostCardHorizontal
**En kritik component** - Tüm paylaşımları gösterir

### Üst Bilgi Alanı
1. **Avatar + Plaka Kodu** (sol)
   - 32px avatar
   - Plaka kodu avatar altında (9px font)
   - Tıklanabilir → profil/il sayfası

2. **İsim** (2 satır sabit - 36px)
   - `line-clamp-2`
   - Her zaman 36px yükseklik (hizalama için)
   - Hover efekti

3. **Ünvan** (tek satır)
   - Kısaltılmış format (örn: "G. Başkan Yard.")
   - Tıklanabilir → kategori sayfası

4. **Parti Logosu** (sağ üst)
   - 28px boyut (%40 büyütülmüş)
   - Absolute positioned
   - Tıklanabilir → parti sayfası

### Görsel Alanı (150px Sabit Yükseklik)

#### Video Paylaşımı
- Thumbnail gösterimi
- 3D Play ikonu (64px, mavi gradient)
- Hover: scale-110

#### Resim Paylaşımı
**Grid Layoutları**:
- **1 Resim**: Tek resim, tam alan
- **2 Resim**: İki kolon (50% - 50%)
- **3 Resim**: Sol büyük (66.67%) + Sağ 2 küçük (33.33%)
- **4 Resim**: 2×2 grid (4 eşit parça)
- **5+ Resim**: İlk 3 resim + "Tümü (X)" butonu
  - 3D Image ikonu (mavi gradient)
  - Hover: scale-110

#### Ses Paylaşımı
- 3D Mikrofon ikonu (64px, yeşil gradient)
- Hover: scale-110
- Süre bilgisi

#### Metin Paylaşımı
- 3D Defter ikonu (64px, turuncu gradient)
- Notebook çizgileri border
- Hover: scale-110

### İçerik Açıklaması
- 2 satır sabit (42px)
- `line-clamp-2`
- Her zaman 42px yükseklik (hizalama için)

### Reklam Alanı
- 35px sabit yükseklik
- Gradient: purple → pink → red
- "🎯 Sponsorlu İçerik"
- Random ad links

### Gündem Etiketi
- 2 satır sabit (40px)
- Mavi pill-shaped button
- Tıklanabilir → gündem sayfası

### Alt Bilgi
- **Polit Puan** (sol): Büyük, mavi, tıklanabilir → detay modal
- **Paylaşım Zamanı** (sağ): "2 saat önce" formatı

### Etkileşim Çubuğu
- Göz (görüntülenme)
- Kalp (beğeni) - Ana sayfada küçük
- Mesaj (yorum)
- Paylaş

**Teknik**:
- Component: `PostCardHorizontal.jsx`
- Fixed heights: isim 36px, açıklama 42px, görsel 150px
- Responsive: fullWidth prop ile mobil uyum

---

## 📄 PAYLAŞIM DETAY SAYFASI

### Özel BEĞEN Butonu
**En önemli özellik** - Siteyi Polit Puan'dan ayıran unsur

**Tasarım**:
- **16×16 kalp ikonu** (filled, beyaz)
- **"BEĞEN"** yazısı (3xl, font-black)
- **Beğeni sayısı** (beyaz badge içinde)
- Gradient: red-500 → pink-500
- Hover: scale-110, shadow-2xl
- px-12 py-6 (çok büyük)

**Amaç**:
- Kullanıcıyı beğenmeye teşvik etmek
- Polit Puan artışını görselleştirmek
- Etkileşimi maksimize etmek

### Diğer Özellikler
- Post içeriği (text/image/video/audio)
- Polit Puan (sadece "P." formatı)
- "Detaylı Hesaplama" butonu → modal
- 8-10 örnek yorum
- Yorum ekleme formu
- Normal etkileşim butonları (yorum, paylaş, şikayet)

**Teknik**:
- Component: `PostDetailPage.jsx`
- Route: `/post/:postId`
- `generateMockPosts(400)` ile tüm postlar çalışır

---

## 🏛️ PARTİ DETAY SAYFASI

### Özellikler
- Parti bilgileri (logo, isim, renk)
- Milletvekili listesi
- Büyükşehir belediyeleri
- İlçe belediyeleri
- Gündem katkıları
- Parti paylaşımları

**Teknik**:
- Component: `PartyDetailPage.jsx`
- Route: `/party/:partyId`

---

## 🏙️ İL DETAY SAYFASI

### Özellikler
- İl bilgileri (plaka, isim)
- Milletvekili listesi
- Belediye bilgileri
- İl bazlı paylaşımlar
- İl bazlı gündem katkıları

**Teknik**:
- Component: `CityDetailPage.jsx`
- Route: `/city/:cityCode`

---

## 📋 GÜNDEM DETAY SAYFASI

### Özellikler
- Gündem başlığı
- Gündem ile ilgili tüm paylaşımlar
- Polit Puana göre sıralı
- Kategori filtreleme

**Teknik**:
- Component: `AgendaDetailPage.jsx`
- Route: `/agenda/:agendaSlug`

---

## 👤 PROFİL SAYFASI

### Özellikler
- Kullanıcı bilgileri
- Verification badge
- Parti bilgisi
- Ünvan/görev
- Kullanıcının paylaşımları
- Kullanıcı istatistikleri

**Teknik**:
- Component: `ProfilePage.jsx`
- Route: `/profile/:userId`

---

## 💬 POLİT PUAN DETAY MODAL

### Şeffaflık Prensibi
**Polithane'in ana felsefesi**: Tüm algoritma açık!

### Modal İçeriği
**Puan Dağılımı**:
- Üye Olmayanların Okumaları: 5 P.
- Parti Üyelerinin Okumaları: 25 P.
- Rakip Parti Üyelerinin Okumaları: 50 P.
- Siyasetçi Okumaları: 260 P.
- Milletvekili Okumaları: 500 P.
- Parti Lideri Okumaları: 1,000 P.

### Etkileşim Çarpanları
- Beğeni: 5× temel puan
- Yorum: 10× temel puan
- Paylaşım: 50× temel puan

**Her Detay Tıklanabilir**:
- "Rakip parti üyesi okumaları" → Liste açılır
- "Milletvekili beğenileri" → Kim beğenmiş listesi
- Tam şeffaflık!

**Teknik**:
- Component: `PolitScoreDetailModal.jsx`
- Tüm içerik kartlarında ve detay sayfasında

---

## 🎨 GÖRSEL TASARIM ÖZELLİKLERİ

### 3D İkonlar
**Video**: 
- Play triangle (3D effect)
- Mavi gradient (from-blue-500 to-blue-600)
- Shadow + hover scale

**Resim**:
- Image frame icon (3D effect)
- Mavi gradient
- Multiple image indicator

**Ses**:
- Microphone icon (3D effect)
- Yeşil gradient (from-green-500 to-green-600)
- Audio waveform effect

**Metin**:
- Notebook page icon (3D effect)
- Turuncu gradient (from-orange-500 to-orange-600)
- Paper lines (border decoration)

### Resim Grid Sistemleri
**1 Resim**: 
```
[  Tek Resim  ]
```

**2 Resim**:
```
[ R1 ][ R2 ]
```

**3 Resim**:
```
[  R1  ][ R2 ]
       [ R3 ]
```

**4 Resim**:
```
[ R1 ][ R2 ]
[ R3 ][ R4 ]
```

**5+ Resim**:
```
[ R1 ][ R2 ]
[ R3 ][TÜMÜ]
```

---

## 🎯 KATEGORİ SİSTEMİ

### 1. HİT PAYLAŞIMLAR (Tüm Kategoriler)
- En yüksek Polit Puanlı içerikler
- Tüm kullanıcı tiplerinden
- Polit Puana göre sıralı

### 2. VEKİLLER KONUŞUYOR
- Sadece `politician_type: 'mp'`
- Milletvekillerinin paylaşımları
- Polit Puana göre sıralı

### 3. TEŞKİLAT KONUŞUYOR
- İl başkanları, ilçe başkanları
- Belediye başkanları
- MYK üyeleri, genel başkan yardımcıları
- Diğer parti yöneticileri

### 4. VATANDAŞ KONUŞUYOR
- `user_type: 'normal'`
- Sıradan vatandaşların görüşleri
- Demokrasinin sesi

### 5. DENEYİMLİ SİYASETÇİLER
- `user_type: 'ex_politician'`
- Eski milletvekilleri, bakanlar
- Tecrübeli görüşler

### 6. MEDYA KONUŞUYOR
- `user_type: 'media'`
- Gazeteciler, editörler
- Haber kuruluşları

**Teknik**:
- Fonksiyon: `getCategoryPosts(category)`
- Otomatik Polit Puan sıralaması (DESC)
- Her kategori 30 post

---

## 🎭 KULLANICI ÜNVANLARI

### Tam Format (Profil Sayfası)
- "Ankara Milletvekili"
- "Genel Başkan"
- "İstanbul İl Başkanı"
- "Kadıköy İlçe Başkanı"
- "İstanbul Büyükşehir Belediye Başkanı"
- "Kadıköy Belediye Başkanı"
- "MYK Üyesi"
- "Genel Başkan Yardımcısı"

### Kısa Format (İçerik Kartları)
- "Milletvekili"
- "Genel Başkan"
- "İl Başkanı"
- "İlçe Başkanı"
- "Büyükşehir Bld. Bşk."
- "İlçe Bld. Bşk."
- "MYK Üyesi"
- "G. Başkan Yard."

### Vatandaş Ünvanları
- Parti üyesi değil: "Üye"
- Parti üyesi: "Parti Üyesi"

**Teknik**:
- Fonksiyonlar: `getPoliticianTitle()`, `getUserTitle()`
- `short` parametresi ile kısa/uzun seçimi
- File: `utils/titleHelpers.js`

---

## 💯 POLİT PUAN SİSTEMİ

### Format Kuralları
```javascript
3 → "3 P."
150 → "150 P."
2156 → "2,15K P."  // Virgül ondalık ayracı
1500000 → "1,50M P."
```

### Hesaplama (Mock)
```javascript
// Kullanıcı tipine göre puan aralıkları
Parti Lideri: 30K - 100K
Milletvekili: 5K - 50K
Teşkilat: 2K - 15K
Deneyimli Siyasetçi: 8K - 40K
Medya: 5K - 25K
Vatandaş: 100 - 3K
```

### Gerçek Hesaplama (Gelecek)
```javascript
// Temel formül
görüntülenme × 1 + 
beğeni × (5-100 kullanıcı tipine göre) +
yorum × (10-200 kullanıcı tipine göre) +
paylaşım × (50-1000 kullanıcı tipine göre)

// Ek faktörler
+ Gündem popülaritesi bonusu
+ Zaman faktörü (yeni paylaşımlar bonus)
+ Verification badge bonusu
+ Parti etki gücü bonusu
```

**Teknik**:
- Fonksiyon: `formatPolitScore()` (utils/formatters.js)
- Algoritma: `utils/politScore.js` (gelecekte)

---

## 🎨 RESPONSIVE TASARIM

### Mobil Görünüm (< 768px)
- **Stories**: Yatay scroll
- **Gündem**: İlk 4 item (3 + reklam)
- **İçerik Kartları**: 2'li grid, dikey scroll
- **Tab Navigation**: Sticky top
- **Meclis Dağılımı**: Gizli

### Desktop Görünüm (> 1024px)
- **Stories**: Tek satır, scroll
- **Gündem**: 2 satır grid
- **İçerik Kartları**: Horizontal scroll (5 kart)
- **Meclis Dağılımı**: Görünür
- **MediaSidebar**: Sağda sidebar

---

## 🎁 REKLAM ALANLARI

### 1. Gündem Bar - 4. Pozisyon
- Desktop: 180px genişlik × 36px yükseklik
- Mobil: Pill-shaped buton
- "🏦 YusufBANK"
- Gradient: amber-400 → amber-500

### 2. İçerik Kartı - İçinde
- Full width × 35px yükseklik
- Gradient: purple → pink → red
- "🎯 Sponsorlu İçerik"
- Random ad rotation

**Gelecek Plan**:
- Google AdSense entegrasyonu
- Kendi reklam yönetim sistemi
- Sponsored post sistemi

---

## 🔗 TIKLAMA AKSİYONLARI

### İçerik Kartında Tıklanabilir Elemanlar
1. **Avatar** → `/profile/:userId`
2. **İsim** → `/profile/:userId`
3. **Ünvan** → `/category/:categoryName`
4. **Plaka Kodu** → `/city/:cityCode`
5. **Parti Logosu** → `/party/:partyId`
6. **Görsel** → `/post/:postId`
7. **Gündem Etiketi** → `/agenda/:agendaSlug`
8. **Polit Puan** → Detay Modal Aç
9. **Kart Genel** → `/post/:postId`

### Meclis Dağılımında
1. **Bayrak Hover** → Parti detay popup
2. **Bayrak Tıklama** → `/party/:partyId`
3. **Plaka Hover** → İl detay popup
4. **Plaka Tıklama** → `/city/:cityCode`

### Gündem Bar'da
1. **Gündem Başlığı** → `/agenda/:agendaSlug`
2. **Reklam** → External link (yusufbank.com)
3. **TÜM GÜNDEME BAK** → `/agendas`

---

## 🎯 POPUP SİSTEMİ

### PartyDetailPopup (Bayrak Hover)
**Görünen Bilgiler**:
- Parti logosu + isim
- Sandalye sayısı (örn: "150 Sandalye - 25%")
- Milletvekili sayısı (tıklanabilir)
- Büyükşehir belediye sayısı (tıklanabilir)
- İlçe belediye sayısı (tıklanabilir)
- Gündeme katkı (tıklanabilir)
- "Parti Profili" butonu

**Çalışma**:
- Mouse bayrak üzerine → Popup açılır
- Mouse bayraktan çıkar → 150ms delay sonra kapanır
- Mouse popup'a gelirse → Açık kalır
- Mouse popup'tan çıkar → Kapanır

### CityDetailPopup (Plaka Hover)
**Görünen Bilgiler**:
- Plaka + il ismi
- Milletvekili sayısı (tıklanabilir)
- Büyükşehir belediyesi durumu (tıklanabilir)
- İlçe sayısı (tıklanabilir)
- Paylaşım sayısı (tıklanabilir)
- "İl Detayları" butonu

**Teknik**:
- Components: `PartyDetailPopup.jsx`, `CityDetailPopup.jsx`
- Fixed positioned (z-50)
- Backdrop (z-40) ile arka plan karartma
- Dynamic positioning (element altında açılır)

---

## 🎬 STORIES (KISA İÇERİKLER)

### Görünüm
- 50×50px yuvarlak profil resimleri
- Mavi gradient border (story sayısına göre kesikli)
- Story count badge (sağ üstte)
- "+" Tümü butonu (sabit sağda)

### Border Mantığı
- 1 story: Tek border (360°)
- 2 story: İki parça (180° + 180°)
- 3 story: Üç parça (120° + 120° + 120°)
- ...ve devamı

**Teknik**:
- Component: `StoriesBar.jsx`
- `conic-gradient` ile border
- Absolute positioned "+" button
- `overflow-x-auto` ile scroll

---

## 📊 MOCK DATA YÖNETİMİ

### Mock Veriler
Geliştirme için statik mock veriler kullanılıyor:

**posts.js**:
- `mockPosts`: İlk 10 özel post
- `generateMockPosts(count)`: İstenen sayıda post üretir
- `getCategoryPosts(category)`: Kategori filtreleme

**users.js**:
- `mockUsers`: 50+ çeşitli kullanıcı
- Tüm kullanıcı tipleri (politician, normal, media, vb.)
- Her kullanıcı party_id ve city_code ile

**parties.js**:
- `mockParties`: Türkiye'deki başlıca partiler
- Logo, renk, kısa isim bilgileri

**agendas.js**:
- `mockAgendas`: Güncel gündemler
- Polit Puan toplamları

**comments.js**:
- `generateMockComments(count)`: Yorum üretir

### Mock → Real Geçiş Planı
```javascript
// ŞİMDİ
const posts = generateMockPosts(400);

// GELECEK
const posts = await api.get('/api/posts', { 
  params: { limit: 400, sort: 'polit_score' } 
});
```

---

## 🔐 GÜVENLİK VE DOĞRULAMA

### Verification Badge
- Mavi tick icon
- Doğrulanmış siyasetçiler
- Doğrulanmış medya
- Doğrulanmış kurumlar

### Gelecek Güvenlik Katmanları
1. JWT authentication
2. Rate limiting
3. Content moderation
4. Spam prevention
5. CAPTCHA
6. 2FA

---

## 📱 MOBİL OPTİMİZASYON

### Mobil-First Yaklaşım
Site esas olarak **mobil odaklı** tasarlanmıştır.

### Mobil Özellikler
1. **Sticky Gündem Bar**: Top'ta sabit
2. **Tab Navigation**: Kategori geçişi
3. **2'li Grid**: İçerik kartları
4. **Dikey Scroll**: Sonsuz akış
5. **Touch Friendly**: Büyük butonlar
6. **Fast Loading**: Optimize edilmiş görseller

### Desktop Ek Özellikler
1. **Horizontal Scroll**: Karusel görünümü
2. **MediaSidebar**: Sağda medya içerikleri
3. **Meclis Dağılımı**: Bayraklar ve plakalar
4. **Daha Fazla Kart**: 5 kart eşzamanlı

---

## 🚀 PERFORMANS OPTİMİZASYONU

### Mevcut Optimizasyonlar
1. **Lazy Loading**: Route-based
2. **Image Optimization**: Fixed heights
3. **CSS Utility**: Tailwind (purge ile küçük bundle)
4. **Code Splitting**: Vite otomatik

### Gelecek Optimizasyonlar
1. **React.memo**: Gereksiz render'ları önle
2. **useMemo/useCallback**: Expensive hesaplamalar için
3. **Virtual Scrolling**: Sonsuz liste için
4. **Image CDN**: Cloudinary/Cloudflare
5. **Service Worker**: Offline support
6. **Progressive Web App**: PWA desteği

---

## 🎨 DESIGN TOKENS

### Renkler
```javascript
primary-blue: #009FD6    // Ana mavi
primary-green: #10b981   // Yeşil
accent-mustard: #f59e0b  // Hardal
primary-red: #ef4444     // Kırmızı
```

### Sabit Boyutlar
```javascript
Avatar: 32px (kartlarda), 60px (profilde)
Parti Logo: 28px (kartlarda)
Plaka Buton: 15px × 15px
İsim Alanı: 36px (2 satır)
Açıklama Alanı: 42px (2 satır)
Görsel Alanı: 150px (sabit)
Reklam Alanı: 35px (kartlarda)
```

### Spacing
```javascript
gap-2: 8px   // Kartlar arası (mobil)
gap-3: 12px  // Kartlar arası (desktop)
gap-0.5: 2px // Minimal (plakalar)
```

---

## 🔄 GELECEK GELİŞTİRMELER

### Faz 1: Backend (1-2 ay)
- [ ] REST API geliştirme
- [ ] PostgreSQL database kurulumu
- [ ] JWT authentication
- [ ] File upload (AWS S3/Cloudinary)
- [ ] WebSocket (Socket.io)

### Faz 2: Frontend Entegrasyon (1 ay)
- [ ] API client (Axios/Fetch)
- [ ] React Query entegrasyonu
- [ ] Authentication flow
- [ ] Loading/Error states
- [ ] Optimistic updates

### Faz 3: Yeni Özellikler (2-3 ay)
- [ ] Bildirimler sistemi
- [ ] Mesajlaşma (private messages)
- [ ] Arama motoru (Elasticsearch)
- [ ] Admin paneli
- [ ] İçerik moderasyonu
- [ ] Raporlama sistemi

### Faz 4: Analitik & SEO (1 ay)
- [ ] Google Analytics
- [ ] SEO optimizasyonu
- [ ] Open Graph tags
- [ ] Sitemap
- [ ] Meta tags

### Faz 5: Mobil App (3-4 ay)
- [ ] React Native app
- [ ] Push notifications
- [ ] Deep linking
- [ ] App store publish

---

## 📈 BAŞARI METRİKLERİ

### KPI'lar
1. **Günlük Aktif Kullanıcı (DAU)**
2. **Toplam Polit Puan Üretimi**
3. **Paylaşım Başına Ortalama Etkileşim**
4. **Kategori Dağılımı** (Vatandaş vs Siyasetçi)
5. **Gündem Çeşitliliği**

### Başarı Kriterleri
- [ ] 10,000+ kayıtlı kullanıcı
- [ ] 50,000+ günlük ziyaretçi
- [ ] 1,000+ günlük paylaşım
- [ ] Tüm TBMM üyeleri kayıtlı
- [ ] Ana partilerin resmi hesapları aktif

---

**Son Güncelleme**: 2025-11-20
**Durum**: Development (Alpha)
**Gelecek Milestone**: Backend API Entegrasyonu
