# 🚨 UPLOAD STORAGE SORUNU

## ❌ Problem

**Railway ephemeral filesystem kullanıyor!**

```javascript
// Backend'de:
multer.diskStorage({
  destination: '../../public/uploads'  // ❌ GEÇİCİ!
})

// Kullanıcı profil fotoğrafı yükler:
POST /api/users/profile + avatar
→ Kaydedilir: /public/uploads/12345.jpg

// Railway restart (her deploy, günde 1 kez):
→ /uploads/ klasörü TEMİZLENİR
→ Fotoğraf GİTTİ! ❌
```

---

## 🔍 Railway Filesystem

### Ephemeral (Geçici):
```
✅ /app/ (kod)
✅ /tmp/ (geçici)
❌ /uploads/ (her restart → SİLİNİR!)
```

### Persistent (Kalıcı):
```
💰 Railway Volumes: $5/ay
→ /data/ klasörü kalıcı olur
```

---

## ✅ ÇÖZÜMLER

### 1. ⭐ **External Storage (Önerilen)**
```
Cloudflare R2 (Ücretsiz 10GB)
AWS S3 ($0.023/GB)
Supabase Storage (1GB ücretsiz)

Artıları:
✅ Kalıcı
✅ CDN (hızlı)
✅ Ölçeklenebilir
✅ Railway restart'tan etkilenmez
```

### 2. **Railway Volumes**
```
Railway → Settings → Volumes
Mount Path: /data
Size: 1GB = $5/ay

Backend değişiklik:
destination: '/data/uploads'

Artıları:
✅ Kalıcı
✅ Ekstra servis yok

Eksileri:
❌ $5/ay (her GB için)
❌ CDN yok (yavaş)
❌ Tek region (Railway datacenter)
```

### 3. **Database BYTEA (KÖTÜ PRATİK!)**
```sql
CREATE TABLE user_photos (
  user_id UUID,
  photo BYTEA -- ❌ 5MB fotoğraf
);

Eksileri:
❌ Database şişer
❌ Yavaş queries
❌ Backup sorunlu
❌ Pahalı
```

---

## 💡 **BENİM ÖNERİM**

### Kısa Vadede (Şimdi):
```javascript
// Railway Volumes kullan ($5/ay)

// server/utils/upload.js
const storage = multer.diskStorage({
  destination: process.env.NODE_ENV === 'production' 
    ? '/data/uploads'  // Railway Volume
    : '../../public/uploads'  // Local dev
});

// Railway'de:
1. Volume oluştur: /data (1GB)
2. Environment: NODE_ENV=production
3. Deploy → Kalıcı storage! ✅
```

### Uzun Vadede (Ölçeklenme):
```javascript
// Cloudflare R2 kullan (Ücretsiz!)

// server/utils/upload.js
import { S3Client } from '@aws-sdk/client-s3';
import multerS3 from 'multer-s3';

const s3 = new S3Client({
  endpoint: process.env.R2_ENDPOINT,
  credentials: { ... }
});

const storage = multerS3({
  s3: s3,
  bucket: 'polithane-media',
  key: (req, file, cb) => {
    cb(null, `uploads/${Date.now()}-${file.originalname}`);
  }
});
```

---

## 🎯 **SONUÇ**

**Şu an upload sistemi VAR ama ÇALIŞMIYOR!**

```
✅ Kod hazır
✅ Endpoint'ler çalışıyor
❌ Dosyalar kaybolacak (Railway restart)
```

**Mecburen external storage gerekli:**
- Railway Volumes ($5/ay) → Hızlı çözüm
- Cloudflare R2 ($0/ay) → Profesyonel çözüm

---

## 📝 **Hemen Yapılacak**

### Seçenek 1: Railway Volume (5 dk)
```bash
1. Railway Dashboard → Settings → Volumes
2. Create Volume: 
   - Name: polithane-uploads
   - Mount: /data
   - Size: 1GB ($5/ay)
3. Deploy → Çalışır! ✅
```

### Seçenek 2: Cloudflare R2 (30 dk)
```bash
1. Cloudflare hesap aç
2. R2 bucket oluştur
3. npm install @aws-sdk/client-s3 multer-s3
4. Backend'i güncelle
5. Test et ✅
```

---

## ⚠️ **UYARI**

**Şu an sisteme yeni üye kayıt olup profil fotoğrafı yüklerse:**
```
1. Fotoğraf Railway'e kaydedilir ✅
2. Birkaç saat/gün sonra Railway restart
3. Fotoğraf GİTTİ ❌
4. Kullanıcı → "Benim profil resmim nerede?" 😢
```

**Acil çözülmeli!** 🚨
