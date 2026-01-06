## Polithane FFmpeg Media Worker (MVP)

Bu servis, kullanıcıların yüklediği videoları **tek bir standarda** çevirir:

- **Hedef video**: 720×1280 (9:16)
- **Kırpma yok**: `contain + pad` (boşluklar siyah)
- **Yan dönüklük düzeltme**: rotation metadata -> piksele uygulanır (output rotate=0)
- **Çıktı formatı**: MP4 (H.264 + AAC) + `faststart` (daha hızlı açılış)
- **Kapak**: JPG thumbnail üretir

### 1) DB / Supabase tarafı

Supabase SQL Editor’da şu migration’ı çalıştır:

- `server/migrations/009_media_processing_jobs.sql`

Bu migration şunları ekler:
- `posts.media_status`, `posts.media_original_urls`, `posts.media_processed_at`, `posts.media_processing_error`
- `media_jobs` job kuyruğu tablosu

### 2) API enqueue (otomatik)

Frontend video yükleyip `/api/posts` çağırdığında, backend (Vercel `api/index.js`) video post’ları için otomatik `media_jobs` kaydı oluşturur.

### 3) Worker’ı çalıştırma

#### Docker ile (önerilen)

`server/worker/Dockerfile` içinde FFmpeg kurulu gelir.

Gerekli env:
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- Opsiyonel:
  - `MEDIA_WORKER_POLL_MS` (varsayılan 4000)
  - `MEDIA_WORKER_MAX_ATTEMPTS` (varsayılan 4)

Çalıştırma örneği (kendi deploy ortamına göre uyarlayacaksın):

```bash
docker build -f server/worker/Dockerfile -t polithane-media-worker .
docker run --rm \
  -e SUPABASE_URL="..." \
  -e SUPABASE_SERVICE_ROLE_KEY="..." \
  -e MEDIA_WORKER_POLL_MS="4000" \
  polithane-media-worker
```

#### Node ile (FFmpeg host’ta kuruluysa)

```bash
cd server
SUPABASE_URL="..." SUPABASE_SERVICE_ROLE_KEY="..." npm run worker:video
```

### 4) Beklenen davranış

- Video post ilk oluşturulduğunda: `media_status=processing`
- Worker bitirince:
  - `media_urls[0]` -> işlenmiş MP4 URL
  - `thumbnail_url` -> yeni kapak
  - `media_status=ready`

