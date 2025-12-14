# 📸 Resim Yükleme Rehberi

Bu rehber, Polithane platformuna resim yüklerken hangi klasöre hangi resimlerin konulacağını açıklar.

## 📁 Klasör Yapısı

```
public/assets/
├── profiles/                          # 👤 Profil Resimleri
│   ├── politicians/                  # Siyasetçiler
│   │   ├── party_chairs/            # Parti Genel Başkanları
│   │   │   ├── kemal_kilicdaroglu.jpg
│   │   │   ├── recep_tayyip_erdogan.jpg
│   │   │   └── ...
│   │   ├── mps/                     # Milletvekilleri
│   │   │   ├── mehmet_mp.jpg
│   │   │   └── ...
│   │   ├── provincial_chairs/       # İl Başkanları
│   │   │   ├── il_baskani_istanbul.jpg
│   │   │   └── ...
│   │   ├── district_chairs/         # İlçe Başkanları
│   │   │   ├── ilce_baskani_kadikoy.jpg
│   │   │   └── ...
│   │   ├── myk_members/             # MYK Üyeleri
│   │   │   ├── myk_uyesi.jpg
│   │   │   └── ...
│   │   ├── vice_chairs/             # Genel Başkan Yardımcıları
│   │   │   ├── genel_baskan_yardimcisi.jpg
│   │   │   └── ...
│   │   └── others/                  # Diğer Siyasetçiler
│   ├── citizens/                     # Vatandaşlar
│   │   ├── ali_vatandas.jpg
│   │   ├── fatma_citizen.jpg
│   │   └── ...
│   ├── media/                        # Medya Çalışanları
│   │   ├── ayse_medya.jpg
│   │   └── ...
│   ├── party_members/                # Parti Üyeleri
│   │   ├── parti_uyesi_ahmet.jpg
│   │   └── ...
│   └── ex_politicians/               # Eski Siyasetçiler
│       ├── eski_vekili.jpg
│       └── ...
│
├── parties/                          # 🏛️ Parti Görselleri
│   ├── logos/                        # Parti Logoları
│   │   ├── ak_parti.png
│   │   ├── chp.png
│   │   ├── mhp.png
│   │   ├── dem.png
│   │   ├── iyi_parti.png
│   │   └── zp.png
│   └── flags/                        # Parti Bayrakları
│       ├── ak_parti_flag.png
│       ├── chp_flag.png
│       ├── mhp_flag.png
│       ├── dem_flag.png
│       ├── iyi_parti_flag.png
│       └── zp_flag.png
│
├── posts/                            # 📝 Paylaşım İçerikleri
│   ├── images/                       # Paylaşım Resimleri
│   │   ├── post_1.jpg
│   │   ├── post_2.jpg
│   │   ├── post_3.jpg
│   │   └── ...
│   ├── videos/                       # Paylaşım Videoları
│   │   ├── post_2.mp4
│   │   ├── post_9.mp4
│   │   └── ...
│   ├── thumbnails/                   # Video Thumbnail'ları
│   │   ├── post_2_thumb.jpg
│   │   ├── post_9_thumb.jpg
│   │   └── ...
│   └── audio/                        # Ses Dosyaları
│       ├── post_10.mp3
│       └── ...
│
├── hero/                             # 🎬 Hero Slider Resimleri
│   ├── hero_1.jpg
│   ├── hero_2.jpg
│   ├── hero_3.jpg
│   └── ...
│
├── agendas/                          # 📰 Gündem Görselleri
│   ├── ekonomi.jpg
│   ├── egitim.jpg
│   ├── dis-politika.jpg
│   └── ...
│
└── default/                          # 🔧 Varsayılan Görseller
    ├── avatar.png                    # Varsayılan profil resmi
    ├── hero.jpg                      # Varsayılan hero resmi
    ├── party_logo.png               # Varsayılan parti logosu
    └── party_flag.png               # Varsayılan parti bayrağı
```

## 📋 Dosya İsimlendirme Kuralları

### ✅ DOĞRU Örnekler:
- `kemal_kilicdaroglu.jpg` ✅
- `recep_tayyip_erdogan.jpg` ✅
- `ak_parti.png` ✅
- `post_123.jpg` ✅
- `hero_1.jpg` ✅

### ❌ YANLIŞ Örnekler:
- `Kemal Kılıçdaroğlu.jpg` ❌ (büyük harf ve boşluk)
- `recep-tayyip-erdogan.jpg` ❌ (tire yerine alt çizgi)
- `AK PARTİ.png` ❌ (büyük harf ve boşluk)
- `post 123.jpg` ❌ (boşluk)

## 🎯 Resim Yükleme Örnekleri

### 1. Profil Resmi Yükleme

**Parti Genel Başkanı:**
```
Dosya: public/assets/profiles/politicians/party_chairs/kemal_kilicdaroglu.jpg
Boyut: 400x400px (kare)
Format: JPG, PNG
```

**Milletvekili:**
```
Dosya: public/assets/profiles/politicians/mps/mehmet_mp.jpg
Boyut: 400x400px (kare)
Format: JPG, PNG
```

**Vatandaş:**
```
Dosya: public/assets/profiles/citizens/ali_vatandas.jpg
Boyut: 400x400px (kare)
Format: JPG, PNG
```

**Medya:**
```
Dosya: public/assets/profiles/media/ayse_medya.jpg
Boyut: 400x400px (kare)
Format: JPG, PNG
```

### 2. Parti Görselleri

**Parti Logosu:**
```
Dosya: public/assets/parties/logos/chp.png
Boyut: 200x200px (kare)
Format: PNG (şeffaf arka plan önerilir)
```

**Parti Bayrağı:**
```
Dosya: public/assets/parties/flags/chp_flag.png
Boyut: 800x400px (2:1 oran)
Format: PNG, JPG
```

### 3. Paylaşım İçerikleri

**Resim Paylaşımı:**
```
Dosya: public/assets/posts/images/post_123.jpg
Boyut: 1200x800px (3:2 oran)
Format: JPG, PNG, WebP
```

**Video Paylaşımı:**
```
Video: public/assets/posts/videos/post_456.mp4
Thumbnail: public/assets/posts/thumbnails/post_456_thumb.jpg
Video Boyut: Max 100MB
Thumbnail Boyut: 800x450px (16:9 oran)
Format: MP4, WebM
```

**Ses Paylaşımı:**
```
Dosya: public/assets/posts/audio/post_789.mp3
Boyut: Max 20MB
Format: MP3, WAV
```

### 4. Hero Slider
```
Dosya: public/assets/hero/hero_1.jpg
Boyut: 1920x400px (4.8:1 oran)
Format: JPG, PNG
```

## 🔧 Otomatik Path Oluşturma

Sistem otomatik olarak doğru path'leri oluşturur:

```javascript
// Profil resmi için
getProfileImagePath('politician', 'mp', 'mehmet_mp', 6)
// → /assets/profiles/politicians/mps/mehmet_mp.jpg

// Parti logosu için
getPartyLogoPath('CHP', 2)
// → /assets/parties/logos/chp.png

// Post resmi için
getPostMediaPath('image', 123)
// → /assets/posts/images/post_123.jpg
```

## 📐 Önerilen Boyutlar ve Formatlar

| Kategori | Boyut | Format | Notlar |
|----------|-------|--------|--------|
| Profil Resimleri | 400x400px | JPG, PNG | Kare format |
| Parti Logoları | 200x200px | PNG | Şeffaf arka plan |
| Parti Bayrakları | 800x400px | PNG, JPG | 2:1 oran |
| Post Resimleri | 1200x800px | JPG, PNG, WebP | 3:2 oran |
| Video Thumbnail | 800x450px | JPG, PNG | 16:9 oran |
| Hero Slider | 1920x400px | JPG, PNG | 4.8:1 oran |

## ✅ Kontrol Listesi

Resim yüklerken:
- [ ] Dosya adı küçük harf ve alt çizgi kullanıyor mu?
- [ ] Türkçe karakterler İngilizce karşılıklarına çevrildi mi?
- [ ] Doğru klasöre yüklendi mi?
- [ ] Dosya boyutu optimize edildi mi?
- [ ] Dosya formatı uygun mu?

## 🚀 Hızlı Başlangıç

1. İlgili klasöre gidin (örn: `public/assets/profiles/politicians/mps/`)
2. Resminizi yükleyin (dosya adı: `kullanici_adi.jpg`)
3. Sistem otomatik olarak resmi bulacaktır!

## 📝 Notlar

- Tüm path'ler `/assets/` ile başlar
- Dosya adları kullanıcı adı veya ID ile eşleşmelidir
- Eğer resim bulunamazsa placeholder gösterilir
- Resimler optimize edilmiş olmalıdır (hızlı yükleme için)
