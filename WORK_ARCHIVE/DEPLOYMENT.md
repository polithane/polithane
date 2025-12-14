# Vercel Deployment Rehberi

## 🚀 Vercel'e Deploy Etme

### Adım 1: GitHub Repository'ye Push
✅ **Tamamlandı!** Kodlar GitHub'a push edildi.

### Adım 2: Vercel'de Proje Oluşturma

1. [Vercel](https://vercel.com) hesabınıza giriş yapın
2. "Add New Project" butonuna tıklayın
3. GitHub repository'nizi seçin: `ikonuniforma/polithane`
4. Vercel otomatik olarak projeyi algılayacak

### Adım 3: Build Ayarları (Otomatik Algılanır)

Vercel şu ayarları otomatik algılamalı:
- **Framework Preset:** Vite
- **Build Command:** `npm run build`
- **Output Directory:** `dist`
- **Install Command:** `npm install`

### Adım 4: Environment Variables (Opsiyonel)

Şu an için gerekli değil ama ileride backend bağlantısı için ekleyebilirsiniz:
- `VITE_API_URL`
- `VITE_APP_NAME`
- `VITE_APP_SLOGAN`

### Adım 5: Deploy

"Deploy" butonuna tıklayın. Vercel otomatik olarak:
1. Dependencies'leri yükleyecek
2. Projeyi build edecek
3. Production'a deploy edecek

## ✅ Deployment Sonrası

Deployment tamamlandıktan sonra:
- Vercel size bir URL verecek (örn: `polithane.vercel.app`)
- Her GitHub push'unda otomatik deploy yapılacak
- Preview deployment'lar için PR'lar otomatik deploy edilecek

## 🔧 Sorun Giderme

### Build Hatası Alırsanız:
1. Vercel dashboard'da "Logs" sekmesine bakın
2. Hata mesajını kontrol edin
3. Genellikle dependency sorunları olabilir

### Route Sorunları:
- `vercel.json` dosyası SPA routing için yapılandırıldı
- Tüm route'lar `/index.html`'e yönlendirilecek

## 📝 Notlar

- Vercel ücretsiz planında yeterli
- Custom domain ekleyebilirsiniz
- SSL otomatik olarak sağlanır
- CDN otomatik olarak aktif
