## Polithane — Proje Tanımı, Yol Haritası ve Çalışma Yönergesi (Tek Kaynak)

**Belge amacı**: Bu dosya, Polithane projesinin “tek kaynak/tek plan” dokümanıdır. İleride sohbetimiz kesilse bile, **ne yaptığımızı, neden yaptığımızı ve sıradaki adımlarımızı** buradan takip edeceğiz.

**Son güncelleme**: 2025-12-21  
**Durum**: Prod: Vercel / DB+Auth+Storage: Supabase / Mail: SMTP (mail.polithane.com)

---

## 1) Ürün Tanımı (North Star)

Polithane; **sadece siyasi içerik** üreten, **mobil öncelikli (%95)**, etkileşimleri **bilimsel/ölçülebilir** bir yöntemle puanlayan ve akışı bu puana göre sıralayan ileri seviye bir sosyal medya platformudur.

Platformun kalbi:
- **Polit**: Kullanıcıların attığı tüm paylaşımlar (metin, resim, kısa video, ses, hikaye).
- **PolitPuan**: Polit’lerin etkileşimlerinden üretilen puan. **Kullanıcı tipi ve bağlama göre ağırlıklandırılır**.
- **Şeffaflık**: PolitPuan’a tıklandığında, puanın hangi etkileşimlerden ve hangi ağırlıklarla oluştuğu **açıkça gösterilir**.

---

## 2) Hedef Kitle, Roller ve Yetkiler

Polithane siyasi bir platform olduğu için kullanıcı tipleri “etki ağırlığı” taşır.

### 2.1 Kullanıcı tipleri (çekirdek)
- **Ziyaretçi (üye değil)**: Sadece okur/izler. Etkileşimi *sınırlı* ama **okuma puana düşük katkı sağlar**.
- **Üye (doğrulanmamış)**: Okur, beğenir, yorumlar, paylaşır, polit atar, mesajlaşır.
- **Üye (doğrulanmış)**: Etkileşimleri daha güçlü ağırlık alır.
- **Parti Üyesi**: Parti kimliği ile etkileşimleri ağırlık alır (aynı parti / rakip parti etkisi).
- **Siyasetçi**: Etkileşimleri (özellikle okuma/beğeni/yorum) daha yüksek etki üretir.
- **Milletvekili (MV)**: Etkileşimleri en yüksek etki sınıflarındandır.
- **Medya mensubu / kurum**: Etkileşimleri yüksek etki sınıfındadır.
- **Eski siyasetçi**: Etkileşimleri deneyim ağırlığıyla yüksek etki sınıfındadır.
- **Admin**: Yönetim panelinden tüm sistem ayarları ve moderasyon.

### 2.2 Doğrulama & Profil Sahipliği (erken dönem modeli)
Erken dönemde, kamuya açık siyasi/medya içeriklerini şeffaf şekilde platforma taşımak için iki katmanlı bir yaklaşım kullanılır:

**A) Otomatik oluşturulan profiller (seeded profiles)**
- Ulaşabildiğimiz siyasetçi ve medya mensupları adına **profil oluşturabiliriz**.
- Bu profillerin paylaşımları; sosyal medya, haber siteleri veya kişinin kendi sitesindeki **kamuya açık** kaynaklardan alınarak **otomatik** yayınlanabilir.
- Bu profiller kullanıcı tarafından yönetilmiyorsa profil sayfasında şu ibare görünür:
  - **“Bu üyelik sitemiz tarafından otomatik olarak oluşturulmuştur ve paylaşımlar yapay zeka tarafından yapılmaktadır.”**

**B) Profil sahipliğini alma (claim)**
- Erken dönemde “Üye Ol” akışında iki seçenek vardır:
  - **Yeni Üye Ol**
  - **Profil Sahipliğini Al**
- Bir kişi profilin kendisine ait olduğunu düşünüyorsa “Profil Sahipliğini Al” ile başvurur; inceleme sonrası profil sahipliği devredilir ve otomatiklik ibaresi kaldırılır.
- Yeterli üye sayısına ulaştığımızda bu iki seçenek kaldırılır ve yalnızca **standart üyelik** akışı kalır.

**KVKK / şeffaflık ilkesi**
- Sadece **kamuya açık** kaynaklardan içerik alınır.
- Her otomatik taşımada kullanıcıya açık bildirim yapılır (profil düzeyi + paylaşım düzeyi).
- Gerektiğinde içerik kaldırma/itiraz mekanizması işletilir.

### 2.3 Paylaşım kaynak şeffaflığı (attribution)
Eğer bir kişi adına paylaşılan Polit dış kaynaktan otomatik alınmışsa, Polit’in en altında şu ibare görünür:
- **“Bu paylaşım …… adresinden alınmış olup otomatik olarak paylaşılmıştır.”**

Not: Bu ibare, hem kullanıcı güveni hem de KVKK uyumu için zorunludur.

---

## 3) İçerik (Polit) Türleri ve Ürün Deneyimi

Polithane; klasik “tweet/foto” formatından daha geniş bir “kısa içerik” odağına evrilmiştir:

### 3.1 Polit içerik türleri
- **Fast (24 saat)**: Kısa, dikey tüketim. **Bugün uygulandı**. Teknik olarak `posts.is_trending = true` içerikleridir ve yalnızca **takip edilenler + kendin** görünür.
- **Kısa video**: 1–2 dakika (hedef).
- **Resim**: 1–5+ çoklu resim ızgara düzeni.
- **Ses kaydı**: Kısa konuşma/yorum.
- **Metin**: Politik değerlendirme, açıklama, duyuru.

### 3.2 Temel kullanıcı akışları (MVP)
- **Keşfet/Akış**: PolitPuan’a göre sıralı akış (kategori kırılımlarıyla).
- **Detay**: Polit içeriği + etkileşimler + PolitPuan şeffaf dökümü.
- **Etkileşim**: Okuma (view), beğeni, yorum, paylaşım.
- **Profil**: Kullanıcı kimliği (ünvan/parti/şehir) + içerikler + istatistik.
- **Mesajlaşma**: 1:1 konuşmalar.
- **Arama**: Kullanıcı, gündem, polit arama.

---

## 4) PolitPuan Sistemi (Şeffaf, Denetlenebilir, Geliştirilebilir)

### 4.1 Bugünkü durum (repodaki gerçek kaynaklar)
- PolitPuan ağırlıkları ve hesap adımları: `src/utils/politScore.js`
- Şeffaflık arayüzü (modal): `src/components/common/PolitScoreDetailModal.jsx`

Not: PolitPuan hesaplaması **nihai olarak server-side canonical** olmalıdır. Frontend tarafı yalnızca “gösterim/breakdown” sunar.

### 4.2 Tasarım prensipleri
- **Ağırlıklandırma**: Aynı etkileşim, etkileşimi yapanın tipine göre farklı puan üretir.
- **Bağlam**: Aynı parti / rakip parti gibi bağlamlar puanı etkileyebilir.
- **Şeffaflık**: Puanın kalem kalem dökümü gösterilir.
- **Suistimal dayanıklılığı**: Bot/spam/çift hesap gibi davranışlar için korumalar gerekir.

### 4.3 Güncellenecek yer (PolitPuan ayarları)
PolitPuan kuralları değişirse:
- **Plan güncelle**: Bu dosyada `## 4) PolitPuan Sistemi` altında **“4.4 PolitPuan Konfigürasyon Özeti”** bölümünü güncelle.
- **Kod güncelle**: `src/utils/politScore.js` (ve ileride server-side hesaplama) güncelle.
- **Admin panel**: “Algorithm Settings / PolitPuan Settings” ekranı üzerinden yönetilebilir hale getir.

### 4.4 PolitPuan Konfigürasyon Özeti (tek bakış)
**Kaynak**: `src/utils/politScore.js`  
Bu bölüm, teknik ekip ve ürün ekibinin “neye sadık kalıyoruz?” kontrol listesidir.

- **Aksiyon tipleri**: view / like / comment / share
- **Kullanıcı tipleri**: visitor, unverified_member, verified_member, party_member, politician, mp, media
- **Bağlam**: same_party / rival_party ayrımları
- **Bonus**: “Geçmiş paylaşım bonusu” (şu an mock; gerçekte son paylaşımlara bağlı olmalı)

---

## 5) Akış Sıralama (Ranking) ve Kategoriler

### 5.1 Sıralama kuralı (çekirdek)
- Varsayılan akış: **PolitPuan (DESC)** temel sıralama.
- Zaman faktörü: “yeni içerik” için kontrollü bir bonus/azalma (time decay) eklenebilir.
- Kategori filtreleri: `Vekiller`, `Teşkilat`, `Medya`, `Deneyimli Siyasetçiler`, `Vatandaş` vb.

### 5.2 Şeffaflık kuralı
Ranking mekanizması “kara kutu” olmayacak; en azından:
- **PolitPuan dökümü** (hangi etkileşim, hangi ağırlık) görünür olacak,
- Admin tarafında algoritma parametreleri versiyonlanacak (değişiklik geçmişi).

---

## 6) Admin Yönetim Paneli (Güçlü ve Modüler)

Admin panel Polithane’nin üretim gücüdür. Minimum modüller:
- **Genel ayarlar**: site adı, modlar, bakım, feature flags
- **Tasarım ayarları**: tema, renkler, mobil öncelikli layout ayarları
- **SEO ayarları**: meta, sitemap, robots, sosyal paylaşım kartları
- **Üyelik & yetki**: roller, doğrulama, ban/suspension, güvenlik
- **PolitPuan/Algoritma**: ağırlıklar, eşikler, anti-spam kuralları, versiyonlama
- **Moderasyon**: polit moderasyonu, yorum moderasyonu, raporlar, itiraz akışı
- **Mesajlaşma yönetimi**: abuse raporları, içerik inceleme (gerekli yasal sınırlar içinde)
- **İstatistik/Analitik**: DAU/MAU, içerik üretimi, etkileşim, trend gündemler
- **Reklam alanları**: yerleşimler, kampanyalar, sponsorlu içerik yönetimi
- **Pazarlama**: duyurular, e-posta kampanyaları (SMTP)
- **Sistem sağlığı**: hata oranı, performans, log/audit, storage tüketimi

---

## 7) Altyapı ve Teknoloji Yığını (Bugün “tek gerçek”)

### 7.1 Bugünkü kesin karar (SCOPE-INFRA-01)
- **DB/Auth/Storage/Realtime**: Supabase
- **Web hosting**: Vercel
- **Harici e-posta**: SMTP (mail.polithane.com)
- Başka bir veritabanı/hosting sağlayıcısı **kullanılmıyor** ve bu karar **sabit** (migrasyon önerme/ekleme).

### 7.2 Repodaki bazı dokümanlar
Repo içinde `INFRASTRUCTURE.md` ve `SCALING_STRATEGY.md` gibi dosyalarda Supabase dışı seçenekler (Hetzner/Redis/Elasticsearch vb.) anlatılıyor. Bunlar:
- **Bugünün üretim kararı değil**, “ileride gerekirse” seçenek havuzu olarak değerlendirilecektir.
- Bugünkü yürüyüşümüz **Supabase + Vercel ekseninde** ilerler.

---

## 8) 10M Üye / 1M Günlük Aktif Kullanıcı için Hazırlık (Supabase Odaklı)

### 8.1 Veri modeli ve performans
- Kritik indeksler: `posts(polit_score desc)`, `posts(created_at desc)`, `posts(user_id, created_at desc)`, `comments(post_id, created_at)`
- Büyük tablolar için: partitioning (zaman bazlı), arşivleme, “hot/cold” ayrımı
- Okuma akışı için: cursor pagination (offset yerine)

### 8.2 Güvenlik (Supabase RLS)
- RLS ile erişim kontrolü (misafir okuma, üye yazma, admin erişimi)
- Medya bucket policy’leri (public/secure ayrımı)
- Audit log: admin işlemleri + algoritma değişiklikleri kaydı

### 8.3 Medya ve mobil performans
- Supabase Storage + CDN davranışı
- Mobil için: küçük thumbnail’lar, lazy-load, video önbellekleme stratejisi

---

## 9) Güvenlik, Moderasyon ve Suistimal Önleme

Siyasi platformlarda bu bölüm “opsiyonel” değil, çekirdek ihtiyaçtır:
- **Rate limit** (özellikle login, post atma, yorum, beğeni)
- **Spam/bot tespiti** (tekrarlı davranış, anomali)
- **Raporlama**: kullanıcı raporları + admin inceleme kuyruğu
- **Hassas içerik**: içerik politikaları, şikayet/itiraz akışı
- **Hesap güvenliği**: şifre politikaları, (ileride) 2FA

---

## 10) Yol Haritası (Sadece Bu Plana Sadık Kalarak İlerleyeceğiz)

Bu yol haritası “yakın vadede hız” odaklıdır ve iki aşamalıdır: Web’i toparla → Mobil’i çıkar.

### 10.1 Web MVP (Hedef: 1–2 gün) — SCOPE-WEB-MVP-01
Amaç: Ürün “kullanılabilir” olsun; temel akışlar sorunsuz çalışsın; PolitPuan şeffaflığı görünür olsun.

**Kabul kriterleri (minimum):**
- Auth (login/register/me) çalışır
- Akış Supabase’den gerçek veriyle akar (mock minimuma iner)
- Polit oluşturma (metin + en az 1 medya türü) çalışır
- View/Like/Comment etkileşimleri PolitPuan’ı artırır
- PolitPuan tıklayınca breakdown görünür ve tutarlıdır
- Mesajlaşma çalışır (temel)
- Admin panelden:
  - kullanıcı listesi/işlemleri,
  - post moderasyonu,
  - temel site ayarları erişilebilir

### 10.2 Mobil MVP (Hedef: sonraki 1–2 gün) — SCOPE-MOBILE-MVP-01
Amaç: iOS/Android için “çalışan ilk sürüm” (temel ekranlar + Supabase entegrasyonu).

**Teknik yön**:
- React Native (tercihen Expo) + Supabase

**Kabul kriterleri (minimum):**
- Login/Register
- Akış (PolitPuan sıralı)
- Polit detay + PolitPuan breakdown
- Polit oluşturma (metin + en az 1 medya türü)
- Profil görüntüleme
- Mesajlaşma (temel liste + konuşma)

### 10.3 Stabilizasyon ve Üretime Hazırlık (1–2 hafta) — SCOPE-STABILIZE-01
- Loglama/izleme (en azından hata yakalama)
- Performans: mobil akışta liste sanallaştırma (virtual list)
- Moderasyon ve raporlama akışının güçlendirilmesi
- PolitPuan’ın server-side canonical hale getirilmesi (frontend yalnız gösterir)

---

## 11) Çalışma Yönergesi (Program Disiplini)

### 11.1 “Tek kaynak” kuralı
- Bu dosya (`POLITHANE_MASTER_PLAN.md`) **tek kaynak**.
- Tamamlananlar için: `IMPLEMENTATION_STATUS.md`
- Kurulum/ortam için: Vercel ortam değişkenleri + Supabase proje ayarları (örnekler için `.env.example`).
- PolitPuan teknik mantık için: `src/utils/politScore.js`

### 11.2 Plan güncelleme nasıl yapılır?
Bir değişiklik yaptığımız an, şu bölümler güncellenir:
- **Ürün kapsamı/MVP** değiştiyse: `## 10) Yol Haritası`
- **PolitPuan ağırlıkları** değiştiyse: `## 4) PolitPuan Sistemi` + ilgili kod
- **Altyapı kararı** değiştiyse: `## 7) Altyapı` (SCOPE-INFRA-01 maddesi)
- **Admin panel modülleri** değiştiyse: `## 6) Admin Panel`

### 11.3 Değişiklik kaydı (Decision Log)
Bu tablo, “neden böyle yaptık?” sorusunun cevabıdır.

| ID | Tarih | Karar | Gerekçe | Etkilenen Bölüm |
|---|---|---|---|---|
| DEC-001 | 2025-12-14 | Altyapı Supabase + Vercel olarak sabitlendi | Operasyonel sadeleşme ve hızlı ölçekleme | 7, 8 |
| DEC-002 | 2025-12-17 | SendGrid tamamen kaldırıldı, tek e-posta kanalı SMTP oldu | Kontrol + maliyet + vendor bağımsızlığı | 7, 12, 14 |
| DEC-003 | 2025-12-18 | PolitFast adı “Fast” olarak standartlaştırıldı | Ürün dili sadeleşmesi | 3, 12 |
| DEC-004 | 2025-12-18 | iOS Safari uyumluluğu için Vite legacy plugin etkinleştirildi | Mobil açılış sorunlarını çözmek | 12, 13 |
| DEC-005 | 2025-12-18 | Supabase avatar URL’leri için `/api/avatar` proxy eklendi | URL encoding/400 spam + stabil UX | 12, 14 |

---

## 12) Projenin Güncel Durumu (2025-12-21) — “Bugün ne var?”

Bu bölüm **yeni gelen agent’ın** projeyi tek okumada devralması için “gerçek durum” özetidir.

### 12.1 Frontend (React 19 + Vite)
- **Framework**: React 19 + Vite (SPA)
- **UI**: Tailwind CSS + lucide-react ikonları + react-hot-toast
- **Routing**: react-router-dom v7
- **State**: Zustand + React Context (Auth/Theme/Notifications)
- **Mobil öncelik**: Desktop + mobile responsive, mobilde sabit alt aksiyon barı

**Başlıca ekranlar ve akışlar (aktif):**
- **Home**: Hit seçkisi + kategoriler + gündem barı + Fast barı
- **Polit/ Fast At**: Aynı sayfa altyapısı (`/polit-at` ve `/fast-at`), Fast modunda kırmızı tema + çapraz paylaşım seçeneği
- **Polit Detay**: View/Like/Comment/Share; yorumlarda “kalp” boş/dolu durumu
- **Mesajlar**: Konuşmalar + mesajlar; client-side polling ile güncel kalır
- **Admin**: Gündem yönetimi + kullanıcı/post/yorum işlemleri

### 12.2 Backend (Vercel Serverless “Monolith API”)
Bu projede production backend **tek dosyadır**:
- **`api/index.js`**: Vercel Serverless Function (Express benzeri handler + kendi router/dispatcher’ı)

**Önemli not**: `server/` klasörü ağırlıklı olarak *script/migration/yerel server denemeleri* içerir; Vercel’de çalışan production API **`api/index.js`**’dir.

### 12.3 Fast (PolitFast → Fast)
- **DB modeli**: `posts.is_trending = true` (Fast)
- **Görünürlük**: `/api/fast` yalnızca **takip ettiklerin + kendin** döndürür (herkese açık değil)
- **Süre**: Son 24 saat
- **Profil avatar halkası**: Fast varsa mavi kesik halka; profile tıklayınca Fast viewer’a gider

### 12.4 Hit / Keşfet
- **Home “Hit Paylaşımlar”**: PolitPuan + etkileşim + yenilik + çeşitlilik gibi faktörlerle seçilen bir seçki
- **Ayrı sayfa**: `/hit` feed sayfası

### 12.5 Gündemler (Agendas)
- **Admin’den yönetilir**: Sıralama/aktiflik/trend bilgileri admin modülünden gelir
- **Feed**: Gündem sayfaları ve “gündem dışı” sayfalar infinite-scroll mantığıyla akar

### 12.6 Etkileşimler ve Bildirimler
- **View**: Polit detayına girince `view_count` best-effort artar (server tarafı `getPostById` içinde)
- **Like**: `POST /api/posts/:id/like` (toggle)
- **Share**: `POST /api/posts/:id/share` → `share_count` artar + post sahibine bildirim/e-posta
- **Comment**: `POST /api/posts/:id/comments` → post sahibine bildirim/e-posta (self-notify yok)
- **Notifications**: `/api/notifications` ile çekilir, “okundu” durumları vardır

### 12.7 E-posta sistemi (SMTP)
- **Kural**: SendGrid yok. Her e-posta (üyelik, şifre sıfırlama, hesap silme, bildirimler, mesaj vb.) **SMTP** üzerinden gider.
- **SMTP kaynağı**: `mail.polithane.com` (587)

### 12.8 Safari / eski tarayıcı uyumluluğu
- **`@vitejs/plugin-legacy`** aktiftir (`vite.config.js`, hedef: `safari >= 12`)
- Amaç: iOS Safari’de “site açılmıyor” problemlerini önlemek

---

## 13) Repo Haritası (Yeni Agent için “nerede ne var?”)

### 13.1 En kritik dosyalar
- **API (production)**: `api/index.js`
- **Frontend giriş**: `src/main.jsx`, `src/App.jsx`
- **Frontend API client**: `src/utils/api.js`
- **PolitPuan**: `src/utils/politScore.js`
- **Avatar URL normalizasyonu**: `src/utils/avatarUrl.js`
- **Aksiyon barı (sol desktop + alt mobile)**: `src/components/layout/ActionBar.jsx`
- **Gündem barı**: `src/components/home/AgendaBar.jsx`
- **Fast barı**: `src/components/home/StoriesBar.jsx` (mode: `fast`)
- **Polit/Fast atma**: `src/pages/CreatePolitPage.jsx`
- **Fast sayfaları**: `src/pages/FastPage.jsx`, `src/pages/FastViewerPage.jsx`
- **Mesajlar**: `src/pages/MessagesPage.jsx`

### 13.2 Asset’ler
- **Logo**: `public/logo.png` (ana logo)
- **Polit/Fast içerik tür ikonları**: `public/icons/*.(png|svg)` (yerel dosyalar, hızlı yükleme için tercih edilir)

---

## 14) Ortam Değişkenleri (Vercel) — Tek doğru kaynak

Bu bölüm **yanlış API/env kullanımını** önlemek içindir. Değerler burada yazılmaz; sadece **isim + amaç + nerede kullanıldığı** yazılır.

### 14.1 Senin Vercel’de aktif ENV listesi (as-is)
> Değerler gizli (Vercel’de “•••”).

- **APP_URL** (Production, Preview)
- **PUBLIC_APP_URL** (Production, Preview)
- **ADMIN_BOOTSTRAP_TOKEN** (Production, Preview)
- **INITIAL_ADMIN_PASSWORD** (All Environments)
- **SMTP_FROM** (All Environments)
- **SMTP_PASS** (All Environments)
- **SMTP_USER** (All Environments)
- **SMTP_PORT** (All Environments)
- **SMTP_HOST** (All Environments)
- **VITE_SUPABASE_ANON_KEY** (All Environments)
- **VITE_SUPABASE_URL** (All Environments)
- **SUPABASE_SERVICE_ROLE_KEY** (All Environments)
- **JWT_SECRET** (All Environments)
- **SUPABASE_URL** (All Environments)
- **DATABASE_URL** (All Environments)

### 14.2 Hangi ENV nerede kullanılır?

#### 14.2.1 Frontend (Vite build-time)
- **`VITE_SUPABASE_URL`**: `@supabase/supabase-js` client için public URL
- **`VITE_SUPABASE_ANON_KEY`**: public anon key (frontend’de kullanılabilir)

> Not: `VITE_` ile başlayan değişkenler **sadece build-time** ve **client tarafına gömülür**. Gizli anahtar koymayın.

#### 14.2.2 Backend (Vercel `/api`, runtime)
`api/index.js` tarafında kullanılanlar:
- **`SUPABASE_URL`**: Supabase Project URL (server)
- **`SUPABASE_SERVICE_ROLE_KEY`**: server-only (Storage upload, admin işlemleri, RLS bypass gereken yerler)
- **`JWT_SECRET`**: app JWT’lerini imzalama/verify
- **`SMTP_HOST` / `SMTP_PORT` / `SMTP_USER` / `SMTP_PASS` / `SMTP_FROM`**: Nodemailer SMTP
- **`PUBLIC_APP_URL`** veya **`APP_URL`**: e-posta linklerinde “site base url” (örn: şifre sıfırlama linki)
- **`ADMIN_BOOTSTRAP_TOKEN`**: production debug/bootstrapping endpoint güvenliği (header ile)

#### 14.2.3 Script/ops (repo `server/` klasörü)
- **`DATABASE_URL`**: `server/scripts/*` içinde (Postgres bağlantısı). Vercel runtime API’nin çekirdeği değildir.
- **`INITIAL_ADMIN_PASSWORD`**: `server/scripts/setup-admin-rbac-and-initial-admin.js` için (ops script).

### 14.3 Admin bootstrap / env-check / schema-check güvenliği
Bu endpoint’ler iki şekilde yetkilidir:
- **Admin JWT ile** (login olmuş admin kullanıcı), veya
- Header ile: **`x-admin-bootstrap-token: <ADMIN_BOOTSTRAP_TOKEN>`**

Endpoint’ler:
- `GET /api/admin/env-check` (secret sızdırmaz, sadece boolean döndürür)
- `GET /api/admin/schema-check` (tablo/sütun var mı kontrol)
- `POST /api/admin/bootstrap` (ilk admin erişim kurtarma; rate-limit’li)

---

## 15) API Haritası (Production Monolith) — `api/index.js`

Bu liste, yeni agent’ın “olmayan endpoint’i kullanmaya çalışmasını” engeller. (Dispatcher’da görünen gerçek endpoint’ler.)

### 15.1 Public / feed
- `GET /api/health`
- `GET /api/posts` (liste, query’lerle filtrelenir)
- `POST /api/posts` (create)
- `GET /api/posts/:id` (detay + **view_count best-effort artar**)
- `PUT /api/posts/:id`, `DELETE /api/posts/:id`
- `GET /api/agendas`
- `GET /api/parties`, `GET /api/parties/:id`
- `GET /api/search` (header live search)

### 15.2 Interactions
- `POST /api/posts/:id/like`
- `POST /api/posts/:id/share`
- `GET /api/posts/:id/comments`
- `POST /api/posts/:id/comments`
- `POST /api/posts/:id/report`
- `POST /api/comments/:id/like`
- `PUT /api/comments/:id`
- `POST /api/comments/:id/report`

### 15.3 Fast
- `GET /api/fast`
- `GET /api/fast/:key` (username veya id)

### 15.4 Users
- `GET /api/users` (search/list)
- `GET /api/users/:id` (profil)
- `GET /api/users/:id/posts|likes|comments|activity|followers|following|follow-stats`
- `POST /api/users/:id/follow` (toggle)
- `PUT /api/users/me`, `PUT /api/users/username`
- `DELETE /api/users/me`, `POST /api/users/me/reactivate`
- `POST /api/users/me/delete-request`, `GET /api/users/delete-confirm`
- Blocks: `GET/POST /api/users/blocks`, `DELETE /api/users/blocks/:targetId`
- Avatar upload: `POST /api/users/me/avatar`

### 15.5 Auth
- `POST /api/auth/login`
- `POST /api/auth/register`
- `GET /api/auth/me`
- `POST /api/auth/forgot-password`
- `POST /api/auth/reset-password`
- `GET /api/auth/verify-email`
- `POST /api/auth/resend-verification`
- `POST /api/auth/change-password`
- `GET /api/auth/check-availability`

### 15.6 Notifications
- `GET /api/notifications`
- `POST /api/notifications/read-all`
- `POST /api/notifications/:id` (read)
- `DELETE /api/notifications/:id`

### 15.7 Messages
- `GET /api/messages/conversations`
- `GET /api/messages/contacts`
- `GET /api/messages/search`
- `POST /api/messages/send`
- `GET /api/messages/:otherUserId`
- `DELETE /api/messages/:messageId`
- `POST /api/messages/requests/:otherId/reject`

### 15.8 Avatar proxy
- `GET /api/avatar?u=<encoded_supabase_public_url>`

### 15.9 Admin (token/admin JWT gerekli)
- `POST /api/admin/bootstrap`
- `GET /api/admin/env-check`
- `GET /api/admin/schema-check`
- `GET /api/admin/stats`
- `GET /api/admin/users` (+ duplicates/dedupe)
- `PUT/DELETE /api/admin/users/:userId`
- `GET /api/admin/posts`, `DELETE /api/admin/posts/:postId`
- `GET/POST /api/admin/agendas`, `PUT/DELETE /api/admin/agendas/:agendaId`
- `GET/POST /api/admin/parties`, `PUT/DELETE /api/admin/parties/:partyId`, `GET /api/admin/parties/:pid/hierarchy`
- `POST /api/admin/notifications`
- `GET /api/admin/comments/pending`, `POST /api/admin/comments/:commentId/approve`

---

## 16) Supabase Şema / Migration Notları (kritik)

### 16.1 Fast ve modern post alanları
Fast için minimum:
- `posts.is_trending boolean default false`

Uygulamanın güncel minimum kolon seti `GET /api/admin/schema-check` içinde tanımlıdır. Eksik çıkan alanlar için repo içinde migration:
- `server/migrations/007_fast_posts_compat.sql`

### 16.2 Likes tablosu (comment like)
- Yorum kalbi için `likes.comment_id` alanı kullanılır. Yoksa API “fallback” çalıştırmaya çalışır ama en doğrusu şemayı tamamlamaktır.

---

## 17) Kalan / Takip Edilecek İşler (Yeni sohbet öncesi “nerede kaldık?”)

Bu liste, bir sonraki büyük yapılacaklar listesine başlamadan önce “şu an bilinen açıklar/iyileştirmeler” için.

- **Mobil header arama alanı**: bazı cihazlarda sıkışma/okunmama; mobilde 2. satıra alma tasarımı (UI işi).
- **Kişiselleştirme**: Hit + kategori feed’leri daha kullanıcıya özel hale getirilecek (takip/etkileşim sinyalleri).
- **Takip önerileri algoritması**: mevcut sidebar çalışıyor; sıralama ve metin (“X takip ediyor”) iyileştirmeleri yapılacak.
- **README genişletme**: Bu master plan zaten genişletildi; README’de (React sürümü gibi) küçük tutarsızlıklar sonra düzeltilebilir.


