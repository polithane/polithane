# 🧠 PolitPuan Süper Algoritması

## 📋 İçindekiler

1. [Genel Bakış](#genel-bakış)
2. [5 Katmanlı Sistem](#5-katmanlı-sistem)
3. [Katman Detayları](#katman-detayları)
4. [Hesaplama Formülü](#hesaplama-formülü)
5. [Örnekler](#örnekler)
6. [AI Entegrasyonu](#ai-entegrasyonu)
7. [Gerçek Zamanlı Güncelleme](#gerçek-zamanlı-güncelleme)

---

## Genel Bakış

**PolitPuan**, platformdaki her içeriğin etki gücünü ölçen gelişmiş bir puanlama sistemidir. 5 farklı katmanda analiz yaparak içeriğin gerçek değerini hesaplar.

### Temel Prensipler

- **Çok Boyutlu**: 5 farklı perspektiften analiz
- **AI Destekli**: Derin öğrenme ile içerik analizi
- **Dinamik**: Gerçek zamanlı güncelleme
- **Şeffaf**: Her katmanın katkısı görülebilir
- **Adil**: Botlar ve sahte hesaplar filtrelenir

### Kullanım Alanları

1. **Feed Sıralaması**: Yüksek puanlı içerikler üstte
2. **Trend Belirleme**: Viral potansiyel tahmini
3. **Kullanıcı Sıralaması**: En etkili kullanıcılar
4. **Analitik**: İçerik performans analizi
5. **Öneri Sistemi**: Personalized feed

---

## 5 Katmanlı Sistem

### Katman Ağırlıkları

| Katman | İsim | Ağırlık | Açıklama |
|--------|------|---------|----------|
| **K1** | Temel Etkileşim | 25% | Beğeni, yorum, paylaşım |
| **K2** | Kullanıcı Profili | 20% | Kim paylaştı? |
| **K3** | İçerik Türü | 15% | Ne tür içerik? |
| **K4** | Siyasi Gerilim | 25% | Ne kadar önemli? |
| **K5** | Zamanlama & Trend | 15% | Ne zaman paylaşıldı? |

### Final Formül

```
PolitPuan = (K1 × 0.25) + (K2 × 0.20) + (K3 × 0.15) + (K4 × 0.25) + (K5 × 0.15)

PolitPuan = Σ(Katman_i × Ağırlık_i) × Rol_Çarpanı × Zaman_Azalması
```

---

## Katman Detayları

### Katman 1: Temel Etkileşim (25%)

**Amaç**: Kullanıcıların içerikle nasıl etkileştiğini ölçer.

#### Alt Metrikler ve Puanlar

| Etkileşim Türü | Temel Puan | Çarpan | Notlar |
|----------------|------------|--------|--------|
| **Görüntülenme** | 0.1 | - | Her benzersiz görüntüleme |
| **Beğeni** | 1.0 | 1x | Basit beğeni |
| **Yorum** | 3.0 | 1x-3x | Yorum uzunluğuna göre |
| **Paylaşım** | 5.0 | 1.5x | Kendi takipçilerine |
| **Alıntı Paylaşım** | 7.0 | 2x | Yorum ekleyerek paylaşım |
| **Kaydetme** | 2.0 | 1.2x | Daha sonra okumak için |
| **Link Tıklama** | 1.5 | 1.1x | Harici link varsa |
| **Video İzleme** | 0.5/saniye | Max 10 | Video içeriklerde |

#### Yorum Puanlama Detayı

Yorum uzunluğu ve kalitesine göre puan değişir:

```python
def calculate_comment_score(comment):
    base_score = 3.0
    length = len(comment)
    
    # Uzunluk bonusu
    if length < 10:
        multiplier = 0.5  # Çok kısa ("güzel", "bravo")
    elif length < 50:
        multiplier = 1.0  # Normal
    elif length < 200:
        multiplier = 1.5  # Detaylı
    else:
        multiplier = 2.0  # Çok detaylı
    
    # Kalite analizi (AI)
    quality_score = ai_analyze_comment_quality(comment)
    # quality_score: 0.5 (spam) -> 2.0 (kaliteli)
    
    # Constructive check
    is_constructive = ai_check_constructive(comment)
    constructive_bonus = 1.5 if is_constructive else 1.0
    
    return base_score * multiplier * quality_score * constructive_bonus
```

#### Paylaşım Zincir Etkisi

Paylaşımlar zincirleme puan kazandırır:

```
Orijinal Post: P
├── A paylaşır → P'ye +5 puan, A'ya +2 puan
│   ├── B paylaşır (A'dan) → P'ye +3 puan, A'ya +1 puan, B'ye +2 puan
│   │   └── C paylaşır (B'den) → P'ye +1 puan, B'ye +1 puan, C'ye +2 puan
│   └── D paylaşır (A'dan) → P'ye +3 puan, A'ya +1 puan, D'ye +2 puan
└── E paylaşır → P'ye +5 puan, E'ye +2 puan
```

**Maksimum Zincir Derinliği**: 5 seviye

#### Zaman Bazlı Ağırlık

İlk saatler daha değerlidir (momentum yakala):

```python
def time_weight(hours_since_post):
    if hours_since_post < 1:
        return 2.0  # İlk saat çok değerli
    elif hours_since_post < 6:
        return 1.5
    elif hours_since_post < 24:
        return 1.2
    elif hours_since_post < 72:
        return 1.0
    else:
        return 0.8  # Eski postlar daha az değerli
```

#### K1 Hesaplama Örneği

```
Post X (2 saat önce paylaşıldı):
- Görüntüleme: 1,000 × 0.1 = 100
- Beğeni: 50 × 1.0 = 50
- Yorum: 10 × 4.5 (ort. kaliteli) = 45
- Paylaşım: 5 × 5.0 = 25
- Kaydetme: 8 × 2.0 = 16
- Link tıklama: 12 × 1.5 = 18
Toplam: 254
Zaman çarpanı: 1.5 (2 saat < 6 saat)
K1 = 254 × 1.5 = 381
```

---

### Katman 2: Kullanıcı Profili (20%)

**Amaç**: İçeriği paylaşan kişinin etki gücünü ölçer.

#### Alt Metrikler

##### 2.1 Takipçi Sayısı (30% ağırlık)

Takipçi sayısı logaritmik ölçekte hesaplanır (çok fazla takipçi dominasyonunu önler):

```python
def follower_score(followers):
    if followers < 100:
        return 10
    elif followers < 1_000:
        return 20 + (followers - 100) / 30
    elif followers < 10_000:
        return 50 + (followers - 1_000) / 200
    elif followers < 100_000:
        return 100 + (followers - 10_000) / 1_000
    elif followers < 1_000_000:
        return 200 + (followers - 100_000) / 5_000
    else:
        return 380 + (followers - 1_000_000) / 50_000
    
    # Max: 500 puan
```

##### 2.2 Meslek ve Sosyal Statü (25% ağırlık)

Farklı meslekler, farklı konularda farklı ağırlıklara sahip:

| Meslek | Genel | Ekonomi | Eğitim | Sağlık | Güvenlik |
|--------|-------|---------|--------|--------|----------|
| Öğretmen | 1.2x | 1.0x | 2.0x | 1.0x | 1.0x |
| Doktor | 1.3x | 1.0x | 1.0x | 2.5x | 1.0x |
| Ekonomist | 1.2x | 2.5x | 1.0x | 1.0x | 1.0x |
| Mühendis | 1.2x | 1.2x | 1.2x | 1.0x | 1.3x |
| Hukukçu | 1.5x | 1.3x | 1.0x | 1.0x | 1.8x |
| Emniyet | 1.3x | 1.0x | 1.0x | 1.0x | 2.5x |
| Çiftçi | 1.1x | 1.2x | 1.0x | 1.0x | 1.0x |
| İşçi | 1.1x | 1.3x | 1.0x | 1.0x | 1.0x |
| Memur | 1.1x | 1.1x | 1.1x | 1.1x | 1.1x |
| Öğrenci | 0.9x | 0.8x | 1.2x | 0.8x | 0.8x |
| Emekli | 1.1x | 1.1x | 1.0x | 1.2x | 1.0x |

**AI Konu Tespiti**: İçeriğin konusu otomatik tespit edilir ve meslek çarpanı uygulanır.

##### 2.3 Bölgesel Nüfuz Çarpanı (20% ağırlık)

İl bazında nüfus ve ekonomik faktör:

```python
def regional_influence(city, post_reach):
    # İl nüfus verileri
    population_score = city_population / 1_000_000  # Istanbul = 15.5, Ardahan = 0.1
    
    # Ekonomik faktör
    economic_score = city_gdp_per_capita / 50_000  # 0.5 - 2.0 arası
    
    # Paylaşımın erişimi
    if post_reach == "local":
        regional_factor = 1.0
    elif post_reach == "regional":
        regional_factor = 1.0 + (population_score * 0.1)
    elif post_reach == "national":
        regional_factor = 1.0 + (population_score * 0.2)
    
    return min(regional_factor * economic_score, 3.0)  # Max 3x
```

**İl Kategorileri**:
- **Mega Şehir**: İstanbul (1.5x)
- **Büyük Şehir**: Ankara, İzmir, Bursa (1.3x)
- **Orta Şehir**: 30+ büyük il (1.1x)
- **Küçük Şehir**: Diğerleri (1.0x)

##### 2.4 Geçmiş 90 Gün Etkileşim Ortalaması (15% ağırlık)

Kullanıcının son 90 gündeki ortalama performansı:

```python
def user_engagement_avg(user_id):
    # Son 90 gün içindeki postların ortalama puanı
    posts = get_user_posts_last_90_days(user_id)
    
    if len(posts) == 0:
        return 50  # Yeni kullanıcı varsayılanı
    
    avg_views = mean([p.views for p in posts])
    avg_likes = mean([p.likes for p in posts])
    avg_comments = mean([p.comments for p in posts])
    avg_shares = mean([p.shares for p in posts])
    
    engagement_score = (
        avg_views * 0.1 +
        avg_likes * 1.0 +
        avg_comments * 3.0 +
        avg_shares * 5.0
    )
    
    # Normalize: 0-300 arası
    return min(engagement_score / 10, 300)
```

##### 2.5 DM ve Etkileşim Sıklığı (5% ağırlık)

Platform içindeki sosyal aktiflik:

```python
def interaction_frequency(user_id):
    last_30_days = get_last_30_days()
    
    # DM aktivitesi
    dm_count = count_dms_sent(user_id, last_30_days)
    dm_score = min(dm_count * 0.5, 50)
    
    # Yorum aktivitesi
    comment_count = count_comments(user_id, last_30_days)
    comment_score = min(comment_count * 0.3, 50)
    
    # Cevap hızı (siyasetçiler için önemli)
    response_rate = calculate_response_rate(user_id)
    response_score = response_rate * 100  # 0-100
    
    return (dm_score + comment_score + response_score) / 3
```

##### 2.6 Paylaşım Özgünlük Oranı (5% ağırlık)

Kullanıcı orijinal içerik mi üretiyor, yoksa sadece paylaşım mı yapıyor?

```python
def originality_score(user_id):
    last_100_posts = get_user_last_100_posts(user_id)
    
    original_count = count_original_posts(last_100_posts)
    repost_count = count_reposts(last_100_posts)
    
    originality_ratio = original_count / (original_count + repost_count)
    
    # %80+ orijinal → 100 puan
    # %50 orijinal → 50 puan
    # %20 orijinal → 20 puan
    
    return originality_ratio * 100
```

#### K2 Hesaplama Örneği

```
Kullanıcı: Ahmet Yılmaz (Doktor, İzmir)
- Takipçi: 5,000 → 70 puan (30% ağırlık) = 21
- Meslek: Doktor, sağlık konusu → 2.5x → (25% × 2.5) = 62.5
- Bölge: İzmir → 1.3x → (20% × 1.3 × 100) = 26
- 90 gün ort: 150 puan → (15% × 150) = 22.5
- Etkileşim sıklığı: 70 → (5% × 70) = 3.5
- Özgünlük: 85% → (5% × 85) = 4.25

K2 = 21 + 62.5 + 26 + 22.5 + 3.5 + 4.25 = 139.75
```

---

### Katman 3: İçerik Türü (15%)

**Amaç**: İçeriğin format türüne göre değerlendirme.

#### İçerik Türü Çarpanları

| İçerik Türü | Temel Çarpan | Notlar |
|-------------|--------------|--------|
| **Metin** | 1.0x | Baseline |
| **Metin + Link** | 1.2x | Kaynak eklenmiş |
| **Fotoğraf** | 1.3x | Görsel içerik |
| **Fotoğraf Albümü** | 1.5x | Çoklu fotoğraf |
| **Video (Kısa)** | 1.8x | < 3 dakika |
| **Video (Uzun)** | 2.0x | > 3 dakika |
| **Canlı Yayın** | 3.0x | Gerçek zamanlı |
| **Anket** | 1.5x | Etkileşimli |
| **İnfografik** | 1.7x | Bilgi görselleştirme |
| **Belge/PDF** | 1.4x | Resmi doküman |
| **Konum Paylaşımı** | 1.3x | Yerel etkinlik |

#### İçerik Kalitesi Analizi

AI her içeriği kalite açısından da değerlendirir:

```python
def content_quality_analysis(content):
    # Metin analizi
    if content.type == "text":
        length_score = analyze_text_length(content.text)
        grammar_score = check_grammar(content.text)
        readability_score = calculate_readability(content.text)
        
        quality = (length_score + grammar_score + readability_score) / 3
    
    # Görsel analizi
    elif content.type in ["photo", "video"]:
        resolution_score = check_resolution(content.media)
        aesthetic_score = ai_aesthetic_analysis(content.media)
        relevance_score = check_text_image_relevance(content.text, content.media)
        
        quality = (resolution_score + aesthetic_score + relevance_score) / 3
    
    # Canlı yayın
    elif content.type == "live":
        duration_score = min(content.duration / 60, 100)  # Her dakika 1 puan, max 100
        viewer_retention = calculate_retention_rate(content)
        interaction_score = content.live_comments / content.duration
        
        quality = (duration_score + viewer_retention + interaction_score) / 3
    
    return quality  # 0-100 arası
```

#### Video İçerik Özel Metrikleri

Videolar için ek puanlama:

```python
def video_scoring(video):
    base_score = 1.8  # Kısa video
    
    # İzlenme oranı
    completion_rate = video.completed_views / video.total_views
    if completion_rate > 0.8:
        base_score *= 1.5
    elif completion_rate > 0.5:
        base_score *= 1.2
    
    # Yeniden izlenme
    rewatch_rate = video.rewatches / video.total_views
    base_score *= (1 + rewatch_rate * 0.5)
    
    # Ses açık oranı
    sound_on_rate = video.sound_on_views / video.total_views
    base_score *= (1 + sound_on_rate * 0.3)
    
    # Tam ekran oranı
    fullscreen_rate = video.fullscreen_views / video.total_views
    base_score *= (1 + fullscreen_rate * 0.2)
    
    return min(base_score, 3.5)  # Max 3.5x
```

#### Anket Özel Metrikleri

```python
def poll_scoring(poll):
    base_score = 1.5
    
    # Katılım oranı
    participation = poll.votes / poll.views
    base_score *= (1 + participation)
    
    # Seçenek dengesi (çok dengeli tartışma = daha ilginç)
    balance = calculate_option_balance(poll.results)
    if 0.3 < balance < 0.7:  # Dengeli sonuç
        base_score *= 1.3
    
    # Yorum oranı
    comment_rate = poll.comments / poll.votes
    base_score *= (1 + comment_rate * 0.5)
    
    return min(base_score, 2.5)  # Max 2.5x
```

#### K3 Hesaplama Örneği

```
Post: Video içerik (5 dakika)
- Tür: Uzun video → 2.0x
- Kalite: 85/100 → 1.85x
- Tamamlanma: %75 → 1.2x
- Yeniden izlenme: %15 → 1.075x
- Ses açık: %90 → 1.27x

K3 = 100 × 2.0 × 1.85 × 1.2 × 1.075 × 1.27 = 607
```

---

### Katman 4: Siyasi Gerilim Derecesi (25%)

**Amaç**: İçeriğin siyasi/sosyal önemi ve gerilim seviyesi.

Bu katman **tamamen AI tabanlı** çalışır.

#### AI İçerik Analiz Modeli

##### 4.1 Sentiment Analizi

```python
def sentiment_analysis(text):
    # Transformers modeli (BERT/GPT-4)
    sentiment_scores = ai_model.analyze(text)
    
    return {
        "positive": sentiment_scores.positive,      # 0-1
        "negative": sentiment_scores.negative,      # 0-1
        "neutral": sentiment_scores.neutral,        # 0-1
        "anger": sentiment_scores.anger,            # 0-1
        "joy": sentiment_scores.joy,                # 0-1
        "fear": sentiment_scores.fear,              # 0-1
        "sadness": sentiment_scores.sadness,        # 0-1
        "surprise": sentiment_scores.surprise       # 0-1
    }
```

##### 4.2 İçerik Kategorisi Tespiti

AI, içeriği otomatik olarak kategorize eder:

| Kategori | Açıklama | Çarpan |
|----------|----------|--------|
| **Destekleyici** | Bir parti/siyasetçiyi destekleyen | 1.2x |
| **Eleştirel** | Bir parti/siyasetçiyi eleştiren | 1.5x |
| **Tartışmalı** | İki taraflı tartışma yaratan | 1.8x |
| **Bilgilendirici** | Nötr bilgi paylaşımı | 1.0x |
| **Kriz/Afet** | Acil durum, afet, kriz | 2.5x |
| **Skandal** | Yolsuzluk, hukuk ihlali iddiası | 2.0x |
| **Reformist** | Yeni politika önerisi | 1.6x |
| **Gündem** | Güncel olaya yorum | 1.4x |

```python
def categorize_content(text):
    # AI classification
    category_probs = ai_classifier.predict(text)
    
    # En yüksek olasılıklı kategori
    main_category = max(category_probs, key=category_probs.get)
    
    return main_category, category_probs[main_category]
```

##### 4.3 Konu Önemi Skoru

Belirli konular daha yüksek puanlıdır:

| Konu | Açıklama | Öncelik | Çarpan |
|------|----------|---------|--------|
| **Ekonomi** | Enflasyon, işsizlik, büyüme | Yüksek | 2.0x |
| **Dış Politika** | Uluslararası ilişkiler | Yüksek | 1.8x |
| **Güvenlik** | Terör, sınır güvenliği | Yüksek | 2.2x |
| **Adalet** | Hukuk, mahkeme kararları | Yüksek | 1.9x |
| **Eğitim** | Okullar, üniversiteler | Orta | 1.4x |
| **Sağlık** | Hastaneler, ilaç politikası | Orta | 1.5x |
| **Çevre** | İklim, doğa koruma | Orta | 1.3x |
| **Spor** | Spor politikaları | Düşük | 1.1x |
| **Kültür** | Sanat, edebiyat | Düşük | 1.0x |

```python
def topic_importance(text):
    # Multi-label classification
    topics = ai_topic_classifier.predict(text)
    
    # En yüksek skorlu konuyu al
    primary_topic = max(topics, key=topics.get)
    
    importance_multiplier = TOPIC_MULTIPLIERS[primary_topic]
    
    return primary_topic, importance_multiplier
```

##### 4.4 Gündem Eşleşme Skoru

İçerik, o andaki gündemle ne kadar uyumlu?

```python
def trending_match_score(text, current_trends):
    # Extract keywords
    keywords = extract_keywords(text)
    
    # Güncel trendlerle eşleştir
    match_score = 0
    for trend in current_trends:
        if any(keyword in trend.keywords for keyword in keywords):
            match_score += trend.popularity_score
    
    # Normalize
    return min(match_score / 100, 2.0)  # Max 2x
```

##### 4.5 Parti Ekleme/Polarizasyon Skoru

İçerik ne kadar partizan?

```python
def polarization_score(text):
    # Parti adlarını tespit et
    mentioned_parties = detect_party_mentions(text)
    
    # Sentiment her parti için
    party_sentiments = {}
    for party in mentioned_parties:
        context = extract_party_context(text, party)
        sentiment = sentiment_analysis(context)
        party_sentiments[party] = sentiment
    
    # Polarizasyon = En yüksek pozitif - en yüksek negatif
    if len(party_sentiments) > 1:
        max_positive = max([s["positive"] for s in party_sentiments.values()])
        max_negative = max([s["negative"] for s in party_sentiments.values()])
        polarization = abs(max_positive - max_negative)
    else:
        polarization = 0.5
    
    # Yüksek polarizasyon = daha fazla etkileşim
    return 1.0 + polarization  # 1.0x - 2.0x
```

##### 4.6 Fact-Check Skoru (Doğruluk)

İçeriğin doğruluk derecesi:

```python
def fact_check_score(text):
    # Claim detection
    claims = extract_factual_claims(text)
    
    if len(claims) == 0:
        return 1.0  # Opinyon, iddia yok
    
    # Her iddiayı kontrol et
    verified_count = 0
    false_count = 0
    
    for claim in claims:
        verification = verify_claim(claim)  # External API + Database
        if verification == "TRUE":
            verified_count += 1
        elif verification == "FALSE":
            false_count += 1
    
    # Yanlış bilgi = puan kaybı
    if false_count > 0:
        penalty = 0.5 ** false_count  # Her yanlış için %50 azalma
        return penalty
    elif verified_count > 0:
        bonus = 1.0 + (verified_count * 0.1)  # Her doğru için +10%
        return min(bonus, 1.5)
    else:
        return 1.0
```

#### K4 Final Hesaplama

```python
def calculate_k4(post):
    # Temel analiz
    sentiment = sentiment_analysis(post.text)
    category, category_confidence = categorize_content(post.text)
    topic, topic_multiplier = topic_importance(post.text)
    trend_match = trending_match_score(post.text, get_current_trends())
    polarization = polarization_score(post.text)
    fact_score = fact_check_score(post.text)
    
    # Kategori çarpanı
    category_multiplier = CATEGORY_MULTIPLIERS[category]
    
    # Sentiment yoğunluğu
    sentiment_intensity = max(sentiment.values())
    
    # Kombinasyon
    k4_score = (
        100 *                           # Base
        category_multiplier *           # 1.0x - 2.5x
        topic_multiplier *              # 1.0x - 2.2x
        (1 + sentiment_intensity) *     # 1.0x - 2.0x
        trend_match *                   # 1.0x - 2.0x
        polarization *                  # 1.0x - 2.0x
        fact_score                      # 0.5x - 1.5x
    )
    
    return min(k4_score, 1000)  # Max 1000 puan
```

#### K4 Hesaplama Örneği

```
Post: "Enflasyon %60'ı geçti, hükümetin ekonomi politikası başarısız!"

Analiz:
- Sentiment: Negatif (0.85)
- Kategori: Eleştirel → 1.5x
- Konu: Ekonomi → 2.0x
- Trend: Gündemde (#1) → 1.8x
- Polarizasyon: Yüksek → 1.7x
- Fact-check: Doğru (enflasyon verileri) → 1.1x

K4 = 100 × 1.5 × 2.0 × 1.85 × 1.8 × 1.7 × 1.1 = 1,762
K4 (capped) = 1,000
```

---

### Katman 5: Zamanlama ve Trend Etkisi (15%)

**Amaç**: İçeriğin zamanlaması ve viral potansiyeli.

#### 5.1 Seçim Dönemi Çarpanı

```python
def election_period_multiplier():
    today = datetime.now()
    next_election = get_next_election_date()
    
    days_until = (next_election - today).days
    
    if days_until < 0:
        return 1.0  # Seçim geçti
    elif days_until <= 30:
        return 3.0  # Son 30 gün: Maksimum etkı
    elif days_until <= 90:
        return 2.0  # Son 3 ay
    elif days_until <= 180:
        return 1.5  # Son 6 ay
    elif days_until <= 365:
        return 1.2  # Son 1 yıl
    else:
        return 1.0  # Normal dönem
```

#### 5.2 Gündem Eşleşme Skoru

Güncel trendlerle ne kadar örtüşüyor?

```python
def agenda_match_score(post):
    current_trends = get_hourly_trends()  # Son 1 saatin trendleri
    
    post_keywords = extract_keywords(post.text)
    
    match_count = 0
    match_score = 0
    
    for trend in current_trends[:10]:  # Top 10 trend
        for keyword in post_keywords:
            if keyword in trend.keywords:
                match_count += 1
                match_score += trend.score * (11 - current_trends.index(trend)) / 10
                # #1 trend → 10/10, #10 trend → 1/10
    
    return min(match_score / 50, 2.0)  # Normalize, max 2x
```

#### 5.3 Viral Potansiyel Skoru

AI, içeriğin viral olma potansiyelini tahmin eder:

```python
def viral_potential(post):
    # Özellik vektörü
    features = {
        "author_followers": post.author.followers,
        "author_avg_engagement": post.author.avg_engagement,
        "content_type": post.content_type,
        "has_media": post.has_media,
        "has_hashtags": len(post.hashtags) > 0,
        "text_length": len(post.text),
        "sentiment_intensity": max(sentiment_analysis(post.text).values()),
        "topic_importance": topic_importance(post.text)[1],
        "posting_hour": post.created_at.hour,
        "posting_day": post.created_at.weekday()
    }
    
    # Pre-trained ML model (Gradient Boosting / Neural Network)
    viral_probability = viral_predictor_model.predict(features)
    
    return 1.0 + (viral_probability * 2.0)  # 1.0x - 3.0x
```

#### 5.4 Posting Time Optimization

Hangi saatte paylaşıldı?

```python
def posting_time_score(post_time):
    hour = post_time.hour
    day = post_time.weekday()
    
    # Saat bazlı (Türkiye saatine göre)
    if 8 <= hour < 10:       # Sabah trafiği
        hour_score = 1.3
    elif 12 <= hour < 14:    # Öğle arası
        hour_score = 1.5
    elif 17 <= hour < 20:    # Akşam prime time
        hour_score = 1.8
    elif 20 <= hour < 24:    # Gece prime time
        hour_score = 1.6
    elif 0 <= hour < 2:      # Gece kuşları
        hour_score = 1.2
    else:                     # Diğer saatler
        hour_score = 1.0
    
    # Gün bazlı
    if day < 5:              # Hafta içi
        day_score = 1.2
    else:                     # Hafta sonu
        day_score = 1.0
    
    return hour_score * day_score
```

#### 5.5 Son 5 Post Ağırlıkları

Kullanıcının son paylaşımları da mevcut paylaşımı etkiler:

```python
def recent_posts_effect(user_id, current_post):
    recent_posts = get_user_last_5_posts(user_id, exclude=current_post.id)
    
    if len(recent_posts) == 0:
        return 1.0
    
    # Ağırlıklar: 25%, 20%, 15%, 10%, 5%
    weights = [0.25, 0.20, 0.15, 0.10, 0.05]
    
    weighted_score = 0
    for i, post in enumerate(recent_posts):
        post_performance = post.politpuan / post.expected_puan  # Beklenen vs gerçek
        weighted_score += post_performance * weights[i]
    
    # Son postlar iyiyse → momentum bonusu
    # Son postlar kötüyse → ceza
    
    return max(0.5, min(weighted_score + 0.5, 2.0))  # 0.5x - 2.0x
```

#### 5.6 Hızlı Büyüme Bonusu (Momentum)

İlk saatlerde hızlı büyüme gösteriyorsa:

```python
def momentum_bonus(post):
    hours_since_post = (datetime.now() - post.created_at).seconds / 3600
    
    if hours_since_post < 1:
        expected_engagement = post.author.avg_first_hour_engagement
        actual_engagement = post.current_engagement
        
        if actual_engagement > expected_engagement * 2:
            return 2.0  # Beklenenden 2x fazla → Viral oluyor!
        elif actual_engagement > expected_engagement * 1.5:
            return 1.5
        elif actual_engagement > expected_engagement:
            return 1.2
        else:
            return 1.0
    else:
        return 1.0
```

#### K5 Final Hesaplama

```python
def calculate_k5(post):
    election_mult = election_period_multiplier()
    agenda_match = agenda_match_score(post)
    viral_potential_score = viral_potential(post)
    time_score = posting_time_score(post.created_at)
    recent_effect = recent_posts_effect(post.author_id, post)
    momentum = momentum_bonus(post)
    
    k5_score = (
        100 *
        election_mult *        # 1.0x - 3.0x
        agenda_match *         # 1.0x - 2.0x
        viral_potential_score * # 1.0x - 3.0x
        time_score *           # 1.0x - 1.8x
        recent_effect *        # 0.5x - 2.0x
        momentum               # 1.0x - 2.0x
    )
    
    return min(k5_score, 800)  # Max 800 puan
```

#### K5 Hesaplama Örneği

```
Post: Akşam 19:00'da paylaşıldı, seçime 45 gün var

Analiz:
- Seçim dönemi: 45 gün → 2.0x
- Gündem eşleşme: #2 trendde → 1.6x
- Viral potansiyel: %75 → 2.5x
- Posting time: 19:00, Salı → 1.8x × 1.2x = 2.16x
- Son 5 post: Performans ortalama → 1.1x
- Momentum: İlk saatte 2x beklenen → 2.0x

K5 = 100 × 2.0 × 1.6 × 2.5 × 2.16 × 1.1 × 2.0 = 3,801
K5 (capped) = 800
```

---

## Hesaplama Formülü

### Adım Adım PolitPuan Hesabı

```python
def calculate_politpuan(post, user):
    # 1. Her katmanı hesapla
    k1 = calculate_k1(post)          # Temel etkileşim
    k2 = calculate_k2(user)          # Kullanıcı profili
    k3 = calculate_k3(post)          # İçerik türü
    k4 = calculate_k4(post)          # Siyasi gerilim
    k5 = calculate_k5(post)          # Zamanlama
    
    # 2. Ağırlıklı toplam
    base_score = (
        k1 * 0.25 +
        k2 * 0.20 +
        k3 * 0.15 +
        k4 * 0.25 +
        k5 * 0.15
    )
    
    # 3. Rol çarpanını uygula
    role_multiplier = get_role_multiplier(user.role)
    
    # 4. Zaman azalması (eski içerikler değer kaybeder)
    time_decay = calculate_time_decay(post.created_at)
    
    # 5. Final skor
    final_score = base_score * role_multiplier * time_decay
    
    # 6. Anti-spam ve güvenlik kontrolleri
    final_score = apply_spam_penalty(final_score, post, user)
    final_score = apply_fake_account_penalty(final_score, user)
    
    return round(final_score, 2)
```

### Zaman Azalması (Time Decay)

Eski içerikler feed'den kaybolmalı:

```python
def calculate_time_decay(post_date):
    hours_passed = (datetime.now() - post_date).seconds / 3600
    days_passed = (datetime.now() - post_date).days
    
    if days_passed < 1:
        # İlk 24 saat: Minimal azalma
        return 1.0 - (hours_passed * 0.01)  # Saatte %1 azalma
    elif days_passed < 3:
        # 1-3 gün: Orta azalma
        return 0.76 - (days_passed - 1) * 0.15  # Günde %15
    elif days_passed < 7:
        # 3-7 gün: Hızlı azalma
        return 0.46 - (days_passed - 3) * 0.08  # Günde %8
    elif days_passed < 30:
        # 1 hafta - 1 ay: Çok yavaş azalma (arşiv değeri)
        return 0.14 - (days_passed - 7) * 0.005
    else:
        # 1 ay+: Minimum (tarihi değer)
        return 0.05
```

### Spam ve Sahte Hesap Cezaları

```python
def apply_spam_penalty(score, post, user):
    # Aynı içeriği çok paylaşıyorsa
    if is_duplicate_content(post, user):
        score *= 0.1
    
    # Çok fazla hashtag
    if len(post.hashtags) > 10:
        score *= 0.5
    
    # Çok fazla mention
    if len(post.mentions) > 20:
        score *= 0.3
    
    # Link spam
    if post.external_links and is_suspicious_domain(post.external_links):
        score *= 0.1
    
    return score

def apply_fake_account_penalty(score, user):
    # Bot detection skoru
    bot_probability = bot_detector.predict(user)
    
    if bot_probability > 0.8:
        score *= 0.01  # Neredeyse sıfırla
    elif bot_probability > 0.5:
        score *= 0.3
    elif bot_probability > 0.3:
        score *= 0.7
    
    # Fake follower oranı
    fake_follower_ratio = detect_fake_followers(user) / user.followers
    if fake_follower_ratio > 0.5:
        score *= (1 - fake_follower_ratio)
    
    return score
```

---

## Örnekler

### Örnek 1: Sıradan Vatandaş Paylaşımı

**Kullanıcı**: Mehmet, Doğrulanmış Vatandaş, Öğretmen, Ankara
- Takipçi: 250
- 90 gün ort: 30 etkileşim

**Post**: "Okulumuzun bahçesini çocuklarla birlikte boyadık 🎨" + 3 fotoğraf
- Paylaşım saati: 14:00, Çarşamba
- Zaman: Seçime 120 gün var

**Hesaplama**:

```
K1 (Etkileşim):
- Görüntüleme: 150 × 0.1 = 15
- Beğeni: 45 × 1.0 = 45
- Yorum: 8 × 4.0 = 32
- Kaydetme: 3 × 2.0 = 6
Toplam: 98 × 1.2 (zaman) = 117.6

K2 (Profil):
- Takipçi: 250 → 30 × 0.3 = 9
- Meslek: Öğretmen, eğitim konusu → 2.0x × 0.25 = 50
- Bölge: Ankara → 1.3x × 0.2 × 100 = 26
- 90 gün ort: 30 × 0.15 = 4.5
- Diğer: 10
Toplam: 99.5

K3 (İçerik):
- Fotoğraf albümü: 1.5x
- Kalite: 75/100
Toplam: 100 × 1.5 × 0.75 = 112.5

K4 (Gerilim):
- Kategori: Bilgilendirici → 1.0x
- Konu: Eğitim → 1.4x
- Sentiment: Pozitif (0.9)
Toplam: 100 × 1.0 × 1.4 × 1.9 = 266

K5 (Zamanlama):
- Seçim: 120 gün → 1.2x
- Gündem: Eğitimle ilgili yok → 1.0x
- Posting time: 14:00 → 1.5x
- Viral: Düşük → 1.1x
Toplam: 100 × 1.2 × 1.0 × 1.5 × 1.1 = 198

PolitPuan = (117.6 × 0.25) + (99.5 × 0.20) + (112.5 × 0.15) + (266 × 0.25) + (198 × 0.15)
          = 29.4 + 19.9 + 16.875 + 66.5 + 29.7
          = 162.375

Rol çarpanı: 1.0x (Doğrulanmış Vatandaş)
Zaman azalması: 1.0 (yeni post)

Final: 162.38 PolitPuan
```

---

### Örnek 2: Milletvekili Kritik Paylaşım

**Kullanıcı**: Ayşe Demir, Milletvekili, İstanbul
- Takipçi: 150,000
- 90 gün ort: 5,000 etkileşim

**Post**: "Mecliste sunduğumuz ekonomik reform paketinin detayları" + 10 dakikalık video
- Paylaşım saati: 20:00, Salı
- Zaman: Seçime 25 gün var
- İçerik: Ekonomi reformu açıklaması

**Hesaplama**:

```
K1 (Etkileşim):
- Görüntüleme: 50,000 × 0.1 = 5,000
- Beğeni: 2,500 × 1.0 = 2,500
- Yorum: 450 × 5.0 = 2,250
- Paylaşım: 320 × 5.0 = 1,600
- Video izlenme: 600 saniye ort × 0.5 = 300
Toplam: 11,650 × 2.0 (ilk saat momentum) = 23,300

K2 (Profil):
- Takipçi: 150K → 290 × 0.3 = 87
- Meslek: Milletvekili, ekonomi → 2.5x × 0.25 = 62.5
- Bölge: İstanbul → 1.5x × 0.2 × 100 = 30
- 90 gün ort: 300 × 0.15 = 45
- Diğer: 20
Toplam: 244.5

K3 (İçerik):
- Video uzun: 2.0x
- Kalite: 95/100
- Tamamlanma: %85 → 1.5x
Toplam: 100 × 2.0 × 0.95 × 1.5 = 285

K4 (Gerilim):
- Kategori: Reformist → 1.6x
- Konu: Ekonomi → 2.0x
- Gündem: #1 → 1.8x
- Polarizasyon: Orta → 1.4x
Toplam: 100 × 1.6 × 2.0 × 1.8 × 1.4 = 806.4

K5 (Zamanlama):
- Seçim: 25 gün → 3.0x
- Gündem: #1 trend → 2.0x
- Posting time: 20:00 Salı → 1.6x × 1.2 = 1.92x
- Viral: Yüksek → 2.8x
Toplam: 100 × 3.0 × 2.0 × 1.92 × 2.8 = 3,225
(Capped at 800)

PolitPuan = (23,300 × 0.25) + (244.5 × 0.20) + (285 × 0.15) + (806.4 × 0.25) + (800 × 0.15)
          = 5,825 + 48.9 + 42.75 + 201.6 + 120
          = 6,238.25

Rol çarpanı: 4.0x (Milletvekili)
Zaman azalması: 1.0 (yeni post)

Final: 24,953 PolitPuan
```

---

### Örnek 3: Gazeteci Breaking News

**Kullanıcı**: Can Yılmaz, Gazeteci, Ulusal Medya
- Takipçi: 85,000

**Post**: "SON DAKİKA: Merkez Bankası faiz kararını açıkladı" + Canlı yayın (45 dakika)
- Zaman: Gündemin zirvesi
- İzleyici: 25,000 canlı

```
K1 (Etkileşim):
- Canlı izleyici: 25,000 × 2.0 = 50,000
- Beğeni: 8,500
- Yorum (canlı): 1,200 × 5 = 6,000
- Paylaşım: 950 × 5 = 4,750
Toplam: 69,250

K2: 220

K3 (İçerik):
- Canlı yayın: 3.0x
- Süre: 45 dakika → 1.8x
Toplam: 100 × 3.0 × 1.8 = 540

K4 (Gerilim):
- Kategori: Kriz/Gündem → 2.5x
- Konu: Ekonomi → 2.0x
- Gündem: #1 → 2.0x
Toplam: 100 × 2.5 × 2.0 × 2.0 = 1000

K5: 800 (capped)

PolitPuan = (69,250 × 0.25) + (220 × 0.20) + (540 × 0.15) + (1000 × 0.25) + (800 × 0.15)
          = 17,312.5 + 44 + 81 + 250 + 120
          = 17,807.5

Rol çarpanı: 2.5x
Final: 44,519 PolitPuan
```

---

## AI Entegrasyonu

### Kullanılan AI Modelleri

#### 1. NLP Modelleri

```python
# Sentiment Analysis
model_sentiment = AutoModelForSequenceClassification.from_pretrained(
    "savasy/bert-base-turkish-sentiment-cased"
)

# Topic Classification
model_topic = AutoModelForSequenceClassification.from_pretrained(
    "dbmdz/bert-base-turkish-cased"
)

# Named Entity Recognition (Parti, Siyasetçi tespiti)
model_ner = AutoModelForTokenClassification.from_pretrained(
    "xlm-roberta-large-finetuned-conll03-english"
)

# Content Moderation
model_moderation = OpenAI.Moderation()

# Fake News Detection
model_fakenews = CustomBERTClassifier.load("models/fakenews_detector.pth")
```

#### 2. Computer Vision (Görsel İçerik)

```python
# Image Quality Assessment
model_quality = NIMA_VGG16.load("models/nima_vgg16.pth")

# Content Detection (Uygunsuz içerik)
model_nsfw = NSFWDetector.load("models/nsfw_detector.h5")

# OCR (Görsellerdeki metin)
model_ocr = TrOCR.from_pretrained("microsoft/trocr-base-handwritten")

# Face Recognition (Siyasetçi tespiti)
model_face = FaceNet.load("models/politician_faces.h5")
```

#### 3. Öneri Sistemi

```python
# Collaborative Filtering
model_collab = NeuralCollaborativeFiltering(num_users, num_items)

# Content-Based Filtering
model_content = SentenceTransformers("sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2")

# Hybrid Recommender
model_hybrid = HybridRecommender(model_collab, model_content)
```

#### 4. Viral Prediction

```python
# Gradient Boosting Model
model_viral = xgboost.XGBRegressor()
model_viral.load_model("models/viral_predictor.json")

# Features: 50+ özellik
# Target: 24 saat sonraki etkileşim sayısı
```

---

## Gerçek Zamanlı Güncelleme

### Event-Driven Architecture

PolitPuan gerçek zamanlı hesaplanır ve güncellenir:

```python
# Event yakalama
@event_listener("post.liked")
def on_post_liked(event):
    post = Post.get(event.post_id)
    recalculate_politpuan_async(post)
    update_feed_rankings(post)

@event_listener("post.commented")
def on_post_commented(event):
    post = Post.get(event.post_id)
    comment_quality = analyze_comment_quality(event.comment)
    recalculate_politpuan_async(post, comment_bonus=comment_quality)
    update_feed_rankings(post)

@event_listener("post.shared")
def on_post_shared(event):
    original_post = Post.get(event.post_id)
    recalculate_politpuan_async(original_post, share_bonus=True)
    create_share_chain(original_post, event.user_id)
```

### Cache Stratejisi

Performans için akıllı cache:

```python
# Redis cache structure
cache_keys = {
    "politpuan:{post_id}": "Final PolitPuan score",
    "k1:{post_id}": "Katman 1 detayı",
    "k2:{user_id}": "Katman 2 (user profili - 1 saatte bir güncelle)",
    "k4:{post_id}": "Katman 4 (AI analiz - bir kez hesapla)",
    "trending:hourly": "Saatlik trend listesi",
    "feed:{user_id}": "Personalized feed cache (5 dk)"
}

# TTL stratejisi
TTL = {
    "politpuan": 300,      # 5 dakika (sık güncellenen)
    "k2": 3600,            # 1 saat (user profili yavaş değişir)
    "k4": None,            # Kalıcı (içerik değişmez)
    "trending": 300,       # 5 dakika
    "feed": 300            # 5 dakika
}
```

### Batch Update

Masif güncellemeler için batch işlem:

```python
@celery.task
def batch_recalculate_politpuan(post_ids):
    """
    Her 5 dakikada bir çalışır
    Son 5 dakikada etkileşim alan tüm postları günceller
    """
    posts = Post.filter(id__in=post_ids)
    
    for post in posts:
        new_score = calculate_politpuan(post, post.author)
        post.politpuan = new_score
        post.save()
    
    # Feed'leri güncelle
    affected_users = get_users_who_saw_these_posts(post_ids)
    for user in affected_users:
        invalidate_feed_cache(user.id)
```

---

## Performans Optimizasyonu

### Hesaplama Maliyeti

| Katman | Maliyet | Optimizasyon |
|--------|---------|--------------|
| K1 | Düşük | SQL aggregate, real-time |
| K2 | Orta | Cached (1 saat) |
| K3 | Düşük | İçerik türü static |
| K4 | **Yüksek** | AI analiz, bir kez hesapla, cache |
| K5 | Orta | Partial real-time + cache |

### AI İnference Optimizasyonu

```python
# Batch inference (daha hızlı)
@batch_processor(batch_size=32, max_wait=1.0)
def ai_analyze_content_batch(texts):
    return model.predict(texts)

# GPU kullanımı
device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
model.to(device)

# Quantization (daha hızlı inference)
model = torch.quantization.quantize_dynamic(
    model, {torch.nn.Linear}, dtype=torch.qint8
)

# Model caching
@lru_cache(maxsize=10000)
def get_topic_embedding(text):
    return model_content.encode(text)
```

---

## Sonuç

PolitPuan algoritması, 5 farklı boyutta içeriği analiz ederek **adil**, **şeffaf** ve **etkili** bir puanlama sistemi sunar. AI destekli analiz sayesinde hem içeriğin kalitesini hem de sosyal/politik önemini ölçer.

**Özet**:
- ✅ 5 katman × Ağırlıklar = Comprehensive scoring
- ✅ AI powered = Akıllı analiz
- ✅ Real-time = Dinamik güncelleme
- ✅ Fair = Bot/spam koruması
- ✅ Transparent = Her katman görülebilir

---

**Sonraki Dokümantasyon**: [03-DATA-MODEL.md](./03-DATA-MODEL.md)
