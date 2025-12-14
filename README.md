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
- **[ARCHITECTURE.md](ARCHITECTURE.md)** - Sistem mimarisi ve component yapısı
- **[FEATURES.md](FEATURES.md)** - Detaylı özellik açıklamaları
- **[INFRASTRUCTURE.md](INFRASTRUCTURE.md)** - Altyapı ve teknoloji yığını
- **[SCALING_STRATEGY.md](SCALING_STRATEGY.md)** - Ölçeklendirme stratejisi ve yol haritası
- **[BACKEND_ARCHITECTURE.md](BACKEND_ARCHITECTURE.md)** - Backend API mimarisi
- **[DEPLOYMENT.md](DEPLOYMENT.md)** - Deployment rehberi

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

Vercel'e deploy için:

```bash
vercel
```

## 📄 Lisans

Bu proje özel bir projedir.
