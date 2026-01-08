# POLITHANE - Türkiye Siyasi Sosyal Medya Platformu

**Slogan:** "Özgür, açık, şeffaf siyaset, bağımsız medya!"

## 🎯 Hedef

Türkiye siyasetini demokratikleştiren, şeffaf ve açık algoritmaya sahip bir sosyal medya platformu. **1M - 30M anlık ziyaretçi** kapasitesine sahip, yüksek performanslı bir sistem.

## 🚀 Kurulum

```bash
# Bağımlılıkları yükle
npm install

# Geliştirme sunucusunu başlat
npm run dev

# Production build
npm run build

# Build önizleme
npm run preview
```

## 📚 Dokümantasyon

- **[POLITHANE_MASTER_PLAN.md](POLITHANE_MASTER_PLAN.md)** - **Tek kaynak**: Proje tanımı + yol haritası + çalışma yönergesi

## 🔒 Altyapı Kararı (Sabit)

- **DB/Auth/Storage/Realtime**: Supabase
- **Web hosting**: Vercel (otomatik CDN dahil)
- **E-posta servisi**: Brevo API (transactional email)
- **Kural**: Bu karar sabittir; projeye başka bir veritabanı/hosting sağlayıcısı eklenmez ve migrasyon önerilmez.

## 📦 Teknolojiler

- **Frontend:** React 18 + Vite
- **Styling:** Tailwind CSS
- **Routing:** React Router DOM
- **State Management:** Zustand
- **Icons:** Lucide React
- **Notifications:** React Hot Toast
- **Video Player:** React Player
- **Date Formatting:** date-fns

## 🎨 Renk Paleti

- Primary Blue: `#009fd6`
- Primary Green: `#87b433`
- Accent Mustard: `#D4A017`
- Neutral Light Gray: `#E5E5E5`
- Neutral Anthracite: `#2B2B2B`

## 📁 Proje Yapısı

```
src/
├── components/     # React component'leri
├── pages/          # Sayfa component'leri
├── utils/          # Yardımcı fonksiyonlar
├── mock/           # Mock veriler
└── context/        # React context'ler
```

## 🔧 Özellikler

- ✅ Ana sayfa (kategorilere göre paylaşımlar)
- ✅ Post detay sayfası
- ✅ Profil sayfası
- ✅ Parti detay sayfası
- ✅ Gündem detay sayfası
- ✅ Arama sistemi
- ✅ Mesajlaşma
- ✅ Giriş/Kayıt
- ✅ Admin paneli
- ✅ Polit Puan sistemi
- ✅ Responsive tasarım

## 📝 Geliştirme

Proje şu anda mock data ile çalışmaktadır. Backend entegrasyonu için `src/utils/api.js` dosyasını kullanabilirsiniz.

## 🌐 Deployment

### Vercel Environment Variables (Önemli)

Bu proje Vercel’de **Frontend (Vite)** + **Serverless API (`/api`)** olarak çalışır. Aşağıdaki değişkenler Vercel Project → Settings → Environment Variables kısmına girilmelidir.

#### Frontend (Vite) – Required
- **VITE_SUPABASE_URL**: Supabase project URL (public)
- **VITE_SUPABASE_ANON_KEY**: Supabase anon key (public)

#### Backend (`api/index.js`) – Required
- **SUPABASE_URL**: Supabase project URL
- **SUPABASE_SERVICE_ROLE_KEY**: Supabase service role key (**gizli**, server-only)
- **JWT_SECRET**: JWT imzalama anahtarı (**gizli**)
- **BREVO_API_KEY**: Brevo API anahtarı (**gizli**, transactional email için)
- **MAIL_SENDER_EMAIL**: Gönderici email adresi (örn. `noreply@polithane.com`)
- **MAIL_SENDER_NAME**: Gönderici adı (örn. `Polithane`)

#### Backend – Opsiyonel (ama önerilir)
- **ADMIN_BOOTSTRAP_TOKEN**: ilk admin erişimi + üretimde debug kontrol endpoint’leri için token (**gizli**)
- **PUBLIC_APP_URL**: örn `https://polithane.com` (email linklerinde kullanılır)
- **EMAIL_VERIFICATION_ENABLED**: `true` / `false`

> Not: `SUPABASE_ANON_KEY` backend tarafında da fallback olarak okunabiliyor ama **production’da service role** kullanmalısınız.

### Production “self-check” (Vercel + Supabase kontrolü)

Bu agent Vercel dashboard’una doğrudan erişemediği için, production’dan hızlı kontrol yapmanız için 2 endpoint eklendi (token ile korunur).

#### 1) Vercel env var kontrolü (boolean)
`GET /api/admin/env-check`

#### 2) Supabase tablo/kolon kontrolü
`GET /api/admin/schema-check`

İsteklerde header ekleyin:
- `x-admin-bootstrap-token: <ADMIN_BOOTSTRAP_TOKEN>`

Örnek (terminalde):

```bash
curl -s "https://<SİTENİZ>/api/admin/env-check" -H "x-admin-bootstrap-token: <TOKEN>"
curl -s "https://<SİTENİZ>/api/admin/schema-check" -H "x-admin-bootstrap-token: <TOKEN>"
```

### Supabase Migration (Fast için kritik)

Fast sistemi `posts.is_trending` alanını kullanır. Eski schema kullanıyorsanız eksik olabilir.
Supabase SQL Editor’da şu migration’ı çalıştırın:
- `server/migrations/007_fast_posts_compat.sql`

---

Vercel'e deploy için:

```bash
vercel
```

## 📄 Lisans

Bu proje özel bir projedir.

<!-- deploy-trigger: noop change to re-run Vercel -->
