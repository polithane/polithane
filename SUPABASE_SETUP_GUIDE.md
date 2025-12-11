# 🚀 Supabase Storage Setup Guide

## Türkçe Karakter Sorunu ve Çözümü

### Problem
- 2024 adet profil resmi local'de duruyor
- Dosya adları Cyrillic karakterlerle encode edilmiş (Ш, Щ, Ъ, Ю, ж, А)
- Veritabanında 2015 kullanıcının avatar_url'si local assets'e işaret ediyor

### Çözüm
Migration script'i hazırlandı! Cyrillic karakterleri otomatik olarak Türkçe'ye çeviriyor:
- Ш → İ
- Щ → Ö
- Ъ → Ü
- Ю → Ş
- ж → Ğ
- А → Ç

---

## 1️⃣ Supabase Project Oluştur

### Adım 1: Supabase'e Kayıt Ol
1. https://supabase.com adresine git
2. "Start your project" tıkla
3. GitHub ile giriş yap (önerilir)

### Adım 2: Yeni Project Oluştur
1. Dashboard'da "New project" tıkla
2. Proje ayarları:
   ```
   Name: polithane
   Database Password: [güçlü bir şifre oluştur ve sakla]
   Region: Frankfurt (Europe) - Türkiye'ye en yakın
   Pricing Plan: Free tier (1GB storage, yeterli!)
   ```
3. "Create new project" tıkla (1-2 dakika sürer)

---

## 2️⃣ Storage Bucket Oluştur

### Adım 1: Storage'a Git
1. Sol menüden "Storage" tıkla
2. "Create a new bucket" tıkla

### Adım 2: Bucket Ayarları
```
Name: polithane-images
Public bucket: ✅ AÇIK (resimlerin herkese açık olması gerekli)
File size limit: 10 MB
Allowed MIME types: image/jpeg, image/png, image/gif
```

### Adım 3: Storage Policies (Opsiyonel)
Public bucket seçtiysen otomatik ayarlanır. Değilse:
1. "Policies" tab'ine git
2. "New policy" tıkla
3. "SELECT" için public access ver:
   ```sql
   CREATE POLICY "Public Access" ON storage.objects
   FOR SELECT USING (bucket_id = 'polithane-images');
   ```

---

## 3️⃣ API Keys'i Al

### Adım 1: Project Settings
1. Sol alt köşede ⚙️ "Project Settings" tıkla
2. "API" sekmesine git

### Adım 2: Keys'i Kopyala
Şu bilgileri kopyala:

```env
Project URL: https://xxxxxxxxxxxxx.supabase.co
anon public key: eyJhbGc... (uzun bir token)
service_role key: eyJhbGc... (uzun bir token - GİZLİ!)
```

⚠️ **ÖNEMLİ:** 
- `anon key` → Frontend'de kullanılabilir (güvenli)
- `service_role key` → Backend'de kullanılır, GİZLİ tutulmalı!

---

## 4️⃣ Environment Variables'ı Güncelle

### Dosya: `server/.env`

```env
# Supabase Storage Configuration
SUPABASE_URL=https://xxxxxxxxxxxxx.supabase.co
SUPABASE_ANON_KEY=eyJhbGc...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc... 
SUPABASE_BUCKET_NAME=polithane-images
```

**XXXXXXXXXXXXX yerine kendi project URL'ini yaz!**

---

## 5️⃣ Migration'ı Çalıştır

### Test Modu (İlk 10 Dosya)
```bash
cd server
node scripts/migrate-to-supabase.js --test
```

Çıktı örneği:
```
🚀 Supabase Image Migration Started
======================================================================
✅ Bucket exists: polithane-images
📸 Found 2024 images
📤 Uploading 10 images...

✅ [1/10] CELALETTШN_ERASLAN.jpg → CELALETTİN_ERASLAN.jpg
✅ [2/10] ABDULLAH_YAЮAR.jpg → ABDULLAH_YAŞAR.jpg
...
📊 Upload Summary: 10 ✅ / 0 ❌
⚠️  Skipping database update (test mode)
```

### Full Migration (Tüm Dosyalar)
Test başarılıysa:
```bash
node scripts/migrate-to-supabase.js
```

Bu işlem:
1. ✅ 2024 dosyayı Supabase'e yükler (~10-15 dakika)
2. ✅ Cyrillic karakterleri Türkçe'ye çevirir
3. ✅ Veritabanındaki 2015 kullanıcının avatar_url'ini günceller
4. ✅ Eski local URL'ler → Yeni Supabase URL'ler

Çıktı:
```
🎉 MIGRATION COMPLETE
======================================================================
⏱️  Duration: 847.23s
📤 Uploaded: 2024 files
❌ Failed: 0 files
📝 Database: 2015 URLs updated
```

---

## 6️⃣ Doğrulama

### Frontend'de Test Et
1. Frontend'i başlat: `npm run dev`
2. Bir profil sayfasını aç
3. Profil fotoğrafının göründüğünü kontrol et

### Supabase Dashboard'da Kontrol
1. Storage → polithane-images → profiles/politicians/
2. 2024 dosya görmelisin
3. Bir dosyaya tıkla, "Copy URL" ile URL'i kopyala
4. Tarayıcıda aç, resim görünmeli

### Veritabanında Kontrol
```bash
cd server
node scripts/check-migration-status.js
```

Beklenen çıktı:
```
📊 Veritabanı Durumu:
Toplam kullanıcı: 2021
Supabase'e taşınmış: 2015  ← BURAYI KONTROL ET!
Hala local assets: 0
Avatar yok: 5
```

---

## 7️⃣ Cleanup (Opsiyonel)

Migration başarılıysa local dosyaları silebilirsin:

```bash
# Dosyaları git'ten kaldır (commit etme!)
echo "public/assets/profiles/politicians/" >> .gitignore
echo "server/public/assets/" >> .gitignore

# Local dosyaları sil (git'te kalsınlar şimdilik)
# rm -rf public/assets/profiles/politicians/*.jpg
```

⚠️ **Önce yedek al!** Migration'dan emin ol, sonra sil.

---

## 💰 Maliyet (Free Tier Limitleri)

Supabase Free Tier:
```
✅ Storage: 1 GB (bizim: ~265 MB) ✅
✅ Bandwidth: 2 GB/ay ✅
✅ Database: 500 MB ✅
✅ API Requests: Sınırsız ✅
```

**Sonuç: TAMAMEN ÜCRETSİZ!** 🎉

---

## 🆘 Sorun Giderme

### Hata: "Invalid API key"
- `.env` dosyasını kontrol et
- `SUPABASE_SERVICE_ROLE_KEY` doğru mu?
- Supabase Dashboard → Settings → API'den tekrar kopyala

### Hata: "Bucket not found"
- Storage → Buckets'ta `polithane-images` var mı?
- Bucket adı `.env`'deki ile aynı mı?

### Hata: "Upload failed: File size limit"
- Bucket settings'ten file size limit'i artır (10MB → 20MB)

### Hata: "Permission denied"
- Bucket "Public" olarak işaretli mi?
- Storage policies kontrol et

### Test Mode'da Başarılı ama Full Migration Fail
- Rate limiting olabilir (50 dosyada 1 saniye bekliyor script)
- İnterneti kontrol et
- Tekrar dene, kaldığı yerden devam eder (upsert: true)

---

## ✅ Migration Checklist

- [ ] Supabase project oluşturuldu
- [ ] Storage bucket oluşturuldu (`polithane-images`)
- [ ] API keys alındı ve `.env`'e eklendi
- [ ] Test mode çalıştırıldı (`--test`)
- [ ] Test başarılı, 10 dosya yüklendi
- [ ] Full migration çalıştırıldı
- [ ] 2024 dosya Supabase'e yüklendi
- [ ] Veritabanı güncellendi (2015 URL)
- [ ] Frontend'de resimler görünüyor
- [ ] Supabase Dashboard'da dosyalar görünüyor

---

## 📞 Yardım

Sorun yaşarsan:
1. `server/scripts/check-migration-status.js` çalıştır
2. Hatayı kopyala
3. Supabase Dashboard → Logs'a bak
4. Script hata mesajlarını oku

**Hazır!** 🚀
