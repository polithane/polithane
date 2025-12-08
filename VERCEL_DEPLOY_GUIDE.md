# 🚀 Vercel Deploy Rehberi - polithane.com

## ❌ MEVCUT PROBLEM
```
404: DEPLOYMENT_NOT_FOUND
Code: DEPLOYMENT_NOT_FOUND
```

**Sebep:** Domain DNS kayıtları doğru ama Vercel'de deployment yok/silinmiş.

---

## ✅ ÇÖZÜM: Vercel'e Yeniden Deploy

### Yöntem 1: Vercel Dashboard (Önerilen - En Kolay)

#### 1. Vercel'e Giriş Yapın
```
https://vercel.com/login
```

#### 2. Add New Project
- Dashboard'da **"Add New... > Project"** tıklayın
- **Import Git Repository** seçin
- GitHub hesabınızı bağlayın (gerekirse)
- Repository seçin: **`polithane/polithane`**

#### 3. Configure Project
```
Project Name: polithane
Framework Preset: Vite
Root Directory: ./
Build Command: npm run build
Output Directory: dist
Install Command: npm install
```

#### 4. Environment Variables (Önemli!)
**Settings > Environment Variables** bölümüne ekleyin:

```env
VITE_API_URL=https://api.polithane.com/api
VITE_APP_NAME=Polithane
VITE_APP_SLOGAN=Özgür, açık, şeffaf siyaset, bağımsız medya!
```

> ⚠️ **NOT:** Backend API URL'inizi buraya eklemelisiniz!

#### 5. Deploy
- **"Deploy"** butonuna tıklayın
- İlk deployment 2-3 dakika sürer
- Deployment tamamlandığında: `https://polithane.vercel.app`

#### 6. Custom Domain Ekle
Deployment başarılı olduktan sonra:

1. Project Settings > **Domains**
2. **Add Domain** tıklayın
3. `polithane.com` yazın
4. Add tıklayın
5. DNS kayıtları zaten doğru (domain firma yaptı) ✅
6. Vercel otomatik doğrular ve SSL sertifikası ekler

**İşlem tamam! 🎉** 
- `https://polithane.com` artık çalışır
- `https://www.polithane.com` da çalışır
- SSL otomatik aktif

---

### Yöntem 2: Vercel CLI (Terminal ile)

#### 1. Vercel CLI Yükle
```bash
npm i -g vercel
```

#### 2. Vercel'e Login
```bash
vercel login
```

#### 3. İlk Deploy (Production)
```bash
cd /workspace
vercel --prod
```

Sorulacak sorular:
```
? Set up and deploy "~/workspace"? [Y/n] y
? Which scope? [Kendi hesabınızı seçin]
? Link to existing project? [N/y] n
? What's your project's name? polithane
? In which directory is your code located? ./
? Want to override the settings? [y/N] y
? Build Command: npm run build
? Output Directory: dist
? Development Command: npm run dev
```

#### 4. Domain Bağla
```bash
vercel domains add polithane.com --yes
```

---

## 🔧 Backend API Deploy (Ayrı Yapılmalı!)

Backend'i ayrı deploy etmelisiniz (Vercel serverless veya başka platform):

### Option A: Vercel Serverless Functions
- `server/` klasörünü Vercel serverless'e çevirme gerekli
- Daha fazla konfigürasyon gerektirir

### Option B: Railway / Render (Önerilen)
Backend için ayrı bir platform kullanın:

**Railway:**
```bash
# Railway CLI
railway login
railway init
railway up
```

**Render:**
- https://render.com
- Web Service oluşturun
- GitHub repo bağlayın
- Build command: `cd server && npm install`
- Start command: `cd server && node index.js`

---

## 📊 Deploy Sonrası Checklist

### Frontend (Vercel)
- [ ] `https://polithane.com` çalışıyor
- [ ] `https://www.polithane.com` çalışıyor
- [ ] SSL aktif (🔒 yeşil kilit)
- [ ] Tüm sayfalar yükleniyor
- [ ] Environment variables doğru

### Backend (Ayrı Deploy)
- [ ] API endpoint'ler çalışıyor
- [ ] Database bağlantısı OK
- [ ] CORS ayarları doğru (`polithane.com` allowed)
- [ ] Frontend'de `VITE_API_URL` güncel

---

## 🆘 Sorun Giderme

### Hata: "Build Failed"
```bash
# Local'de test edin:
npm run build

# Hata varsa düzeltin ve tekrar push edin
git add .
git commit -m "Fix build issues"
git push
```

### Hata: "Domain Already Exists"
- Eski Vercel projesini silin
- Domain'i remove edin
- Yeni projede tekrar ekleyin

### Hata: "API calls failing"
- `VITE_API_URL` environment variable'ı kontrol edin
- Backend CORS ayarlarına `polithane.com` ekleyin
- Backend API'nin çalıştığını test edin

---

## 🎯 ÖNERİLEN DEPLOYMENT YAPISI

```
Frontend (Vercel)
├── Domain: polithane.com
├── SSL: Auto (Let's Encrypt)
└── Build: Vite static files

Backend (Railway/Render/VPS)
├── Domain: api.polithane.com
├── Port: 5000
├── Database: Neon PostgreSQL ✅ (already configured)
└── Environment: Production

Database (Neon)
├── Already configured ✅
└── Connection pooling: Active
```

---

## 📝 SONUÇ

**Şu an yapmanız gereken:**

1. ✅ Vercel Dashboard'a gir
2. ✅ New Project oluştur
3. ✅ GitHub repo bağla (`polithane/polithane`)
4. ✅ Deploy et
5. ✅ `polithane.com` domain'ini ekle
6. ✅ Backend'i ayrı deploy et (Railway/Render)
7. ✅ Frontend ENV'de backend URL'i güncelle

**Deployment süresi:** 5-10 dakika
**Sonuç:** `https://polithane.com` 🎉

---

## 🔗 Yararlı Linkler

- [Vercel Dashboard](https://vercel.com/dashboard)
- [Vercel Docs](https://vercel.com/docs)
- [Railway](https://railway.app)
- [Render](https://render.com)
- [Neon Console](https://console.neon.tech) ✅ Already using
