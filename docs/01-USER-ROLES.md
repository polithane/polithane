# 🎭 Kullanıcı Rolleri ve Yetkilendirme Sistemi

## 📋 İçindekiler

1. [Genel Bakış](#genel-bakış)
2. [Rol Hiyerarşisi](#rol-hiyerarşisi)
3. [Detaylı Rol Tanımları](#detaylı-rol-tanımları)
4. [Yetki Matrisi](#yetki-matrisi)
5. [PolitPuan Çarpanları](#politpuan-çarpanları)
6. [Özel Modüller](#özel-modüller)

---

## Genel Bakış

PolitPlatform'da **12 farklı kullanıcı rolü** bulunmaktadır. Her rol, platformda farklı yetkiler, görünürlük seviyeleri ve özel özelliklere sahiptir.

### Rol Kategorileri

```
├── Genel Kullanıcılar (2 rol)
│   ├── Vatandaş (Doğrulanmamış)
│   └── Doğrulanmış Vatandaş
│
├── Parti Ekosistemi (3 rol)
│   ├── Parti Üyesi
│   ├── Siyasetçi (4 alt seviye)
│   └── Teşkilat Yöneticileri (4 alt tip)
│
├── Medya (1 rol)
│   └── Gazeteci / Basın Mensubu
│
├── Yönetim (2 rol)
│   ├── Parti Genel Merkez Admin
│   └── Platform System Administrator
```

---

## Rol Hiyerarşisi

### Güç ve Yetki Seviyeleri (1-10)

| Rol | Seviye | Erişim | Analitik | Moderasyon |
|-----|--------|--------|----------|------------|
| Platform Admin | 10 | Global | Full | Tam |
| Parti GM Admin | 8 | Parti | Advanced | Parti İçi |
| Milletvekili | 7 | Geniş | Advanced | Kısıtlı |
| İl Başkanı | 6 | İl Bazlı | Advanced | Parti İçi |
| Gazeteci | 6 | Geniş | Medium | Kısıtlı |
| Genel Merkez Siyasetçi | 6 | Geniş | Advanced | Kısıtlı |
| İl Siyasetçisi | 5 | İl Bazlı | Medium | Yok |
| İlçe Başkanı | 5 | İlçe Bazlı | Medium | Parti İçi |
| Kol Başkanları | 5 | Özel Alan | Medium | Yok |
| İlçe Siyasetçisi | 4 | İlçe Bazlı | Basic | Yok |
| Parti Üyesi | 3 | Parti | Basic | Yok |
| Doğrulanmış Vatandaş | 2 | Public | Basic | Yok |
| Vatandaş | 1 | Public | Yok | Yok |

---

## Detaylı Rol Tanımları

### 1. 👤 Vatandaş (Doğrulanmamış Üye)

**Açıklama**: Platforma yeni katılan, henüz kimlik doğrulaması yapmamış kullanıcı.

**Temel Özellikler**:
- ✅ Kayıt: Email veya telefon ile
- ✅ Profil: Sınırlı (isim, şehir, profil fotoğrafı)
- ⚠️ Doğrulama: E-Devlet entegrasyonu bekleniyor

**Yetkiler**:
- 👁️ Görüntüleme: Genel paylaşımlar (parti içerikler hariç)
- 💬 Yorum: Günde maksimum 5 yorum
- ❤️ Beğeni: Sınırsız
- 🚫 Post: YOK
- 🚫 DM: YOK
- 🚫 Analitik: YOK

**Kısıtlamalar**:
- Siyasetçilere DM gönderemez
- Parti içi içerikleri göremez
- Trending'e çıkamaz
- Anket oluşturamaz
- Canlı yayın yapamaz

**PolitPuan**:
- Çarpan: 0.5x
- Maksimum Günlük Puan: 50

**Geçiş Şartları**:
- E-Devlet doğrulaması → **Doğrulanmış Vatandaş**
- Parti üyeliği belgesi → **Parti Üyesi**

---

### 2. ✅ Doğrulanmış Vatandaş

**Açıklama**: E-Devlet üzerinden kimliğini doğrulamış, tam yetkili vatandaş.

**Temel Özellikler**:
- ✅ Kimlik: TC Kimlik No ile doğrulanmış
- ✅ Rozet: Mavi tik (✓ Doğrulanmış)
- ✅ Profil: Tam (yaş, meslek, ilgi alanları, il-ilçe-mahalle)

**Yetkiler**:
- 👁️ Görüntüleme: Tüm genel içerikler
- 📝 Post: Günde 20 post (metin/fotoğraf/video)
- 💬 Yorum: Sınırsız
- ❤️ Beğeni: Sınırsız
- 📨 DM: Sınırlı (başka vatandaşlar + bazı siyasetçiler)
- 📊 Anket: Oluşturabilir (günde 2)
- 📋 Şikayet: E-Devlet benzeri şikayet sistemi
- 🎯 Öneri: Politika önerileri sunabilir

**Özel Modüller**:
- **Mahalle Sistemi**: Mahalle temsilcisi olabilir
- **Oyunlaştırma**: Rozet ve seviye kazanabilir
- **Analitik**: Basit (kendi profil istatistikleri)

**PolitPuan**:
- Çarpan: 1x
- Maksimum Günlük Puan: 500

**Seviye Sistemi**:
```
Yeni Vatandaş      → 0-100 puan
Aktif Vatandaş     → 100-500 puan
İlgili Vatandaş    → 500-2000 puan
Etkili Vatandaş    → 2000-5000 puan
Örnek Vatandaş     → 5000+ puan
```

**Rozet Örnekleri**:
- 🏆 İlk Paylaşım
- 📢 100 Takipçi
- 💭 1000 Yorum
- 🗳️ 10 Anket Oluşturma
- 🏘️ Mahalle Temsilcisi

---

### 3. 🎫 Parti Üyesi

**Açıklama**: Resmi olarak bir siyasi partiye kayıtlı, parti kimlik kartı olan üye.

**Temel Özellikler**:
- ✅ Parti Rozetli Profil: Parti logosu ve rengi
- ✅ Teşkilat Kodu: Benzersiz üye numarası
- ✅ Kademe Bilgisi: İlçe/İl/Merkez
- ✅ Parti İçi İletişim: Özel mesajlaşma

**Yetkiler (Vatandaş yetkilerine ek)**:
- 🏛️ Parti İçi Görünürlük: Kendi partisinin iç içeriklerini görür
- 📬 Parti Bildirimleri: Teşkilattan gelen özel mesajlar
- 🤝 Parti Ağı: Aynı partideki üyelerle bağlantı kurma
- 🎤 Parti Etkinlikleri: Katılım ve görev alma
- 📊 Temel Parti Analitiği: Parti genel durum özeti

**Parti İçi Hiyerarşi Farkı**:
```
Parti Üyesi
├── Sandık Görevlisi
├── Mahalle Temsilcisi (Parti)
├── İlçe Delegesi
└── İl Delegesi
```

**Görünürlük Kuralları**:
- ✅ Kendi partisinin içerik akışını TAM görür
- ⚠️ Rakip partilerin genel paylaşımlarını SINIRLI görür
  - Parti içi içerikler: GÖRMEZ
  - Genel paylaşımlar: GÖRÜR (ama önceliği düşük)
  - Eleştirel içerikler: GÖRÜR

**PolitPuan**:
- Çarpan: 1.2x
- Maksimum Günlük Puan: 700

**Özel Modüller**:
- Görev Yönetimi
- Parti İçi Mesajlaşma
- Teşkilat Haritası (Kendi partisi)
- Parti Etkinlik Takvimi

---

### 4. 🎤 Siyasetçi (4 Seviye)

Siyasetçiler, seçilmiş veya atanmış görevlerde bulunan kişilerdir. 4 farklı seviyede kategorize edilir.

#### 4.1 İlçe Seviyesi Siyasetçi

**Örnekler**: İlçe meclis üyesi, belediye meclis üyesi, atanmış yerel yönetici

**Yetkiler**:
- 📝 Post: Günde 50 post
- 📢 Canlı Yayın: Haftada 2
- 📊 Analitik: Orta seviye (ilçe bazlı)
- 💬 Vatandaş Mesajları: İlçe sınırlı DM alabilir
- 🎯 Gündem Oluşturma: Yerel gündem önerebilir

**Görünürlük**:
- İlçesindeki vatandaşlara öncelikli gösterilir
- İl genelinde düşük öncelik
- Ulusal feed'de nadir

**PolitPuan Çarpanı**: 1.5x

**Analitik Özellikleri**:
- İlçe demografik analizi
- Mahalle bazlı sentiment
- Şikayet/öneri haritası

---

#### 4.2 İl Seviyesi Siyasetçi

**Örnekler**: Büyükşehir meclis üyesi, il genel meclisi üyesi, vali yardımcısı

**Yetkiler (İlçe yetkilerine ek)**:
- 📝 Post: Günde 100 post
- 📢 Canlı Yayın: Haftada 5
- 📊 Analitik: Gelişmiş (il bazlı)
- 💬 Vatandaş Mesajları: İl geneli DM
- 🎤 Basın Açıklaması: Özel format

**Görünürlük**:
- İl genelinde yüksek öncelik
- Komşu illerde orta öncelik
- Ulusal feed'de orta sıklık

**PolitPuan Çarpanı**: 2x

**Analitik Özellikleri**:
- İl geneli trend analizi
- İlçe karşılaştırmaları
- Rakip parti analizi (il bazlı)
- Medya görünürlük raporu

---

#### 4.3 Genel Merkez Seviyesi Siyasetçi

**Örnekler**: Parti genel başkan yardımcısı, genel sekreter, parti sözcüsü

**Yetkiler (İl yetkilerine ek)**:
- 📝 Post: Sınırsız
- 📢 Canlı Yayın: Sınırsız
- 📊 Analitik: Tam (ulusal)
- 💬 Vatandaş Mesajları: Filtrelenmiş DM (asistan yardımıyla)
- 🎤 Basın Açıklaması: Anında öncelikli yayın
- 📰 Medya Bildirimi: Tüm gazetecilere bildirim

**Görünürlük**:
- Ulusal feed'de çok yüksek öncelik
- Tüm illerde görünür
- Trend'e çıkma olasılığı yüksek

**PolitPuan Çarpanı**: 3x

**Analitik Özellikleri**:
- Ulusal trend analizi
- Bölge bazlı karşılaştırmalar
- Seçim tahmin modelleri
- 7/24 sentiment tracking
- Rakip parti stratejik analiz

---

#### 4.4 Milletvekili

**Örnekler**: TBMM üyesi, Komisyon başkanı

**Yetkiler (Genel Merkez yetkilerine benzer + özel ekler)**:
- 📝 Post: Sınırsız
- 📢 Canlı Yayın: Sınırsız
- 📊 Analitik: Tam + Meclis Modülü
- 💬 Vatandaş Mesajları: Özel yönetim paneli
- 🏛️ Önerge Sistemi: Önerge paylaşabilir ve takip edebilir
- 🗳️ Komisyon İşlemleri: Komisyon çalışmaları paylaşabilir
- 📋 Soru Önergesi: Vatandaşlardan soru önergesi alabilir

**Görünürlük**:
- Seçim bölgesinde MAKSIMUM öncelik
- Ulusal feed'de çok yüksek öncelik
- Parti içinde üst sıralarda

**PolitPuan Çarpanı**: 4x

**Özel Modüller**:
- **Meclis Modülü**:
  - Katıldığı oturumlar
  - Verdiği önergeler
  - Oy kullanma geçmişi
  - Komisyon raporları
  
- **Seçim Bölgesi Analitik**:
  - İlçe bazlı detaylı analiz
  - Demografik dağılım
  - Muhalefet gücü haritası
  - Sandık bazlı analiz (seçim döneminde)

- **Vatandaş Etkileşimi**:
  - Öncelikli soru-cevap
  - Toplantı randevu sistemi
  - Ziyaret takvimi paylaşımı

---

### 5. 📰 Gazeteci / Basın Mensubu

**Açıklama**: Doğrulanmış medya kuruluşunda çalışan gazeteci, editör, muhabir.

**Doğrulama**:
- Basın kartı kontrolü
- Medya kuruluşu onayı
- 2 referans (diğer gazeteciler)

**Temel Özellikler**:
- ✅ Medya Rozeti: 🎙️ simgesi
- ✅ Kuruluş Bağlantısı: Profilde medya logosu
- ✅ Doğruluk Skoru: Fact-check geçmişi

**Yetkiler**:
- 📝 Post: Sınırsız
- 📰 Haber Formatı: Özel haber kartı
- 📢 Canlı Yayın: Sınırsız + öncelikli yayın
- 🎤 Röportaj Modu: Siyasetçileri etiketleyerek özel format
- 🔗 Kaynak Ekleme: Haberlere dış kaynak linkleyebilir
- 📊 Analitik: Gelişmiş medya analitiği
- 💬 Siyasetçilere DM: Tüm siyasetçilere direkt mesaj

**Görünürlük**:
- Medya sekmesinde öncelikli
- Ulusal feed'de yüksek görünürlük
- Siyasetçi profil ziyaretlerinde üst sıra

**PolitPuan Çarpanı**: 2.5x

**Özel Modüller**:
- **Haber Merkezi Dashboard**:
  - Yayın performansı
  - Etkileşim analizi
  - Siyasetçi yanıt oranları
  - Fact-check skoru

- **Medya Kütüphanesi**:
  - Geçmiş haberler arşivi
  - Röportaj kayıtları
  - Alıntı koleksiyonu

- **Siyasetçi Takip Listesi**:
  - Özel izleme listeleri
  - Otomatik bildirimler
  - Karşılaştırmalı analiz

**Kısıtlamalar**:
- Partizan içerik üretirse **doğruluk skoru** düşer
- Fake news tespit edilirse hesap askıya alınabilir
- AI tarafsızlık analizi sürekli çalışır

---

### 6. 🏛️ Teşkilat Yöneticileri (4 Alt Tip)

#### 6.1 İl Başkanı

**Tanım**: İl bazında partinin en üst düzey yöneticisi

**Yetkiler**:
- 👥 Teşkilat Yönetimi: İl ve ilçe teşkilatı tam yetkisi
- 📋 Görev Atama: İlçe ve mahalle görevlileri atayabilir
- 📊 Analitik: İl geneli detaylı raporlar
- 📢 Bildirim Gönderme: İl geneli parti üyelerine toplu mesaj
- 💬 İç İletişim: İlçe başkanları ile özel kanal
- 🎤 İl Gündemi: İl gündemini belirleme yetkisi

**Görünürlük**:
- İl içinde parti üyelerine maksimum
- İl geneli vatandaşlara yüksek
- Parti içi iletişimde üst düzey

**PolitPuan Çarpanı**: 2.5x

**Özel Modüller**:
- **Teşkilat Haritası**: İl ve ilçe görünümü
- **Görev Yönetim Paneli**: Atama ve raporlama
- **İl Anketi**: Parti içi anketler yapabilir
- **Toplantı Organizasyonu**: Etkinlik planlama

---

#### 6.2 İlçe Başkanı

**Tanım**: İlçe bazında parti yöneticisi

**Yetkiler**:
- 👥 Teşkilat Yönetimi: İlçe teşkilatı tam yetkisi
- 📋 Görev Atama: Mahalle görevlileri atayabilir
- 📊 Analitik: İlçe bazlı raporlar
- 📢 Bildirim: İlçe parti üyelerine mesaj
- 🗂️ Sandık Yönetimi: Sandık görevlilerini organize eder

**PolitPuan Çarpanı**: 2x

**Özel Modüller**:
- **Mahalle Yönetimi**: Mahalle temsilcileri ile koordinasyon
- **Sandık Haritası**: Seçim döneminde sandık bazlı organizasyon
- **İlçe Raporu**: Haftalık/aylık otomatik raporlar

---

#### 6.3 Kadın Kolları Başkanı

**Tanım**: Partinin kadın kolları organizasyonunun lideri (İl veya ilçe seviyesinde)

**Yetkiler**:
- 👥 Kadın Üye Yönetimi: Kadın üyelere özel erişim
- 📢 Kadın Gündemi: Kadın sorunlarına özel gündem oluşturma
- 🎯 Etkinlik Düzenleme: Kadın kolları etkinlikleri
- 📊 Analitik: Kadın üye istatistikleri

**Özel İçerik Türleri**:
- Kadın hakları
- Aile politikaları
- İş yaşamında kadın
- Eğitim ve sağlık

**PolitPuan Çarpanı**: 2x

---

#### 6.4 Gençlik Kolları Başkanı

**Tanım**: Partinin gençlik kolları organizasyonunun lideri

**Yetkiler**:
- 👥 Genç Üye Yönetimi: 18-30 yaş arası üyelere özel erişim
- 📢 Gençlik Gündemi: Gençlik sorunlarına özel gündem
- 🎓 Kampüs Organizasyonu: Üniversite bazlı organizasyon
- 📊 Analitik: Genç üye istatistikleri

**Özel İçerik Türleri**:
- Eğitim politikaları
- İstihdam
- Dijital haklar
- Çevre

**PolitPuan Çarpanı**: 2x

**Özel Modül**:
- Kampüs Haritası: Üniversite bazlı teşkilat

---

### 7. 🏢 Parti Genel Merkez Admin

**Tanım**: Partinin merkez ofisinde dijital stratejiden sorumlu yönetici

**Yetkiler**:
- 👥 Tüm Parti Üyelerini Görme: Tam liste ve istatistikler
- 📊 Parti Geneli Analitik: Tüm illerde detaylı raporlar
- 📢 Global Bildirim: Tüm parti üyelerine mesaj
- 🎛️ Moderasyon: Parti içi içerik moderasyonu
- 🔧 Parti Ayarları: Parti sayfası özelleştirme
- 📈 Kampanya Yönetimi: Dijital kampanya araçları
- 👤 Rol Atama: Parti içi rol ve yetki değişiklikleri

**Görünürlük**:
- Parti içinde her yerde
- Tüm teşkilat faaliyetlerini görebilir

**Özel Modüller**:
- **Merkez Kontrol Paneli**:
  - Gerçek zamanlı parti istatistikleri
  - Bölgesel performans karşılaştırma
  - Aktif/pasif üye analizi
  - Etkileşim ısı haritası
  
- **Kampanya Merkezi**:
  - Dijital kampanya oluşturma
  - A/B test araçları
  - Hedef kitle segmentasyonu
  - Performans raporları

- **İçerik Yönetimi**:
  - Parti resmi paylaşımları
  - Taslak onay sistemi
  - Zamanlı paylaşım
  - İçerik kütüphanesi

---

### 8. ⚙️ Platform System Administrator

**Tanım**: PolitPlatform'un teknik ve operasyonel yöneticileri

**Yetkiler**:
- 🌐 Global Erişim: Tüm kullanıcılar ve içerikler
- 🛡️ Global Moderasyon: Tüm platformda moderasyon yetkisi
- 📊 Sistem Analitiği: Teknik metrikler ve performans
- 👤 Kullanıcı Yönetimi: Hesap onaylama, askıya alma, silme
- 🔧 Platform Ayarları: Genel platform konfigürasyonu
- 🤖 AI Ayarları: Algoritma parametreleri
- 📢 Global Duyuru: Tüm kullanıcılara sistem mesajı

**Sorumluluklar**:
- Platform güvenliği
- Veri bütünlüğü
- İçerik politikası uygulama
- Kriz yönetimi
- Teknik destek

**Özel Modüller**:
- **Admin Dashboard**:
  - Gerçek zamanlı sistem metrikleri
  - Kullanıcı aktivite grafikleri
  - API kullanım istatistikleri
  - Hata raporları

- **Moderasyon Merkezi**:
  - Şikayet kuyruğu
  - AI bayrak sistemi
  - Manuel inceleme araçları
  - Kara liste yönetimi

- **AI Kontrol Paneli**:
  - Algoritma ağırlık ayarları
  - Sentiment analiz parametreleri
  - Öneri sistemi konfigürasyonu
  - A/B test sonuçları

---

## Yetki Matrisi

### İçerik Oluşturma Yetkileri

| Özellik | Vatandaş | Doğrulanmış | Parti Üyesi | Siyasetçi | Gazeteci | Teşkilat | Parti Admin | Sys Admin |
|---------|----------|-------------|-------------|-----------|----------|----------|-------------|-----------|
| Metin Post | ❌ | ✅ (20/gün) | ✅ (30/gün) | ✅ (50-∞) | ✅ (∞) | ✅ (50/gün) | ✅ (∞) | ✅ (∞) |
| Fotoğraf | ❌ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Video | ❌ | ✅ (10/gün) | ✅ (15/gün) | ✅ (∞) | ✅ (∞) | ✅ (20/gün) | ✅ (∞) | ✅ (∞) |
| Canlı Yayın | ❌ | ❌ | ❌ | ✅ | ✅ | ✅ (onay) | ✅ | ✅ |
| Anket | ❌ | ✅ (2/gün) | ✅ (3/gün) | ✅ (10/gün) | ✅ (5/gün) | ✅ (5/gün) | ✅ (∞) | ✅ (∞) |
| Önerge | ❌ | ⚠️ (öneri) | ⚠️ (öneri) | ✅ (resmi) | ❌ | ❌ | ❌ | ❌ |

### Etkileşim Yetkileri

| Özellik | Vatandaş | Doğrulanmış | Parti Üyesi | Siyasetçi | Gazeteci | Teşkilat | Parti Admin | Sys Admin |
|---------|----------|-------------|-------------|-----------|----------|----------|-------------|-----------|
| Beğeni | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Yorum | ⚠️ (5/gün) | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Paylaşım | ❌ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Alıntı | ❌ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Kaydet | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |

### Mesajlaşma Yetkileri

| Kime Mesaj | Vatandaş | Doğrulanmış | Parti Üyesi | Siyasetçi | Gazeteci | Teşkilat | Parti Admin | Sys Admin |
|------------|----------|-------------|-------------|-----------|----------|----------|-------------|-----------|
| Vatandaş | ❌ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Parti Üyesi | ❌ | ✅ | ✅ (aynı parti) | ✅ | ✅ | ✅ (aynı parti) | ✅ (aynı parti) | ✅ |
| Siyasetçi | ❌ | ⚠️ (filtrelenmiş) | ⚠️ (filtrelenmiş) | ✅ | ✅ | ✅ | ✅ | ✅ |
| Gazeteci | ❌ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |

### Analitik Erişim

| Analitik Türü | Vatandaş | Doğrulanmış | Parti Üyesi | Siyasetçi | Gazeteci | Teşkilat | Parti Admin | Sys Admin |
|---------------|----------|-------------|-------------|-----------|----------|----------|-------------|-----------|
| Kendi Profil | ❌ | ✅ (temel) | ✅ (temel) | ✅ (gelişmiş) | ✅ (gelişmiş) | ✅ (gelişmiş) | ✅ (gelişmiş) | ✅ (tam) |
| Rakip Analizi | ❌ | ❌ | ❌ | ✅ | ⚠️ (kısıtlı) | ✅ | ✅ | ✅ |
| Bölge Analizi | ❌ | ❌ | ❌ | ✅ | ⚠️ (genel) | ✅ | ✅ | ✅ |
| Trend Analizi | ❌ | ⚠️ (genel) | ⚠️ (genel) | ✅ | ✅ | ✅ | ✅ | ✅ |
| Sentiment | ❌ | ❌ | ❌ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Tahmin Modeli | ❌ | ❌ | ❌ | ✅ (basit) | ❌ | ✅ | ✅ (gelişmiş) | ✅ (tam) |

### Moderasyon Yetkileri

| Moderasyon | Vatandaş | Doğrulanmış | Parti Üyesi | Siyasetçi | Gazeteci | Teşkilat | Parti Admin | Sys Admin |
|------------|----------|-------------|-------------|-----------|----------|----------|-------------|-----------|
| Şikayet Et | ❌ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| İçerik Sil (kendi) | ❌ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| İçerik Sil (başkası) | ❌ | ❌ | ❌ | ❌ | ❌ | ⚠️ (parti içi) | ⚠️ (parti) | ✅ (global) |
| Kullanıcı Engelle | ❌ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Hesap Askıya Al | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ⚠️ (parti) | ✅ (global) |

---

## PolitPuan Çarpanları

Her rol için PolitPuan hesaplamasında farklı çarpanlar uygulanır:

### Rol Bazlı Çarpanlar

| Rol | Temel Çarpan | Maksimum Günlük Puan | Özel Bonus |
|-----|--------------|---------------------|------------|
| Vatandaş | 0.5x | 50 | - |
| Doğrulanmış Vatandaş | 1.0x | 500 | Rozet bonusları |
| Parti Üyesi | 1.2x | 700 | Görev tamamlama +10% |
| İlçe Siyasetçisi | 1.5x | 1,000 | Yerel gündem +20% |
| İl Siyasetçisi | 2.0x | 2,000 | İl gündemi +30% |
| GM Siyasetçisi | 3.0x | 5,000 | Ulusal gündem +50% |
| Milletvekili | 4.0x | 10,000 | Meclis içeriği +100% |
| Gazeteci | 2.5x | 3,000 | Haber formatı +40% |
| İlçe Başkanı | 2.0x | 2,000 | Teşkilat içeriği +25% |
| İl Başkanı | 2.5x | 3,000 | Teşkilat içeriği +35% |
| Kol Başkanları | 2.0x | 2,000 | Özel alan içeriği +30% |
| Parti GM Admin | 3.0x | 5,000 | Resmi paylaşım +50% |
| Sys Admin | 0x | 0 | (Puan almaz) |

### Ek Çarpan Kuralları

**Doğrulanmış Rozet Bonusu**:
- E-Devlet doğrulama: +10%
- Meslek doğrulama: +5%
- Adres doğrulama: +5%

**Teşkilat Görev Bonusu**:
- Aktif görevli: +15%
- Görev tamamlama oranı > 80%: +25%
- Sandık görevlisi: +10%

**Etki Çarpanları**:
- Takipçi > 1K: +10%
- Takipçi > 10K: +25%
- Takipçi > 100K: +50%
- Takipçi > 1M: +100%

---

## Özel Modüller

### Vatandaşa Özel Modüller

**1. Mahalle Temsilcisi Sistemi**
- Mahalle bazında en aktif 3 vatandaş otomatik aday
- Mahalle sakinleri oylama yapabilir
- Seçilen temsilci → özel rozet + yetki
- Yetkiler:
  - Mahalle gündemi oluşturma
  - Mahalle anketi yapma
  - Belediye ile direkt iletişim
  - Mahalle sorunlarını etiketleme

**2. Şikayet/Öneri Sistemi**
- E-Devlet benzeri kategorizasyon
- Fotoğraf/video ekleme
- Konum işaretleme
- Takip numarası
- Durum güncellemeleri
- Yetkili kurum otomatik bildirimi

**3. Oyunlaştırma**
- Seviye sistemi (1-100)
- Rozet koleksiyonu (50+ rozet)
- Haftalık liderlik tablosu
- Aylık ödüller
- Başarım sistemi

---

### Parti Üyesine Özel Modüller

**1. Görev Yönetimi**
- Atanmış görevler listesi
- Görev detayları ve deadline
- Tamamlama raporu
- Görev geçmişi

**2. Parti İçi İletişim**
- Kapalı parti grubu
- Teşkilat duyuruları
- Acil bildirimler
- Parti etkinlik takvimi

**3. Teşkilat Haritası (Kısıtlı)**
- Sadece kendi partisini görür
- İl ve ilçe yapılanması
- Üst kademelerle iletişim
- Parti istatistikleri

---

### Siyasetçiye Özel Modüller

**1. Analitik Dashboard**
- Gerçek zamanlı imaj skoru
- Sentiment analizi
- Rakip karşılaştırma
- Bölge nabzı
- Medya görünürlük

**2. Vatandaş Etkileşim Paneli**
- Gelen mesajlar (filtrelenmiş)
- Şikayet/öneri özeti
- Soru-cevap kuyruğu
- Randevu sistemi

**3. AI İçerik Asistanı**
- Konuşma metni önerisi
- Basın açıklaması şablonları
- Kriz iletişim önerileri
- Paylaşım zamanlaması

**4. Meclis Modülü (Sadece Milletvekili)**
- Önerge yönetimi
- Komisyon takibi
- Meclis gündem
- Oylama geçmişi

---

### Gazeteciye Özel Modüller

**1. Medya Merkezi Dashboard**
- Haber performans analizi
- Siyasetçi yanıt oranları
- Fact-check skoru
- Medya etkisi analizi

**2. Kaynak ve Arşiv**
- Geçmiş haber arşivi
- Röportaj kütüphanesi
- Alıntı koleksiyonu
- Referans sistemı

**3. Siyasetçi İzleme**
- Özel takip listeleri
- Otomatik bildirimler
- Karşılaştırmalı analiz

---

### Teşkilat Yöneticisine Özel Modüller

**1. Teşkilat Kontrol Paneli**
- Organizasyon şeması
- Üye yönetimi
- Görev dağıtımı
- Performance tracking

**2. Etkinlik Yönetimi**
- Etkinlik planlama
- Katılımcı takibi
- Bütçe yönetimi
- Raporlama

**3. İç İletişim**
- Toplu mesajlaşma
- Duyuru sistemi
- Acil bildirim
- Feedback toplama

---

### Parti GM Admin'e Özel Modüller

**1. Merkez Kontrol Paneli**
- Tüm parti istatistikleri
- Bölgesel performans
- Aktif/pasif üye analizi
- Etkileşim haritası

**2. Kampanya Merkezi**
- Dijital kampanya oluşturma
- A/B test
- Segmentasyon
- ROI analizi

**3. İçerik Yönetimi**
- Taslak onay sistemi
- Zamanlı paylaşım
- İçerik kütüphanesi
- Marka yönetimi

---

## Rol Geçiş Senaryoları

### Yükseltme Yolları

```
Vatandaş
    ↓ (E-Devlet doğrulama)
Doğrulanmış Vatandaş
    ↓ (Parti kaydı)
Parti Üyesi
    ↓ (Görev atanması veya seçim)
Teşkilat Yöneticisi / Siyasetçi
```

### Rol Değişikliği Kuralları

**Otomatik Yükseltme**:
- E-Devlet doğrulama → Anında
- Parti kaydı onayı → 24 saat içinde

**Manuel Onay Gerektiren**:
- Siyasetçi rolü → Parti GM Admin + Platform Admin onayı
- Gazeteci rolü → Basın kartı + 2 referans + Platform Admin onayı
- Teşkilat yöneticisi → Parti GM Admin onayı

**Geçici Rol**:
- Seçim görevlisi (sandık başkanı) → Sadece seçim döneminde
- Etkinlik organizatörü → Etkinlik süresince

**Rol Kaybı**:
- Parti üyeliği iptali → Parti Üyesi'nden Doğrulanmış Vatandaş'a
- Görevden alınma → Teşkilat/Siyasetçi'den Parti Üyesi'ne
- Platform kuralı ihlali → Herhangi bir rolden Vatandaş'a (askıya alınabilir)

---

## Güvenlik ve Gizlilik

### Rol Bazlı Veri Koruma

**Genel Kullanıcılar**:
- Profil: Genel görünür
- İletişim bilgileri: Gizli
- Konum: İl/ilçe seviyesinde görünür

**Parti Üyeleri**:
- Parti kimlik no: Sadece parti adminleri görür
- İç iletişim: End-to-end encrypted
- Görev bilgileri: Sadece ilgili kademeler görür

**Siyasetçiler**:
- İletişim: Filtrelenmiş, asistan kontrolünde
- Adres: Gizli (sadece ofis adresi açık)
- DM'ler: Özel güvenlik katmanı

**Gazeteciler**:
- Basın kartı bilgileri: Doğrulama için kullanılır, görünmez
- Kurum bilgisi: Açık
- Kişisel iletişim: Gizli

---

## Sonuç

PolitPlatform'un 12 rol sistemi, her kullanıcı tipine özel deneyim sunarak hem demokrasiye katkı sağlar hem de güvenlik ve gizliliği korur. Her rol, platformun farklı bir katmanında aktif olarak sistemin bir parçası olur.

**Toplam Yetki Kombinasyonu**: 12 rol × 20+ özellik = 240+ farklı yetki senaryosu

---

**Sonraki Dokümantasyon**: [02-POLITPUAN-ALGORITHM.md](./02-POLITPUAN-ALGORITHM.md)
