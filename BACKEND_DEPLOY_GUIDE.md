# 🚀 Backend Deployment Rehberi

Backend'i production'a deploy etmek için 3 kolay seçenek:

---

## ✅ Seçenek 1: Railway (En Kolay - Önerilen)

### 1. Railway'e Kaydolun
```
https://railway.app
```

### 2. GitHub ile Login
- "Login with GitHub" tıklayın
- Yetkilendirin

### 3. New Project
- "New Project" tıklayın
- "Deploy from GitHub repo" seçin
- `polithane/polithane` repository'sini seçin

### 4. Service Configuration
```
Root Directory: /
Build Command: cd server && npm install
Start Command: cd server && node index.js
```

### 5. Environment Variables Ekleyin
```
NODE_ENV=production
PORT=5000
DATABASE_URL=postgresql://neondb_owner:npg_F9zYkx1BtmKX@ep-crimson-grass-advw0sjv-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require
JWT_SECRET=polithane-production-secret-2025
FRONTEND_URL=https://polithane.com
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX_REQUESTS=200
```

### 6. Deploy!
- "Deploy" tıklayın
- 2-3 dakika içinde hazır!

### 7. Custom Domain (Opsiyonel)
- Settings > Domains
- `api.polithane.com` ekleyin
- DNS A record: Railway'in verdiği IP'ye

**Sonuç:** 
```
✅ Backend API: https://polithane-backend.up.railway.app
✅ Veya: https://api.polithane.com (custom domain)
```

---

## ✅ Seçenek 2: Render

### 1. Render'a Giriş
```
https://render.com
```

### 2. New Web Service
- Dashboard > "New +" > "Web Service"
- GitHub hesabınızı bağlayın
- `polithane/polithane` seçin

### 3. Configuration
```yaml
Name: polithane-backend
Runtime: Node
Branch: main
Root Directory: server
Build Command: npm install
Start Command: node index.js
```

### 4. Environment Variables
Aynı değişkenler Railway'deki gibi.

### 5. Deploy
- "Create Web Service" tıklayın
- İlk deploy 5-10 dakika sürer

**Sonuç:**
```
✅ Backend API: https://polithane-backend.onrender.com
```

---

## ✅ Seçenek 3: Vercel Serverless (Gelişmiş)

Backend'i serverless fonksiyonlara dönüştürmek gerekir.

### 1. api/ Klasörü Oluştur
```bash
mkdir -p api
```

### 2. Her route'u ayrı fonksiyon yap
```javascript
// api/auth.js
import authRouter from '../server/routes/auth.js';
export default authRouter;
```

Bu seçenek daha fazla refactoring gerektirir.

---

## 📋 Deploy Sonrası Checklist

### Backend
- [ ] Deploy başarılı
- [ ] Health check çalışıyor: `/health`
- [ ] Database bağlantısı OK
- [ ] Environment variables doğru
- [ ] CORS ayarları güncel

### Frontend (Vercel)
- [ ] `VITE_API_URL` güncelle (Vercel dashboard)
- [ ] Environment Variables > Production
- [ ] `VITE_API_URL=https://api.polithane.com/api`
- [ ] Redeploy tetikle

### Test
```bash
# Health check
curl https://api.polithane.com/health

# Database test
curl https://api.polithane.com/api/test-db

# Login test
curl -X POST https://api.polithane.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"burcu_koksal","password":"Polithane2024"}'
```

---

## 🔒 Production Güvenlik

Backend deploy edildikten sonra:

1. **JWT Secret değiştir**
   - Railway/Render dashboard'da
   - Güçlü bir secret kullan

2. **Rate Limiting ayarla**
   - Environment variables'da ayarlı

3. **CORS güncel**
   - `polithane.com` artık allowed ✅

4. **Database Connection Pooling**
   - Neon otomatik yapıyor ✅

---

## 🌐 Domain Setup

### api.polithane.com için:

#### Railway:
1. Railway dashboard > Settings > Domains
2. Custom domain ekle: `api.polithane.com`
3. DNS'e A record ekle (Railway'in verdiği IP)

#### Render:
1. Dashboard > Settings > Custom Domain
2. `api.polithane.com` ekle
3. CNAME record: `polithane-backend.onrender.com`

Domain firmanızda:
```
Type: CNAME
Name: api
Value: [Railway/Render URL]
```

---

## 📊 Monitoring

### Railway
- Dashboard'da real-time logs
- Metrics: CPU, Memory, Network
- Otomatik restart on failure

### Render
- Dashboard > Logs
- Metrics sekmes
- Health check monitoring

---

## 💰 Pricing

### Railway
- **Free tier:** $5 credit/month
- Yeterli küçük projeler için
- Daha fazla: $0.000463/GB-s

### Render
- **Free tier:** 750 saat/month
- Yeterli! (24/7 çalıştırabilirsiniz)
- Sleep after inactivity (opsiyonel kapatılabilir)

---

## 🚀 Hızlı Başlangıç (Railway CLI)

```bash
# Railway CLI yükle
npm i -g @railway/cli

# Login
railway login

# Initialize
cd /workspace
railway init

# Link to project
railway link

# Deploy
railway up

# Environment variables ekle
railway variables set NODE_ENV=production
railway variables set DATABASE_URL=postgresql://...

# Logs
railway logs
```

---

## ✅ Önerilen: Railway

**Neden Railway?**
- ✅ En kolay setup
- ✅ GitHub auto-deploy
- ✅ Hızlı deployment
- ✅ Güçlü free tier
- ✅ Custom domain kolay
- ✅ Real-time logs
- ✅ Auto-scaling

**Deployment süresi:** 5 dakika
**Maintenance:** Sıfır (otomatik)

---

## 📝 Son Adımlar

1. ✅ Railway'de backend deploy et
2. ✅ `api.polithane.com` domain ekle
3. ✅ Vercel'de `VITE_API_URL` güncelle
4. ✅ Frontend redeploy et
5. ✅ Test et: https://polithane.com

**Bitirdik!** 🎉
