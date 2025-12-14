# 🌐 Cloud Storage Migration Planı

## 🎯 Hedef
Git'teki 264MB fotoğrafı **Cloudflare R2 (CDN)** taşıyıp database'de sadece URL saklamak.

---

## 📊 Mevcut Durum

### Dosyalar:
```
Politicians: 2024 foto (264MB)
Party Logos: 2 logo (720KB)
Git Size: 258MB (!!!)
```

### Database:
```
Avatar URL olan: 2016 kullanıcı
Toplam parti: 45
Format: /assets/profiles/politicians/NAME.jpg
```

---

## 🚀 Cloudflare R2 Setup

### 1. R2 Bucket Oluştur
```bash
# Cloudflare Dashboard → R2 → Create Bucket
Bucket name: polithane-media
Region: Auto (closest to users)
Public access: Enabled (CDN için)
```

### 2. R2 API Keys
```bash
# Dashboard → R2 → Manage R2 API Tokens
Account ID: xxxxx
Access Key ID: xxxxx
Secret Access Key: xxxxx
```

### 3. Custom Domain (opsiyonel)
```
media.polithane.com → R2 Bucket
```

---

## 🔧 Migration Adımları

### Adım 1: AWS SDK Kur
```bash
cd server
npm install @aws-sdk/client-s3 @aws-sdk/lib-storage
```

### Adım 2: Upload Script
```javascript
// server/scripts/upload-to-r2.js
- Tüm politician fotoğraflarını yükle
- Tüm parti logolarını yükle
- Progress göster
```

### Adım 3: Database Update
```sql
UPDATE users 
SET avatar_url = REPLACE(
  avatar_url, 
  '/assets/profiles/politicians/',
  'https://pub-xxx.r2.dev/profiles/politicians/'
)
WHERE avatar_url LIKE '/assets/profiles/politicians/%';
```

### Adım 4: Backend Güncelle
```javascript
// server/index.js
- Statik dosya servisi kaldır
- R2 URL'leri kullan
```

### Adım 5: Git Temizle
```bash
git rm -r public/assets/profiles/politicians/
git rm -r server/public/assets/
echo "public/assets/profiles/" >> .gitignore
echo "server/public/assets/" >> .gitignore
git commit -m "Remove binary files, migrated to R2"
```

---

## 💰 Maliyet

### Cloudflare R2 Free Tier:
```
Storage: 10 GB/ay (Bizim: 0.3GB ✅)
Class A: 1M requests/ay ✅
Class B: 10M requests/ay ✅
Egress: UNLIMITED & FREE ✅✅
```

**Sonuç: TAMAMEN ÜCRETSİZ** 🎉

---

## ⚡ Performans

### Önce (Git):
```
❌ Vercel deploy: 3-5 dakika
❌ Her deploy'da 264MB upload
❌ CDN yok (yavaş)
```

### Sonra (R2):
```
✅ Vercel deploy: 30 saniye
✅ Deploy'da binary yok
✅ Global CDN (çok hızlı)
✅ Cache-friendly
```

---

## 🔄 Alternatif Çözümler

### 1. Supabase Storage
```
✅ PostgreSQL entegrasyonu
⚠️ 1GB limit (yeterli)
⚠️ Ayrı servis
```

### 2. imgbb.com (Hızlı Test)
```
✅ Ücretsiz API
✅ Hızlı upload
⚠️ Güvenilirlik?
```

### 3. GitHub LFS
```
⚠️ Ücretli (50GB = $5/ay)
❌ Git'te kalır
```

---

## ✅ Önerilen: Cloudflare R2

**Sebepleri:**
1. ✅ **Tamamen ücretsiz** (egress dahil)
2. ✅ **Global CDN** (hızlı)
3. ✅ **S3-compatible** (kolay migration)
4. ✅ **Ölçeklenebilir** (10GB yeterli)
5. ✅ **Güvenilir** (Cloudflare altyapısı)

---

## 🛠️ Şimdi Ne Yapmalı?

### Seçenek A: Manuel Setup (Önerilen)
```
1. Sen Cloudflare hesabı aç
2. R2 bucket oluştur
3. API keys'i bana ver
4. Ben migration script çalıştırırım
```

### Seçenek B: Otomatik Script
```
1. Ben script yazarım
2. Sen çalıştırırsın
3. Database'i güncellerim
```

### Seçenek C: Test Ortamı
```
1. İlk 100 fotoğraf test
2. Çalışırsa hepsini taşı
```

---

## 📝 TODO List

- [ ] Cloudflare R2 hesap aç
- [ ] Bucket oluştur: `polithane-media`
- [ ] API keys al
- [ ] Upload script yaz
- [ ] Test: 10 fotoğraf
- [ ] Full migration: 2024 fotoğraf
- [ ] Database güncelle
- [ ] Frontend test et
- [ ] Git'ten sil
- [ ] Deploy & verify

**Tahmini Süre: 1-2 saat** ⏱️

---

## 🎯 Sonuç

```diff
- Git: 258MB
+ Git: 5MB

- Deploy: 5 dakika
+ Deploy: 30 saniye

- CDN: Yok
+ CDN: Global Cloudflare

- Maliyet: Git storage
+ Maliyet: $0/ay
```

**ROI: ∞ (Ücretsiz ama çok daha hızlı!)** 🚀
