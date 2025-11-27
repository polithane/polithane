# 🗄️ Veritabanı Kurulum Rehberi

## ✅ TAMAMLANANLAR

- ✅ Backend API kuruldu (Express + Neon PostgreSQL)
- ✅ Database schema hazır (migration script)
- ✅ Seed script hazır (mock data)
- ✅ Dependencies kuruldu

## 🎯 ŞİMDİ YAPILACAKLAR

### 1. Veritabanı Bağlantı Bilgilerini Girin

`/workspace/server/.env` dosyasını açın ve `DATABASE_URL` satırını doldurun:

```env
DATABASE_URL=postgresql://username:password@ep-xxx-xxx.us-east-2.aws.neon.tech/neondb?sslmode=require
```

**Neon Dashboard'dan DATABASE_URL nasıl alınır:**
1. https://console.neon.tech adresine gidin
2. Projenizi seçin
3. "Dashboard" → "Connection Details" bölümüne bakın
4. "Connection string" kopyalayın
5. `.env` dosyasına yapıştırın

### 2. Database Schema'sını Oluşturun

```bash
cd server
npm run migrate
```

Bu komut:
- ✅ Tüm tabloları oluşturur (users, posts, parties, comments, vb.)
- ✅ Indexleri ekler
- ✅ Trigger'ları kurar
- ✅ View'ları oluşturur

### 3. Mock Dataları Yükleyin

```bash
npm run seed
```

Bu komut:
- ✅ 15 parti ekler
- ✅ 600+ milletvekili ekler
- ✅ 40+ medya kullanıcısı ekler
- ✅ 100 örnek post oluşturur
- ✅ Gündemler ekler

### 4. Backend'i Başlatın

```bash
npm run dev
```

Backend şu adreste çalışacak: http://localhost:5000

### 5. Frontend'i API'ye Bağlayın

Frontend zaten hazır! Sadece `.env` dosyasını oluşturun:

```bash
cd ..
cp .env.example .env
```

`.env` dosyasını açın ve API URL'yi kontrol edin:

```env
VITE_API_URL=http://localhost:5000/api
```

### 6. Frontend'i Başlatın

```bash
npm run dev
```

Frontend şu adreste çalışacak: http://localhost:5173

## 🧪 Test Etme

### Health Check
```bash
curl http://localhost:5000/health
```

### Database Bağlantı Testi
```bash
curl http://localhost:5000/api/test-db
```

### Postları Getir
```bash
curl http://localhost:5000/api/posts
```

### Partileri Getir
```bash
curl http://localhost:5000/api/parties
```

## 📊 Database Yapısı

### Tablolar
- `users` - Kullanıcılar (milletvekilleri, medya, vatandaş)
- `parties` - Partiler (AK Parti, CHP, MHP, vb.)
- `posts` - Paylaşımlar (text, image, video, audio)
- `comments` - Yorumlar
- `likes` - Beğeniler
- `follows` - Takip ilişkileri
- `agendas` - Gündemler
- `notifications` - Bildirimler
- `polit_score_history` - Polit Puan geçmişi

### View'lar
- `trending_posts` - Trend postlar (otomatik hesaplama)

### Indexler
- Username, email, user_type (hızlı kullanıcı sorguları)
- Post created_at, polit_score (sıralı listeleme)
- Full-text search (Türkçe arama)

## 🔧 Sorun Giderme

### "Connection refused" Hatası
- DATABASE_URL doğru mu kontrol edin
- Neon projeniz aktif mi kontrol edin
- Internet bağlantınız var mı kontrol edin

### "Table already exists" Hatası
- Normal bir durum, tablolar zaten var
- `npm run seed` ile devam edebilirsiniz

### "Cannot find module" Hatası
- `cd server && npm install` çalıştırın
- Node.js versiyonu 18+ olmalı

## 🚀 Production Deployment

Production'a geçerken:
1. `.env` dosyasına production DATABASE_URL'yi yazın
2. `NODE_ENV=production` olarak değiştirin
3. `npm start` ile başlatın (dev yerine)
4. Vercel/Render/Railway gibi platformlara deploy edin

## 📝 Notlar

- Mock data geçicidir, dilediğiniz zaman silebilirsiniz
- Veritabanı Neon üzerinde çalışıyor (serverless PostgreSQL)
- CORS zaten yapılandırılmış (localhost:5173)
- Rate limiting aktif (60 saniyede 100 istek)

---

**Hazır mısınız? Başlayalım! 🎉**

1. `.env` dosyasına DATABASE_URL yazın
2. `cd server && npm run setup` komutunu çalıştırın
3. `npm run dev` ile backend'i başlatın
4. Yeni bir terminalde `npm run dev` ile frontend'i başlatın
5. http://localhost:5173 adresine gidin

**Site artık canlı veritabanı ile çalışıyor! 🚀**
