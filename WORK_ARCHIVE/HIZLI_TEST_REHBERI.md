# 🚀 Hızlı Test Rehberi - Polithane

## ✅ SİTE CANLI!

**Frontend:** https://polithane.vercel.app
**Backend:** https://polithane-production.up.railway.app

---

## 🎯 HIZLI TEST (1 DAKİKA)

### 1. Kayıt Ol (Yeni Hesap)

**URL:** https://polithane.vercel.app/register-new

```
Email: test@test.com (herhangi bir email)
Şifre: test12345678 (en az 8 karakter)
Ad Soyad: Test Kullanıcı
```

**NOT:** Email doğrulama kapalı, direkt giriş yapabilirsin! ✅

### 2. Giriş Yap

**URL:** https://polithane.vercel.app/login-new

```
Email: test@test.com
Şifre: test12345678
```

veya mevcut hesaplardan biri:

```
Username: burcu_koksal
Password: Polithane2024
```

### 3. Site Kullan!

✅ Ana sayfada 2,015 profil göreceksin
✅ Post'lar görünecek (henüz post yok, sen ilkini oluştur!)
✅ Profilleri ziyaret et
✅ 15 siyasi parti bilgileri

---

## 🧪 API TEST (opsiyonel)

### Sağlık Kontrolü
```bash
curl https://polithane-production.up.railway.app/health
```

### Kayıt Test
```bash
curl -X POST https://polithane-production.up.railway.app/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@test.com",
    "password": "test12345678",
    "full_name": "Test User"
  }'
```

### Giriş Test
```bash
curl -X POST https://polithane-production.up.railway.app/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@test.com",
    "password": "test12345678"
  }'
```

### Post Listesi
```bash
curl https://polithane-production.up.railway.app/api/posts
```

### Kullanıcı Listesi
```bash
curl https://polithane-production.up.railway.app/api/users
```

### Parti Listesi
```bash
curl https://polithane-production.up.railway.app/api/parties
```

---

## 🎯 TEST SENARYOSu

**Adım 1:** Kayıt ol (herhangi bir email)
**Adım 2:** Giriş yap
**Adım 3:** Profilleri incele (2,015 gerçek CHP profili)
**Adım 4:** Yeni post oluştur
**Adım 5:** Like/Comment yap
**Adım 6:** Profil güncelle

---

## ⚙️ BACKEND DEPLOY (Railway)

Backend zaten Railway'de çalışıyor:
- URL: https://polithane-production.up.railway.app
- Database: Supabase PostgreSQL
- Storage: Supabase Storage

---

## 🐛 SORUN GİDERME

### Problem: "Email zaten kayıtlı"
**Çözüm:** Başka bir email kullan (test2@test.com, test3@test.com, vb.)

### Problem: API çalışmıyor
**Çözüm:** Railway backend'i kontrol et
```bash
curl https://polithane-production.up.railway.app/health
```

### Problem: Avatar'lar görünmüyor
**Çözüm:** Supabase Storage public olarak ayarlı olmalı

---

## ✅ HAZIR!

Site tamamen çalışır durumda:
- ✅ Backend: Railway
- ✅ Frontend: Vercel
- ✅ Database: Supabase
- ✅ Storage: Supabase
- ✅ 2,015 profil
- ✅ 2,024 fotoğraf
- ✅ Email doğrulama: Kapalı (test için)

**Hemen test et:** https://polithane.vercel.app/register-new 🚀
