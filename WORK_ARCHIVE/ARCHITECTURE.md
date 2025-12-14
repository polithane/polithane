# 🏗️ Polithane - Sistem Mimarisi

## 📋 Genel Bakış

Polithane, Türkiye siyasetini şeffaflaştıran ve demokratikleştiren bir sosyal medya platformudur. React + Vite ile geliştirilmiş, modern ve performanslı bir SPA (Single Page Application) uygulamasıdır.

---

## 🎯 Temel Felsefe

### Şeffaflık İlkesi
- **Açık Algoritma**: Polit Puan hesaplama sistemi tamamen şeffaf
- **Tüm Etkileşimler Görünür**: Her puanın nereden geldiği detaylı gösterilir
- **Hesap Verebilirlik**: Kullanıcılar tüm hesaplamaları görebilir

### Polit Puan Sistemi
Platformun kalbidir. Her etkileşim puanlanır:
- Görüntüleme: Temel puan
- Beğeni: Yüksek puan (kullanıcı tipine göre değişken)
- Yorum: Daha yüksek puan
- Paylaşım: En yüksek puan

---

## 📁 Klasör Yapısı

```
src/
├── components/          # Tüm React componentleri
│   ├── common/         # Yeniden kullanılabilir UI bileşenleri
│   │   ├── Avatar.jsx
│   │   ├── Badge.jsx
│   │   ├── Button.jsx
│   │   ├── Card.jsx
│   │   ├── Modal.jsx
│   │   ├── PartyDetailPopup.jsx      # Parti detay popup (bayraklar için)
│   │   ├── CityDetailPopup.jsx       # İl detay popup (plakalar için)
│   │   └── PolitScoreDetailModal.jsx # Polit Puan detay modal
│   │
│   ├── home/           # Ana sayfa bileşenleri
│   │   ├── HeroSlider.jsx     # Öne çıkan paylaşımlar slider
│   │   ├── ParliamentBar.jsx  # Meclis dağılımı + İl plakaları
│   │   ├── StoriesBar.jsx     # Reels/Hikaye benzeri kısa içerikler
│   │   └── AgendaBar.jsx      # Gündem başlıkları + Reklam alanı
│   │
│   ├── post/           # İçerik kartları
│   │   ├── PostCard.jsx           # Dikey post kartı
│   │   └── PostCardHorizontal.jsx # Yatay post kartı (karusel için)
│   │
│   ├── layout/         # Sayfa yapısı
│   │   ├── Header.jsx
│   │   └── Footer.jsx
│   │
│   └── media/          # Medya sidebar
│       └── MediaSidebar.jsx
│
├── pages/              # Sayfa component'leri
│   ├── HomePage.jsx
│   ├── PostDetailPage.jsx      # Paylaşım detay sayfası
│   ├── ProfilePage.jsx
│   ├── PartyDetailPage.jsx     # Parti profil sayfası
│   ├── AgendaDetailPage.jsx    # Gündem detay sayfası
│   ├── CityDetailPage.jsx      # İl detay sayfası
│   ├── LoginPage.jsx
│   ├── RegisterPage.jsx
│   ├── MessagesPage.jsx
│   └── SearchPage.jsx
│
├── mock/               # Mock veriler (geliştirme için)
│   ├── posts.js       # Paylaşımlar + generateMockPosts
│   ├── users.js       # Kullanıcılar (siyasetçi, vatandaş, medya)
│   ├── parties.js     # Partiler
│   ├── agendas.js     # Gündemler
│   └── comments.js    # Yorumlar
│
├── utils/              # Yardımcı fonksiyonlar
│   ├── formatters.js      # Sayı, tarih, Polit Puan formatlama
│   ├── titleHelpers.js    # Kullanıcı ünvanları (kısa/uzun)
│   ├── imagePaths.js      # Resim path yönetimi
│   ├── politScore.js      # Polit Puan hesaplama algoritması
│   ├── validators.js      # Form validasyonları
│   └── constants.js       # Sabit değerler
│
└── data/               # Gerçek statik veriler
    ├── membersOfParliament.js      # TBMM vekil listesi
    └── parliamentDistribution.js   # Meclis sandalye dağılımı
```

---

## 🔄 Component Hiyerarşisi

### Ana Sayfa (HomePage)
```
HomePage
├── HeroSlider (Öne çıkan paylaşımlar)
├── ParliamentBar
│   ├── Bayrak alanları (hover → PartyDetailPopup)
│   └── İl plaka kodları (hover → CityDetailPopup)
├── StoriesBar (Reels/Stories benzeri)
├── AgendaBar (Gündem + Reklam)
├── Tab Navigation (Mobil)
├── PostCardHorizontal (Grid - Mobil: 2'li, Desktop: Horizontal Scroll)
└── MediaSidebar (Desktop)
```

### İçerik Kartı (PostCardHorizontal)
```
PostCardHorizontal
├── Parti Logosu (sağ üst)
├── Avatar + Plaka Kodu
├── İsim (2 satır sabit)
├── Ünvan (kısa format)
├── Görsel (150px sabit yükseklik)
│   ├── Video (thumbnail + 3D play icon)
│   ├── Resim (1-5+ grid layouts)
│   ├── Ses (3D mikrofon icon)
│   └── Metin (3D defter icon)
├── Açıklama (2 satır sabit - 42px)
├── Reklam Alanı (35px sabit)
├── Gündem Etiketi (2 satır sabit)
├── Polit Puan + Paylaşım Zamanı
└── Etkileşim İkonları
```

---

## 🎨 State Management

### React useState Kullanımı
- **Lokal State**: Component bazlı state yönetimi
- **Props Drilling**: Parent'tan child'a veri aktarımı
- **Mock Data**: Geliştirme için statik veriler

### Gelecek Planı
- **Context API** veya **Redux**: Global state için
- **React Query**: API cache ve data fetching
- **WebSocket**: Real-time güncellemeler

---

## 🌐 Routing Yapısı

### Mevcut Route'lar
```javascript
/ → HomePage
/post/:postId → PostDetailPage
/profile/:userId → ProfilePage
/party/:partyId → PartyDetailPage
/agenda/:agendaSlug → AgendaDetailPage
/city/:cityCode → CityDetailPage
/login → LoginPage
/register → RegisterPage
/messages → MessagesPage
/search → SearchPage
/admin → AdminDashboard
```

### Dinamik Parametreler
- `:postId` - Post ID (number)
- `:userId` - Kullanıcı ID (number)
- `:partyId` - Parti ID (number)
- `:agendaSlug` - Gündem slug (string, SEO friendly)
- `:cityCode` - İl plaka kodu (01-81)

---

## 👥 Kullanıcı Tipleri

### 1. Politician (Siyasetçi)
**Alt Tipler:**
- `mp` - Milletvekili
- `party_chair` - Genel Başkan
- `provincial_chair` - İl Başkanı
- `district_chair` - İlçe Başkanı
- `metropolitan_mayor` - Büyükşehir Belediye Başkanı
- `district_mayor` - İlçe Belediye Başkanı
- `myk_member` - MYK Üyesi
- `vice_chair` - Genel Başkan Yardımcısı
- `other` - Diğer Parti Yöneticisi

### 2. Ex-Politician (Deneyimli Siyasetçi)
- Eski milletvekilleri, bakanlar vb.
- Deneyim puanı yüksek

### 3. Media (Medya)
- Gazeteciler, editörler, medya kuruluşları

### 4. Party Member (Parti Üyesi)
- Kayıtlı parti üyeleri

### 5. Normal (Vatandaş)
- Parti üyesi değil: "Üye"
- Parti üyesi: "Parti Üyesi"

---

## 🎯 İçerik Tipleri (Content Types)

### 1. Text (Metin)
- Sadece metin paylaşımı
- 3D defter ikonu ile gösterim

### 2. Image (Resim)
- **1 Resim**: Tek resim gösterimi
- **2 Resim**: İki bölüm grid (dikey)
- **3 Resim**: Sol büyük + sağ 2 küçük
- **4 Resim**: 2x2 grid
- **5+ Resim**: İlk 3 resim + "Tümü (X)" butonu

### 3. Video
- Thumbnail + 3D play ikonu
- Video player entegrasyonu (ReactPlayer)
- Süre gösterimi

### 4. Audio
- 3D mikrofon ikonu
- Audio player
- Süre gösterimi

---

## 💰 Polit Puan Algoritması

### Hesaplama Faktörleri
```javascript
// Temel formül
Polit Puan = (Görüntüleme × 1) + 
             (Beğeni × 5-50*) + 
             (Yorum × 10-100*) + 
             (Paylaşım × 50-500*)

* Kullanıcı tipine göre çarpan değişir
```

### Kullanıcı Tipi Çarpanları
- **Normal Kullanıcı**: 1x
- **Parti Üyesi**: 5x
- **Rakip Parti Üyesi**: 10x
- **Teşkilat**: 15x
- **Milletvekili**: 50x
- **Parti Lideri**: 100x

### Format Kuralları
- 0-999: "150 P."
- 1,000-999,999: "2,15K P." (virgül ondalık ayracı)
- 1M+: "1,50M P."

---

## 🎨 Responsive Tasarım

### Breakpoint'ler
```javascript
mobile: < 768px
tablet: 768px - 1024px
desktop: > 1024px
```

### Mobil-First Yaklaşımı
- Ana odak: **Mobil kullanıcı deneyimi**
- Desktop: Ek özellikler ve geniş layout
- Tablet: Geçiş noktası

### Mobil Özel Özellikler
- 2'li grid içerik kartları
- Sticky gündem bar
- Yatay scrollable stories
- Kompakt header

---

## 🔌 Entegrasyon Noktaları

### Mock → Real Data Geçişi
Her mock data fonksiyonu gerçek API call'a dönüştürülecek:

```javascript
// ŞİMDİ (Mock)
const posts = generateMockPosts(400);

// GELECEK (Real)
const posts = await api.get('/posts?limit=400');
```

### API Endpoint İhtiyaçları
- `GET /posts` - Paylaşımlar
- `GET /posts/:id` - Detay
- `POST /posts` - Yeni paylaşım
- `GET /users/:id` - Kullanıcı profili
- `GET /parties/:id` - Parti detayı
- `GET /agendas` - Gündemler
- `GET /cities/:code` - İl detayları
- `POST /likes` - Beğeni
- `POST /comments` - Yorum

---

## 🗄️ Database Şeması Önerileri

### Users Table
```sql
users (
  user_id INT PRIMARY KEY,
  username VARCHAR(50) UNIQUE,
  full_name VARCHAR(100),
  email VARCHAR(100) UNIQUE,
  user_type ENUM('politician', 'ex_politician', 'media', 'party_member', 'normal'),
  politician_type VARCHAR(50),
  party_id INT,
  city_code CHAR(2),
  district_name VARCHAR(100),
  verification_badge BOOLEAN,
  profile_image VARCHAR(255),
  created_at TIMESTAMP
)
```

### Posts Table
```sql
posts (
  post_id INT PRIMARY KEY,
  user_id INT,
  content_type ENUM('text', 'image', 'video', 'audio'),
  content_text TEXT,
  media_url JSON, -- Array for multiple images
  thumbnail_url VARCHAR(255),
  media_duration INT,
  agenda_tag VARCHAR(200),
  polit_score INT DEFAULT 0,
  view_count INT DEFAULT 0,
  like_count INT DEFAULT 0,
  dislike_count INT DEFAULT 0,
  comment_count INT DEFAULT 0,
  is_featured BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(user_id)
)
```

### Parties Table
```sql
parties (
  party_id INT PRIMARY KEY,
  party_name VARCHAR(100),
  party_short_name VARCHAR(50),
  party_logo VARCHAR(255),
  party_color VARCHAR(7),
  seats INT,
  metropolitan_count INT,
  district_count INT,
  agenda_contribution INT,
  created_at TIMESTAMP
)
```

### Comments Table
```sql
comments (
  comment_id INT PRIMARY KEY,
  post_id INT,
  user_id INT,
  comment_text TEXT,
  like_count INT DEFAULT 0,
  created_at TIMESTAMP,
  FOREIGN KEY (post_id) REFERENCES posts(post_id),
  FOREIGN KEY (user_id) REFERENCES users(user_id)
)
```

### Likes Table
```sql
likes (
  like_id INT PRIMARY KEY,
  post_id INT,
  user_id INT,
  created_at TIMESTAMP,
  UNIQUE KEY (post_id, user_id),
  FOREIGN KEY (post_id) REFERENCES posts(post_id),
  FOREIGN KEY (user_id) REFERENCES users(user_id)
)
```

### Agendas Table
```sql
agendas (
  agenda_id INT PRIMARY KEY,
  agenda_title VARCHAR(200),
  agenda_slug VARCHAR(200) UNIQUE,
  total_polit_score BIGINT DEFAULT 0,
  post_count INT DEFAULT 0,
  created_at TIMESTAMP
)
```

---

## 🔀 Data Flow

### Post Gösterimi
```
generateMockPosts() 
  → User data ile birleştirme
  → Party data ile zenginleştirme
  → Component'e prop olarak geçme
  → PostCardHorizontal render
```

### Polit Puan Hesaplama
```
Etkileşim (View/Like/Comment)
  → Backend API call
  → Polit Puan hesapla (kullanıcı tipine göre)
  → Database güncelle
  → Frontend'e notify
  → UI güncelleme
```

### Kategori Filtreleme
```
Tüm Postlar (generateMockPosts)
  → getCategoryPosts() ile filtreleme
  → Kullanıcı tipine göre ayırma
  → Polit Puana göre sıralama (DESC)
  → İlk 30'u göster
```

---

## 🎭 Component Prop Patterns

### PostCardHorizontal Props
```javascript
{
  post: {
    post_id, user_id, content_type, content_text,
    media_url, agenda_tag, polit_score,
    view_count, like_count, comment_count,
    created_at,
    user: { full_name, user_type, politician_type, party_id, city_code, party: {...} }
  },
  showCity: boolean,
  showPartyLogo: boolean,
  fullWidth: boolean
}
```

### PartyDetailPopup Props
```javascript
{
  party: {
    party_id, party_name, party_short_name, party_logo,
    seats, mp_count, metropolitan_count, district_count,
    agenda_contribution
  },
  position: { x, y },
  onClose: function
}
```

---

## 🎯 Kritik Tasarım Kararları

### 1. Sabit Yükseklikler (Hizalama için)
- **İsim alanı**: 36px (2 satır × 18px)
- **Açıklama alanı**: 42px (2 satır × 21px)
- **Görsel alanı**: 150px
- **Reklam alanı**: 35px
- **Gündem etiketi**: 40px (2 satır)

### 2. Mobil vs Desktop
- **Mobil**: 2'li grid, dikey scroll
- **Desktop**: Horizontal scroll, 5 kart göster

### 3. Reklam Alanları
- **Gündem Bar**: 4. pozisyon (YusufBANK)
- **İçerik Kartı**: Açıklama ve gündem arası (35px)

### 4. Popup Sistemi
- **Backdrop**: Tıklanınca kapat
- **Bayrak Hover**: Parti detayları
- **Plaka Hover**: İl detayları
- **Timeout**: 150ms (geçiş için)

---

## 🔧 Teknik Detaylar

### CSS Framework
- **Tailwind CSS**: Utility-first styling
- **Custom Classes**: card-hover, scrollbar-hide

### Icon Library
- **Lucide React**: Modern, tree-shakeable icons

### Routing
- **React Router v6**: Client-side routing

### Form Management
- **React Hook Form**: Gelecekte entegre edilecek

### State Management
- **Şu an**: useState (lokal)
- **Gelecek**: Context API + React Query

---

## 📊 Performans Optimizasyonu

### Lazy Loading
- Route-based code splitting (gelecek)
- Image lazy loading

### Memoization
- React.memo için aday componentler:
  - PostCardHorizontal
  - PartyDetailPopup
  - CityDetailPopup

### Virtualization
- Uzun listeler için react-window (gelecek)

---

## 🚀 Build & Deployment

### Development
```bash
npm install
npm run dev
```

### Production Build
```bash
npm run build
```

### Deployment
- **Platform**: Vercel
- **Auto Deploy**: main branch'e push
- **Environment**: Node.js 18+

---

## 🔐 Güvenlik Notları

### Gelecek İhtiyaçlar
- JWT authentication
- CSRF protection
- Rate limiting
- XSS prevention (React otomatik)
- SQL injection prevention (ORM kullanımı)

---

## 📝 Geliştirme Notları

### Mock Data Kullanımı
- Tüm mock data fonksiyonları `/src/mock/` klasöründe
- `generateMockPosts(count)`: İstenen sayıda post üretir
- `getCategoryPosts(category)`: Kategori bazlı filtreleme

### Image Path Yönetimi
- Gerçek dosyalar: `/assets/` altında
- Placeholder: `https://picsum.photos/` (geliştirme)
- Avatar: `https://i.pravatar.cc/` (geliştirme)

### Tailwind Custom Config
```javascript
// tailwind.config.js
colors: {
  'primary-blue': '#009FD6',
  'primary-green': '#10b981',
  'accent-mustard': '#f59e0b',
  'primary-red': '#ef4444'
}
```

---

## 🎯 Sonraki Adımlar (Canlıya Geçiş)

### Faz 1: Backend API
1. RESTful API geliştirme
2. Database kurulumu
3. Authentication sistemi
4. File upload sistemi

### Faz 2: Frontend Entegrasyon
1. Mock data → API call dönüşümü
2. Authentication flow
3. Error handling
4. Loading states

### Faz 3: Real-time Özellikler
1. WebSocket entegrasyonu
2. Bildirimler
3. Canlı güncellemeler

### Faz 4: Optimizasyon
1. SEO iyileştirmeleri
2. Performance monitoring
3. Analytics entegrasyonu

---

**Son Güncelleme**: 2025-11-20
**Versiyon**: 1.0.0-alpha
