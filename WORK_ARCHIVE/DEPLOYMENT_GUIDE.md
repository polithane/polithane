# 🚀 Deployment Rehberi

## ✅ HAZIR OLANLAR:

### 1. Database & Storage
- ✅ Supabase PostgreSQL: `eldoyqgzxgubkyohvquq.supabase.co`
- ✅ 2015 gerçek profil
- ✅ 15 parti
- ✅ 2024 resim Supabase Storage'da

### 2. Frontend
- ✅ Build başarılı (`dist/` folder)
- ✅ Avatar component Supabase URL kullanıyor
- ✅ Default avatar: Logo (`/ikon.png`)
- ✅ Production .env hazır

### 3. Backend
- ⚠️ Local'de çalışıyor (`localhost:5000`)
- ✅ Supabase DB'ye bağlı
- ⚠️ Deploy edilmesi gerekiyor

---

## 📋 DEPLOYMENT ADIMLARI:

### A. FRONTEND (Vercel)

Zaten Vercel'de deploy edilmiş! Güncelle:

```bash
# 1. Git commit
git add .
git commit -m "🚀 Production ready: Supabase integration, real avatars, 2015 profiles"

# 2. Git push
git push origin main

# 3. Vercel otomatik deploy edecek!
```

**Vercel Environment Variables:**
```
VITE_API_URL=https://[backend-url]/api
VITE_APP_NAME=Polithane.
VITE_APP_SLOGAN=Özgür, açık, şeffaf siyaset, bağımsız medya!
```

---

### B. BACKEND (Railway - Önerilir)

#### Neden Railway?
- ✅ Ücretsiz başlangıç ($5 kredi)
- ✅ PostgreSQL built-in
- ✅ Otomatik SSL
- ✅ Kolay deploy

#### Adımlar:

**1. Railway Hesabı Aç**
```
https://railway.app
- GitHub ile giriş yap
```

**2. New Project → Deploy from GitHub**
```
- Repository: polithane
- Root Directory: /server
- Build Command: npm install
- Start Command: npm start
```

**3. Environment Variables Ekle**
```bash
# Railway Dashboard → Variables:
DATABASE_URL=postgresql://postgres:Polit21314151*@db.eldoyqgzxgubkyohvquq.supabase.co:5432/postgres
SUPABASE_URL=https://eldoyqgzxgubkyohvquq.supabase.co
SUPABASE_SERVICE_ROLE_KEY=sb_secret_Z0MJzEHIIHAG9hJb5S8CNg_imQGhd98
SUPABASE_BUCKET_NAME=avatars
NODE_ENV=production
PORT=5000
JWT_SECRET=polithane-super-secret-jwt-key-2025
```

**4. Deploy!**
```
- Railway otomatik deploy edecek
- URL: https://xxx.railway.app
```

**5. Vercel'de Backend URL'i Güncelle**
```
Vercel → Environment Variables → VITE_API_URL
https://xxx.railway.app/api
```

---

### C. Alternatif: Vercel Serverless Functions

Eğer Railway kullanmak istemezsen:

**1. `/api` klasörünü Vercel API routes'a çevir**
```javascript
// api/users/index.js
export default async function handler(req, res) {
  // Backend kodunu buraya taşı
}
```

**2. Avantajlar:**
- ✅ Tek deployment
- ✅ Otomatik scaling
- ✅ Ücretsiz (Hobby plan)

**3. Dezavantajlar:**
- ⚠️ Serverless (cold start)
- ⚠️ 10 sn timeout
- ⚠️ WebSocket yok

---

## 🎯 ŞUAN NE YAPMALI?

### Seçenek 1: Railway (Önerilir)
```bash
1. Railway hesabı aç
2. Backend'i deploy et
3. URL'i kopyala
4. Vercel'de VITE_API_URL güncelle
5. Frontend'i yeniden deploy et
```

### Seçenek 2: Şimdilik Frontend Deploy
```bash
1. git push yap
2. Vercel otomatik deploy eder
3. Backend'i sonra deploy edersin
4. (Mock data fallback devrede kalır)
```

---

## 📊 PRODUCTION STATUS:

```
Frontend: ✅ Build hazır
Backend: ⚠️ Local (deploy gerekli)
Database: ✅ Supabase
Storage: ✅ Supabase
Avatars: ✅ 2024 gerçek resim
Profiles: ✅ 2015 kullanıcı
Parties: ✅ 15 parti
```

---

## 🆘 YARDIM:

**Railway Deploy:** https://docs.railway.app/deploy/deployments  
**Vercel Env Vars:** https://vercel.com/docs/environment-variables  
**Supabase Docs:** https://supabase.com/docs
