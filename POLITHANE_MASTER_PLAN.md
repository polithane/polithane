## Polithane — Proje Tanımı, Yol Haritası ve Çalışma Yönergesi (Tek Kaynak)

**Belge amacı**: Bu dosya, Polithane projesinin “tek kaynak/tek plan” dokümanıdır. İleride sohbetimiz kesilse bile, **ne yaptığımızı, neden yaptığımızı ve sıradaki adımlarımızı** buradan takip edeceğiz.

**Son güncelleme**: 2025-12-14  
**Durum**: Aktif geliştirme (Supabase + Vercel)  

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
- **Hikaye/Story**: Kısa, dikey tüketim. (İleride “24 saat sonra kaybolan” opsiyonu eklenebilir.)
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

- **Aksiyon tipleri**: view / like / comment (share ileride eklenecek)
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
- **Pazarlama**: duyurular, e-posta kampanyaları (şimdilik SendGrid)
- **Sistem sağlığı**: hata oranı, performans, log/audit, storage tüketimi

---

## 7) Altyapı ve Teknoloji Yığını (Bugün “tek gerçek”)

### 7.1 Bugünkü kesin karar (SCOPE-INFRA-01)
- **DB/Auth/Storage/Realtime**: Supabase
- **Web hosting**: Vercel
- **Harici e-posta**: SendGrid (şimdilik)
- Neon/Railway vb. **kullanılmıyor** (tamamen kaldırıldı).

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
- Kurulum/ortam için: `SUPABASE_SETUP_GUIDE.md`, `VERCEL_DEPLOY_GUIDE.md`, `PRODUCTION_CHECKLIST.md`
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

