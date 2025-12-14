# 🚀 Backend Başlatma Talimatları

## ⚠️ ÖNEMLİ: Backend Çalıştırma

Sitenin çalışması için **backend server'ın mutlaka çalışıyor olması gerekir!**

### 1. Backend'i Başlatın

Yeni bir terminal açın ve:

```bash
cd server
npm run dev
```

Çıktı:
```
✓ Server running on http://localhost:5000
✓ Database connected
```

### 2. Backend Çalışıyor mu Kontrol Edin

```bash
curl http://localhost:5000/health
```

Yanıt:
```json
{
  "status": "ok",
  "timestamp": "2024-11-29T00:00:00.000Z",
  "database": "connected"
}
```

### 3. Frontend'i Başlatın

Başka bir terminal'de:

```bash
npm run dev
```

Frontend: `http://localhost:5173`

---

## 🔴 "Failed to fetch" Hatası Alıyorsanız

Bu hata **backend server çalışmıyor** demektir.

### Çözüm:

1. Terminal açın
2. `cd server` 
3. `npm run dev`
4. Sayfayı yenileyin

---

## 📋 Backend Gereksinimleri

### Environment Variables

`server/.env` dosyası olmalı:

```env
DATABASE_URL=postgresql://...
JWT_SECRET=your-secret-key
PORT=5000
```

### Dependencies

```bash
cd server
npm install
```

---

## 🧪 Test Login

Backend çalıştıktan sonra:

```
URL: http://localhost:5173/login-new
Username: burcu_koksal
Password: Polithane2024
```

---

## 🐛 Sorun Giderme

### Backend Başlamıyor

```bash
# Port 5000 kullanımda mı?
lsof -i :5000

# Eğer kullanımdaysa, o process'i öldürün
kill -9 <PID>

# Tekrar başlatın
cd server && npm run dev
```

### Database Bağlanmıyor

```bash
# .env dosyasını kontrol edin
cat server/.env

# DATABASE_URL doğru mu?
```

### Dependencies Eksik

```bash
cd server
npm install
```

---

## ✅ Doğru Çalışma Durumu

İki terminal açık olmalı:

**Terminal 1 - Backend:**
```bash
$ cd server
$ npm run dev
> server@1.0.0 dev
> nodemon index.js

[nodemon] starting `node index.js`
✓ Server running on http://localhost:5000
```

**Terminal 2 - Frontend:**
```bash
$ npm run dev
> polithane@0.0.0 dev
> vite

  VITE v4.x.x  ready in xxx ms

  ➜  Local:   http://localhost:5173/
```

---

## 🎯 Özet Checklist

- [ ] Backend çalışıyor mu? → `curl http://localhost:5000/health`
- [ ] Frontend çalışıyor mu? → `http://localhost:5173`
- [ ] .env dosyası var mı? → `server/.env`
- [ ] Database bağlantısı var mı? → Health check'te "database: connected"

**Hepsi ✅ ise site tam çalışır durumda!**
