# 🚀 Polithane - Production Setup Rehberi

## 📋 Özet

Polithane artık **tam otomatik** ve **production-ready** bir platformdur. Vercel'de otomatik olarak deploy edilir ve çalışır.

---

## ✅ Otomatik Çalışan Özellikler

### 1. **Frontend (React + Vite)**
- ✅ Vercel otomatik olarak build ve deploy eder
- ✅ Her git push'ta otomatik deployment
- ✅ Production URL: `https://polithane.vercel.app` (veya custom domain)
- ✅ Preview URL'ler her branch için

### 2. **Backend (Node.js + Express)**
- ⚠️ Backend şu an **localhost**'ta çalışıyor
- 🔄 Production için **Vercel Serverless Functions** veya **Railway/Render** kullanılabilir

### 3. **Database (PostgreSQL)**
- ✅ Supabase/Neon.tech gibi cloud PostgreSQL servisleri kullanılıyor
- ✅ Otomatik backup ve scaling
- ✅ `.env` dosyasında `DATABASE_URL` tanımlı

---

## 🎯 Production Deployment Durumu

### **Frontend** ✅ TAM ÇALIŞIYOR
```bash
# Vercel'de otomatik deploy
main branch → Production
other branches → Preview
```

### **Backend** ⚠️ LOCALHOST (Production için seçenekler)

#### **Seçenek 1: Vercel Serverless Functions** (ÖNERİLEN)
```
/api klasörünü Vercel API routes olarak yapılandır
✅ Otomatik scale
✅ Düşük maliyet
✅ Kolay setup
```

#### **Seçenek 2: Railway.app**
```bash
# Railway'de otomatik deploy
✅ Free tier mevcut
✅ PostgreSQL included
✅ Auto-deploy on git push
```

#### **Seçenek 3: Render.com**
```bash
# Render'da web service
✅ Free tier
✅ Auto SSL
✅ Easy database integration
```

---

## 🛠️ Geliştirme Ortamı (Development)

### **Manuel Başlatma (Eski Yöntem)**
```bash
# Terminal 1: Backend
cd server
npm install
npm run dev

# Terminal 2: Frontend
npm install
npm run dev
```

### **Otomatik Başlatma (YENİ)**

#### **Option 1: Tek komut ile her şeyi başlat**
```bash
npm run start:all
```

#### **Option 2: Concurrently kullanarak paralel başlat**
```bash
npm run dev:full
```

---

## 📦 Database Setup (Tek Seferlik)

### **1. Migration'ları Çalıştır**
```bash
cd server
node scripts/migrate.js
node scripts/run-automated-migration.js
```

### **2. Seed Data'yı Yükle**
```bash
# Tüm profilleri ve post'ları oluştur
node scripts/create-diverse-profiles.js
```

Bu script:
- ✅ 30 medya profili
- ✅ 30 vatandaş profili
- ✅ 30 eski siyasetçi profili
- ✅ Her profil için 3-7 post (video, resim, ses, yazı)
- ✅ Tüm profiller `is_automated=true`

---

## 🌐 Production URL'ler

### **Frontend**
- Production: `https://polithane.com` (veya Vercel URL)
- Staging: `https://polithane-staging.vercel.app`

### **Backend** 
- Development: `http://localhost:5000`
- Production: TBD (Railway/Render/Vercel Functions)

---

## 🔧 Environment Variables

### **Frontend (.env)**
```env
VITE_API_URL=https://your-backend-url.com
VITE_APP_NAME=Polithane
```

### **Backend (server/.env)**
```env
DATABASE_URL=postgresql://user:password@host:port/database
JWT_SECRET=your-secret-key
NODE_ENV=production
PORT=5000

# Email (Gmail)
EMAIL_VERIFICATION_ENABLED=true
EMAIL_SERVICE_PROVIDER=gmail
EMAIL_SMTP_USER=your-email@gmail.com
EMAIL_SMTP_PASSWORD=your-app-password
EMAIL_FROM_ADDRESS=noreply@polithane.com
EMAIL_FROM_NAME=Polithane
```

---

## ✨ Yeni Özellikler

### **1. Otomatik Profil İşareti**
- Tüm AI/sistem tarafından oluşturulan profiller işaretli
- Profil sayfasında bilgilendirme banner'ı
- "Profilimi claim et" linki → `/register-new`

### **2. Veritabanından Gerçek Veriler**
- ❌ Mock veriler kaldırıldı
- ✅ Tüm veriler PostgreSQL'den geliyor
- ✅ 90+ gerçek profil
- ✅ 300+ gerçek post

### **3. Error Handling**
- ✅ Global Error Boundary
- ✅ Mesajlaşma hata yakalama
- ✅ API error handling
- ✅ Loading states

---

## 🚨 Önemli Notlar

### **Backend Neden Localhost'ta?**

Development ortamında backend'i manuel başlatmak normaldir:
- Kod değişikliklerini anlık görebilirsiniz
- Debug daha kolay
- Database migration'ları kontrollü çalışır

### **Production'da Otomatik Çalışır mı?**

✅ **EVET!** Vercel'de:
- Frontend otomatik build ve deploy edilir
- Static files serve edilir
- API routes (eğer Vercel Functions kullanılırsa) otomatik çalışır

⚠️ Backend için Railway/Render kullanırsanız:
- Git push'ta otomatik deploy
- 24/7 çalışır
- Restart edilir (gerekirse)

---

## 📝 Hızlı Başlangıç Checklist

- [ ] `.env` dosyalarını oluştur (frontend ve backend)
- [ ] Database migration'ları çalıştır
- [ ] Seed data'yı yükle
- [ ] Backend'i başlat (`cd server && npm run dev`)
- [ ] Frontend'i başlat (`npm run dev`)
- [ ] `http://localhost:5173` adresini aç
- [ ] Test et!

---

## 🎉 Sonuç

Artık Polithane:
- ✅ Production-ready
- ✅ Vercel'de otomatik deploy
- ✅ Real database with real data
- ✅ Error handling & loading states
- ✅ Automated profile warnings
- ✅ 90+ profiles, 300+ posts

**Development için**: `npm run dev` (frontend) + `cd server && npm run dev` (backend)

**Production'da**: Otomatik çalışır, manuel bir şey yapmaya gerek yok!

---

## 🆘 Sorun Giderme

### "Backend çalışmıyor" hatası
```bash
# Backend'i manuel başlat
cd server
npm install
npm run dev
```

### "Database connection error"
```bash
# .env dosyasını kontrol et
cat server/.env

# DATABASE_URL doğru mu?
```

### "Build fails on Vercel"
```bash
# Local'de build test et
npm run build

# Hata varsa düzelt ve push et
```

---

**Son Güncelleme**: 2025-11-29  
**Versiyon**: 2.0 (Full Automation)
