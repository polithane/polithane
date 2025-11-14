# 🤖 AI ve Analitik Sistemleri

## 📋 İçindekiler

1. [AI Modelleri](#ai-modelleri)
2. [Öneri Sistemi](#öneri-sistemi)
3. [İçerik Analiz Sistemi](#içerik-analiz-sistemi)
4. [Sentiment Analysis](#sentiment-analysis)
5. [Trend Tahmin Sistemi](#trend-tahmin-sistemi)
6. [Fact-Check Sistemi](#fact-check-sistemi)
7. [Bot Detection](#bot-detection)
8. [Content Moderation](#content-moderation)
9. [Analitik Dashboard Detayları](#analitik-dashboard-detayları)

---

## AI Modelleri

### Kullanılan AI/ML Stack

```yaml
NLP Modelleri:
  - Turkish BERT: "dbmdz/bert-base-turkish-cased"
  - Sentiment: "savasy/bert-base-turkish-sentiment-cased"
  - NER: "xlm-roberta-large"
  - GPT-4 API: İçerik üretimi için

Computer Vision:
  - CLIP: "openai/clip-vit-large-patch14"
  - NSFW Detection: "Falconsai/nsfw_image_detection"
  - Face Recognition: "facenet-pytorch"

Recommender Systems:
  - Collaborative Filtering: Neural Collaborative Filtering
  - Content-Based: Sentence Transformers
  - Hybrid: Custom ensemble

Time Series:
  - LSTM: Trend prediction
  - Prophet: Seasonality detection
  - XGBoost: Classification tasks

Infrastructure:
  - Training: PyTorch + Hugging Face
  - Inference: TorchServe / TensorFlow Serving
  - GPU: NVIDIA A100 (cloud)
  - Feature Store: Feast
```

---

## Öneri Sistemi

### Hybrid Recommendation Engine

Üç farklı yaklaşımın kombinasyonu:

#### 1. Collaborative Filtering

Benzer kullanıcıların beğendiği içerikleri öner.

```python
class NeuralCollaborativeFiltering(nn.Module):
    def __init__(self, num_users, num_posts, embedding_dim=128):
        super().__init__()
        
        self.user_embedding = nn.Embedding(num_users, embedding_dim)
        self.post_embedding = nn.Embedding(num_posts, embedding_dim)
        
        self.fc_layers = nn.Sequential(
            nn.Linear(embedding_dim * 2, 256),
            nn.ReLU(),
            nn.Dropout(0.3),
            nn.Linear(256, 128),
            nn.ReLU(),
            nn.Dropout(0.3),
            nn.Linear(128, 1),
            nn.Sigmoid()
        )
    
    def forward(self, user_ids, post_ids):
        user_emb = self.user_embedding(user_ids)
        post_emb = self.post_embedding(post_ids)
        
        x = torch.cat([user_emb, post_emb], dim=1)
        output = self.fc_layers(x)
        
        return output

# Training
model = NeuralCollaborativeFiltering(num_users=1_000_000, num_posts=10_000_000)
optimizer = torch.optim.Adam(model.parameters(), lr=0.001)
criterion = nn.BCELoss()

# User-Post interactions (like, save, share)
for user_ids, post_ids, labels in train_loader:
    predictions = model(user_ids, post_ids)
    loss = criterion(predictions, labels)
    
    optimizer.zero_grad()
    loss.backward()
    optimizer.step()
```

#### 2. Content-Based Filtering

İçeriğin özelliklerine göre benzer içerikleri öner.

```python
from sentence_transformers import SentenceTransformer

class ContentBasedRecommender:
    def __init__(self):
        self.model = SentenceTransformer('sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2')
        self.post_embeddings = {}
    
    def embed_post(self, post):
        """Post içeriğini vektöre çevir"""
        text = f"{post.content} {' '.join(post.hashtags)}"
        embedding = self.model.encode(text)
        return embedding
    
    def find_similar_posts(self, post_id, top_k=10):
        """Benzer postları bul"""
        query_embedding = self.post_embeddings[post_id]
        
        # Cosine similarity
        similarities = {}
        for pid, emb in self.post_embeddings.items():
            if pid != post_id:
                sim = cosine_similarity(query_embedding, emb)
                similarities[pid] = sim
        
        # Top-K
        similar_posts = sorted(similarities.items(), key=lambda x: x[1], reverse=True)[:top_k]
        return similar_posts
    
    def user_based_recommendations(self, user_id, top_k=20):
        """Kullanıcının beğendiği postlara benzer postları öner"""
        user_liked_posts = get_user_likes(user_id)
        
        recommendations = {}
        for post_id in user_liked_posts:
            similar = self.find_similar_posts(post_id, top_k=5)
            for pid, score in similar:
                recommendations[pid] = recommendations.get(pid, 0) + score
        
        # Sırala ve top-K al
        sorted_recs = sorted(recommendations.items(), key=lambda x: x[1], reverse=True)[:top_k]
        return [pid for pid, score in sorted_recs]
```

#### 3. Hybrid Approach

İki yaklaşımı birleştir:

```python
class HybridRecommender:
    def __init__(self, collab_model, content_model):
        self.collab_model = collab_model
        self.content_model = content_model
        
        # Ağırlıklar (optimize edilebilir)
        self.collab_weight = 0.6
        self.content_weight = 0.4
    
    def recommend(self, user_id, top_k=20):
        # Collaborative filtering skorları
        collab_scores = self.collab_model.predict_for_user(user_id)
        
        # Content-based skorları
        content_scores = self.content_model.user_based_recommendations(user_id, top_k=100)
        
        # Normalize
        collab_scores = normalize(collab_scores)
        content_scores = normalize(content_scores)
        
        # Weighted combination
        hybrid_scores = {}
        all_posts = set(collab_scores.keys()) | set(content_scores.keys())
        
        for post_id in all_posts:
            collab_score = collab_scores.get(post_id, 0)
            content_score = content_scores.get(post_id, 0)
            
            hybrid_scores[post_id] = (
                self.collab_weight * collab_score +
                self.content_weight * content_score
            )
        
        # PolitPuan ile boost
        for post_id in hybrid_scores:
            politpuan = get_post_politpuan(post_id)
            hybrid_scores[post_id] *= (1 + log(politpuan + 1) / 10)
        
        # Diversity injection (aynı tip içerik çok fazla olmasın)
        final_recommendations = diversify(hybrid_scores, top_k)
        
        return final_recommendations
```

### Kişiselleştirme Faktörleri

```python
def personalize_feed(user, candidate_posts):
    """
    Kullanıcıya özel ağırlıklandırma
    """
    scores = {}
    
    for post in candidate_posts:
        score = post.politpuan_total
        
        # 1. Kullanıcının ilgi alanları
        topic_match = calculate_topic_match(user.interests, post.ai_topic)
        score *= (1 + topic_match)
        
        # 2. Takip edilen kişilerden mi?
        if post.author_id in user.following:
            score *= 2.0
        
        # 3. Aynı partiden mi?
        if user.party_id and user.party_id == post.author_party_id:
            score *= 1.5
        
        # 4. Aynı şehirden mi?
        if user.city_id == post.author_city_id:
            score *= 1.3
        
        # 5. Kullanıcının geçmiş etkileşimleri
        past_interaction_score = get_past_interaction_score(user.id, post.author_id)
        score *= (1 + past_interaction_score)
        
        # 6. Yenilik bonusu (taze içerik)
        hours_old = (now() - post.created_at).hours
        if hours_old < 3:
            score *= 1.5
        elif hours_old < 24:
            score *= 1.2
        
        # 7. Diversity penalty (aynı yazardan çok fazla içerik olmasın)
        same_author_count = count_same_author_in_feed(feed, post.author_id)
        if same_author_count > 2:
            score *= 0.5
        
        scores[post.id] = score
    
    # Sırala
    sorted_posts = sorted(scores.items(), key=lambda x: x[1], reverse=True)
    return sorted_posts
```

---

## İçerik Analiz Sistemi

### Otomatik Konu Tespiti

```python
class TopicClassifier:
    def __init__(self):
        self.model = AutoModelForSequenceClassification.from_pretrained(
            "dbmdz/bert-base-turkish-cased",
            num_labels=15  # 15 farklı konu
        )
        self.tokenizer = AutoTokenizer.from_pretrained("dbmdz/bert-base-turkish-cased")
        
        self.topics = [
            'ekonomi', 'eğitim', 'sağlık', 'güvenlik', 'dış_politika',
            'adalet', 'çevre', 'ulaşım', 'tarım', 'teknoloji',
            'spor', 'kültür', 'enerji', 'sosyal_politika', 'diğer'
        ]
    
    def predict(self, text):
        inputs = self.tokenizer(text, return_tensors="pt", truncation=True, max_length=512)
        outputs = self.model(**inputs)
        
        probabilities = torch.softmax(outputs.logits, dim=1)[0]
        
        # En yüksek 3 konu
        top_3 = torch.topk(probabilities, 3)
        
        results = []
        for idx, prob in zip(top_3.indices, top_3.values):
            results.append({
                'topic': self.topics[idx],
                'probability': prob.item()
            })
        
        return results

# Kullanım
classifier = TopicClassifier()
topics = classifier.predict("Enflasyon %60'ı aştı, ekonomik tedbirler acilen alınmalı")
# [{'topic': 'ekonomi', 'probability': 0.95}, ...]
```

### Named Entity Recognition (Siyasetçi/Parti Tespiti)

```python
class PoliticalNER:
    def __init__(self):
        self.model = AutoModelForTokenClassification.from_pretrained("xlm-roberta-large")
        self.tokenizer = AutoTokenizer.from_pretrained("xlm-roberta-large")
        
        # Custom entity database
        self.politician_db = load_politician_database()
        self.party_db = load_party_database()
    
    def extract_entities(self, text):
        # NER inference
        inputs = self.tokenizer(text, return_tensors="pt")
        outputs = self.model(**inputs)
        
        # Entity extraction
        entities = []
        current_entity = []
        
        for token, label in zip(inputs['input_ids'][0], outputs.logits[0].argmax(dim=1)):
            if label == 1:  # PERSON
                current_entity.append(token)
            elif current_entity:
                entity_text = self.tokenizer.decode(current_entity)
                
                # Database ile eşleştir
                politician = self.match_politician(entity_text)
                if politician:
                    entities.append({
                        'type': 'politician',
                        'text': entity_text,
                        'id': politician.id,
                        'name': politician.full_name,
                        'party': politician.party
                    })
                
                current_entity = []
        
        # Parti isimleri için simple keyword matching
        for party in self.party_db:
            if party.name.lower() in text.lower():
                entities.append({
                    'type': 'party',
                    'text': party.name,
                    'id': party.id
                })
        
        return entities

# Kullanım
ner = PoliticalNER()
entities = ner.extract_entities("Cumhurbaşkanı Erdoğan ve CHP lideri Kılıçdaroğlu bugün görüştü")
# [
#   {'type': 'politician', 'name': 'Recep Tayyip Erdoğan', ...},
#   {'type': 'party', 'name': 'CHP', ...}
# ]
```

---

## Sentiment Analysis

### Duygu Analizi ve Duygu Yoğunluğu

```python
class SentimentAnalyzer:
    def __init__(self):
        self.model = AutoModelForSequenceClassification.from_pretrained(
            "savasy/bert-base-turkish-sentiment-cased"
        )
        self.tokenizer = AutoTokenizer.from_pretrained("savasy/bert-base-turkish-sentiment-cased")
    
    def analyze(self, text):
        inputs = self.tokenizer(text, return_tensors="pt", truncation=True, max_length=512)
        outputs = self.model(**inputs)
        
        probs = torch.softmax(outputs.logits, dim=1)[0]
        
        # 0: negative, 1: neutral, 2: positive
        result = {
            'negative': probs[0].item(),
            'neutral': probs[1].item(),
            'positive': probs[2].item()
        }
        
        # Dominant sentiment
        dominant = max(result, key=result.get)
        confidence = result[dominant]
        
        # Intensity score (얼마나 güçlü?)
        intensity = abs(result['positive'] - result['negative'])
        
        return {
            'sentiments': result,
            'dominant': dominant,
            'confidence': confidence,
            'intensity': intensity
        }

# Kullanım
analyzer = SentimentAnalyzer()
result = analyzer.analyze("Bu ekonomik politika kesinlikle yanlış ve zararlı!")
# {
#   'sentiments': {'negative': 0.92, 'neutral': 0.05, 'positive': 0.03},
#   'dominant': 'negative',
#   'confidence': 0.92,
#   'intensity': 0.89
# }
```

### Çok Duygulu Analiz (Ekman's 6 Basic Emotions)

```python
class EmotionDetector:
    def __init__(self):
        # Fine-tuned model for Turkish emotions
        self.model = load_emotion_model()
    
    def detect_emotions(self, text):
        """
        Ekman'ın 6 temel duygusunu tespit et:
        anger, disgust, fear, happiness, sadness, surprise
        """
        embeddings = self.model.encode(text)
        emotions = self.model.predict_emotions(embeddings)
        
        return {
            'anger': emotions[0],      # Öfke
            'disgust': emotions[1],    # Tiksinme
            'fear': emotions[2],       # Korku
            'happiness': emotions[3],  # Mutluluk
            'sadness': emotions[4],    # Üzüntü
            'surprise': emotions[5]    # Şaşkınlık
        }

# Kullanım
detector = EmotionDetector()
emotions = detector.detect_emotions("Bu karar beni çok üzdü ve korkuttu")
# {'anger': 0.25, 'disgust': 0.10, 'fear': 0.65, 'happiness': 0.02, 'sadness': 0.75, 'surprise': 0.15}
```

---

## Trend Tahmin Sistemi

### Viral Olma Tahmin Modeli

```python
class ViralPredictor:
    def __init__(self):
        # Gradient Boosting model
        self.model = xgboost.XGBRegressor()
        self.model.load_model('models/viral_predictor.json')
    
    def extract_features(self, post, user):
        """Post ve kullanıcıdan 50+ özellik çıkar"""
        features = {
            # Author features
            'author_followers': user.followers_count,
            'author_politpuan': user.politpuan_total,
            'author_avg_engagement': user.avg_engagement_rate,
            'author_post_count': user.posts_count,
            'author_role_level': user.role_level,
            
            # Content features
            'content_length': len(post.content),
            'has_media': 1 if post.media_urls else 0,
            'media_type': encode_media_type(post.media_type),
            'hashtag_count': len(post.hashtags),
            'mention_count': len(post.mentions),
            'has_link': 1 if 'http' in post.content else 0,
            
            # AI features
            'sentiment_intensity': post.ai_sentiment_intensity,
            'topic_importance': get_topic_importance(post.ai_topic),
            'gerilim_score': post.ai_gerilim_score,
            
            # Temporal features
            'posting_hour': post.created_at.hour,
            'posting_day': post.created_at.weekday(),
            'is_weekend': 1 if post.created_at.weekday() >= 5 else 0,
            
            # Trend features
            'trending_topic_match': calculate_trend_match(post),
            'is_election_period': is_election_period(),
            
            # Historical features
            'author_recent_avg_likes': get_recent_avg_likes(user.id),
            'author_recent_avg_shares': get_recent_avg_shares(user.id)
        }
        
        return np.array(list(features.values())).reshape(1, -1)
    
    def predict_24h_engagement(self, post, user):
        """24 saat sonraki tahmini etkileşim"""
        features = self.extract_features(post, user)
        predicted_engagement = self.model.predict(features)[0]
        
        # Viral probability (eşik: normal etkileşimin 5x'i)
        normal_engagement = user.avg_engagement_rate * user.followers_count
        viral_threshold = normal_engagement * 5
        
        viral_probability = min(predicted_engagement / viral_threshold, 1.0)
        
        return {
            'predicted_likes': int(predicted_engagement * 0.5),
            'predicted_comments': int(predicted_engagement * 0.1),
            'predicted_shares': int(predicted_engagement * 0.15),
            'viral_probability': viral_probability
        }

# Kullanım
predictor = ViralPredictor()
prediction = predictor.predict_24h_engagement(post, user)
# {
#   'predicted_likes': 2500,
#   'predicted_comments': 450,
#   'predicted_shares': 320,
#   'viral_probability': 0.85
# }
```

### Trend Forecast (LSTM)

```python
class TrendForecaster:
    def __init__(self):
        self.model = self.build_lstm_model()
    
    def build_lstm_model(self):
        model = nn.Sequential(
            nn.LSTM(input_size=10, hidden_size=64, num_layers=2, batch_first=True),
            nn.Linear(64, 32),
            nn.ReLU(),
            nn.Linear(32, 1)
        )
        return model
    
    def prepare_sequence(self, topic_history, window=24):
        """
        Son 24 saatlik veriyi sequence'e çevir
        """
        features = []
        for hour_data in topic_history[-window:]:
            features.append([
                hour_data['mention_count'],
                hour_data['unique_users'],
                hour_data['politpuan_sum'],
                hour_data['sentiment_positive'],
                hour_data['sentiment_negative'],
                # ... diğer özellikler
            ])
        
        return torch.tensor(features).unsqueeze(0)
    
    def forecast_next_hours(self, topic, hours=24):
        """
        Bir konunun gelecek saatlerdeki trend seviyesini tahmin et
        """
        topic_history = get_topic_history(topic, hours=168)  # 7 gün
        sequence = self.prepare_sequence(topic_history)
        
        predictions = []
        for _ in range(hours):
            with torch.no_grad():
                next_value = self.model(sequence)
                predictions.append(next_value.item())
                
                # Sequence'i güncelle (sliding window)
                sequence = update_sequence(sequence, next_value)
        
        return predictions

# Kullanım
forecaster = TrendForecaster()
forecast = forecaster.forecast_next_hours('#ekonomi', hours=24)
# [1250, 1320, 1450, 1580, ...] (tahmini mention sayıları)
```

---

## Fact-Check Sistemi

### Otomatik Claim Detection

```python
class ClaimDetector:
    def __init__(self):
        self.model = load_claim_detection_model()
    
    def extract_claims(self, text):
        """
        Metinden doğrulanabilir iddialar çıkar
        """
        sentences = split_sentences(text)
        claims = []
        
        for sentence in sentences:
            # Claim olma olasılığı
            is_claim_prob = self.model.predict_claim_probability(sentence)
            
            if is_claim_prob > 0.7:
                claim_type = self.classify_claim_type(sentence)
                claims.append({
                    'text': sentence,
                    'type': claim_type,  # 'statistical', 'factual', 'opinion'
                    'confidence': is_claim_prob
                })
        
        return claims
    
    def classify_claim_type(self, claim):
        # İstatistik içeriyor mu?
        if re.search(r'\d+[%₺]|\d+\.\d+', claim):
            return 'statistical'
        
        # Kişi/kurum ismi var mı?
        elif has_named_entities(claim):
            return 'factual'
        
        else:
            return 'opinion'

# Kullanım
detector = ClaimDetector()
claims = detector.extract_claims(
    "Enflasyon %60'ı geçti. Hükümet bu konuda hiçbir şey yapmıyor. Bu çok kötü bir durum."
)
# [
#   {'text': 'Enflasyon %60'ı geçti', 'type': 'statistical', 'confidence': 0.95},
#   {'text': 'Hükümet bu konuda hiçbir şey yapmıyor', 'type': 'opinion', 'confidence': 0.65}
# ]
```

### Fact Verification

```python
class FactVerifier:
    def __init__(self):
        self.search_engine = GoogleSearchAPI()
        self.official_sources = load_official_sources()  # TÜİK, TCMB, vs.
        self.fact_check_db = load_fact_check_database()
    
    async def verify_claim(self, claim):
        """
        İddiayı doğrula
        """
        # 1. Daha önce kontrol edilmiş mi?
        cached_result = self.fact_check_db.find(claim)
        if cached_result:
            return cached_result
        
        # 2. Resmi kaynaklardan veri çek
        if claim['type'] == 'statistical':
            official_data = await self.fetch_official_data(claim)
            if official_data:
                verdict = self.compare_with_official(claim, official_data)
                return {
                    'claim': claim['text'],
                    'verdict': verdict,  # 'TRUE', 'FALSE', 'MOSTLY_TRUE', 'MISLEADING'
                    'source': official_data['source'],
                    'evidence': official_data['data'],
                    'confidence': official_data['confidence']
                }
        
        # 3. Web search ve fact-check siteleri
        search_results = await self.search_engine.search(claim['text'] + " fact check")
        fact_check_articles = self.filter_fact_check_sources(search_results)
        
        if fact_check_articles:
            consensus = self.analyze_consensus(fact_check_articles)
            return consensus
        
        # 4. Doğrulanamadı
        return {
            'claim': claim['text'],
            'verdict': 'UNVERIFIED',
            'source': None,
            'confidence': 0.0
        }
    
    async def fetch_official_data(self, claim):
        """
        TÜİK, TCMB gibi resmi kaynaklardan veri çek
        """
        if 'enflasyon' in claim['text'].lower():
            # TÜİK API'sinden enflasyon verisi
            data = await TUIK_API.get_latest_inflation()
            return {
                'source': 'TÜİK',
                'data': data,
                'confidence': 1.0
            }
        
        elif 'faiz' in claim['text'].lower():
            # TCMB API'si
            data = await TCMB_API.get_latest_interest_rate()
            return {
                'source': 'TCMB',
                'data': data,
                'confidence': 1.0
            }
        
        return None

# Kullanım
verifier = FactVerifier()
result = await verifier.verify_claim({
    'text': 'Enflasyon %60'ı geçti',
    'type': 'statistical'
})
# {
#   'claim': 'Enflasyon %60'ı geçti',
#   'verdict': 'TRUE',
#   'source': 'TÜİK',
#   'evidence': {'rate': 61.53, 'date': '2024-10'},
#   'confidence': 1.0
# }
```

---

## Bot Detection

### Sahte Hesap ve Bot Tespiti

```python
class BotDetector:
    def __init__(self):
        self.model = load_bot_detection_model()
    
    def analyze_user(self, user):
        """
        Kullanıcının bot olma olasılığını hesapla
        """
        features = self.extract_bot_features(user)
        bot_probability = self.model.predict_proba(features)[0][1]
        
        return {
            'bot_probability': bot_probability,
            'is_bot': bot_probability > 0.7,
            'risk_factors': self.identify_risk_factors(features, user)
        }
    
    def extract_bot_features(self, user):
        """
        Bot tespiti için 30+ özellik
        """
        features = {
            # Profil özellikleri
            'has_profile_photo': 1 if user.avatar_url else 0,
            'has_bio': 1 if user.bio else 0,
            'bio_length': len(user.bio) if user.bio else 0,
            'default_avatar': is_default_avatar(user.avatar_url),
            
            # Aktivite patterns
            'account_age_days': (now() - user.created_at).days,
            'posts_per_day': user.posts_count / max((now() - user.created_at).days, 1),
            'avg_posting_interval': calculate_avg_posting_interval(user.id),
            'posting_hour_variance': calculate_posting_hour_variance(user.id),
            
            # Sosyal özellikler
            'follower_following_ratio': user.followers_count / max(user.following_count, 1),
            'has_suspicious_followers': detect_suspicious_followers(user.id),
            'mutual_connections': count_mutual_connections(user.id),
            
            # İçerik özellikleri
            'avg_content_length': calculate_avg_content_length(user.id),
            'content_repetition_rate': detect_content_repetition(user.id),
            'external_link_ratio': calculate_external_link_ratio(user.id),
            'hashtag_spam_score': calculate_hashtag_spam_score(user.id),
            
            # Etkileşim patterns
            'engagement_rate': user.avg_engagement_rate,
            'engagement_variance': calculate_engagement_variance(user.id),
            'sudden_follower_spikes': detect_follower_spikes(user.id),
            
            # Temporal patterns
            'posts_at_night_ratio': count_posts_at_night(user.id) / user.posts_count,
            'consistent_posting_pattern': is_posting_too_consistent(user.id)
        }
        
        return np.array(list(features.values())).reshape(1, -1)
    
    def identify_risk_factors(self, features, user):
        """
        Bot olma riskini artıran faktörleri belirle
        """
        risks = []
        
        if user.posts_per_day > 50:
            risks.append("Çok yüksek paylaşım sıklığı")
        
        if user.follower_following_ratio < 0.1:
            risks.append("Anormal takipçi/takip oranı")
        
        if features['content_repetition_rate'] > 0.7:
            risks.append("Yüksek içerik tekrarı")
        
        if features['consistent_posting_pattern'] > 0.9:
            risks.append("Otomasyon benzeri düzenli paylaşım")
        
        if user.account_age_days < 7 and user.posts_count > 100:
            risks.append("Yeni hesap, çok fazla aktivite")
        
        return risks

# Kullanım
detector = BotDetector()
result = detector.analyze_user(user)
# {
#   'bot_probability': 0.85,
#   'is_bot': True,
#   'risk_factors': [
#     'Çok yüksek paylaşım sıklığı',
#     'Otomasyon benzeri düzenli paylaşım'
#   ]
# }
```

---

## Content Moderation

### Otomatik Moderasyon

```python
class ContentModerator:
    def __init__(self):
        self.nsfw_detector = load_nsfw_model()
        self.hate_speech_detector = load_hate_speech_model()
        self.violence_detector = load_violence_model()
        self.spam_detector = load_spam_model()
    
    def moderate_content(self, post):
        """
        İçeriği otomatik olarak moderate et
        """
        flags = []
        severity_scores = {}
        
        # Text moderation
        if post.content:
            text_moderation = self.moderate_text(post.content)
            flags.extend(text_moderation['flags'])
            severity_scores.update(text_moderation['scores'])
        
        # Image moderation
        if post.media_urls and any('.jpg' in url or '.png' in url for url in post.media_urls):
            image_moderation = self.moderate_images(post.media_urls)
            flags.extend(image_moderation['flags'])
            severity_scores.update(image_moderation['scores'])
        
        # Decision
        max_severity = max(severity_scores.values()) if severity_scores else 0
        
        if max_severity > 0.9:
            action = 'AUTO_REMOVE'
        elif max_severity > 0.7:
            action = 'MANUAL_REVIEW'
        elif max_severity > 0.5:
            action = 'FLAG'
        else:
            action = 'APPROVE'
        
        return {
            'action': action,
            'flags': flags,
            'severity_scores': severity_scores,
            'max_severity': max_severity
        }
    
    def moderate_text(self, text):
        flags = []
        scores = {}
        
        # Hate speech
        hate_score = self.hate_speech_detector.predict(text)
        if hate_score > 0.7:
            flags.append('HATE_SPEECH')
            scores['hate_speech'] = hate_score
        
        # Violence
        violence_score = self.violence_detector.predict(text)
        if violence_score > 0.7:
            flags.append('VIOLENCE')
            scores['violence'] = violence_score
        
        # Spam
        spam_score = self.spam_detector.predict(text)
        if spam_score > 0.7:
            flags.append('SPAM')
            scores['spam'] = spam_score
        
        # Profanity
        if contains_profanity(text):
            flags.append('PROFANITY')
            scores['profanity'] = 0.8
        
        return {'flags': flags, 'scores': scores}
    
    def moderate_images(self, image_urls):
        flags = []
        scores = {}
        
        for url in image_urls:
            image = load_image(url)
            
            # NSFW detection
            nsfw_score = self.nsfw_detector.predict(image)
            if nsfw_score > 0.7:
                flags.append('NSFW')
                scores[f'nsfw_{url}'] = nsfw_score
            
            # Violence detection
            violence_score = self.violence_detector.predict_image(image)
            if violence_score > 0.7:
                flags.append('GRAPHIC_VIOLENCE')
                scores[f'violence_{url}'] = violence_score
        
        return {'flags': flags, 'scores': scores}
```

---

## Analitik Dashboard Detayları

### Gerçek Zamanlı Metrikler

```python
class RealtimeAnalytics:
    def __init__(self, redis_client):
        self.redis = redis_client
    
    def track_event(self, event_type, user_id, data):
        """
        Gerçek zamanlı event tracking
        """
        event = {
            'type': event_type,
            'user_id': user_id,
            'timestamp': time.time(),
            'data': data
        }
        
        # Redis stream'e yaz
        self.redis.xadd(f'events:{event_type}', event)
        
        # Counters güncelle
        self.update_counters(event_type, user_id, data)
    
    def update_counters(self, event_type, user_id, data):
        """
        Redis counters güncelle
        """
        now = datetime.now()
        
        # Saatlik counter
        hour_key = f'stats:{event_type}:hourly:{now.strftime("%Y%m%d%H")}'
        self.redis.incr(hour_key)
        self.redis.expire(hour_key, 86400 * 7)  # 7 gün sakla
        
        # Günlük counter
        day_key = f'stats:{event_type}:daily:{now.strftime("%Y%m%d")}'
        self.redis.incr(day_key)
        self.redis.expire(day_key, 86400 * 90)  # 90 gün sakla
        
        # Kullanıcı bazlı
        user_key = f'stats:user:{user_id}:{event_type}'
        self.redis.incr(user_key)
    
    def get_realtime_stats(self, metric, period='1h'):
        """
        Gerçek zamanlı istatistikleri al
        """
        if period == '1h':
            keys = [f'stats:{metric}:hourly:{(datetime.now() - timedelta(hours=i)).strftime("%Y%m%d%H")}'
                    for i in range(1)]
        elif period == '24h':
            keys = [f'stats:{metric}:hourly:{(datetime.now() - timedelta(hours=i)).strftime("%Y%m%d%H")}'
                    for i in range(24)]
        elif period == '7d':
            keys = [f'stats:{metric}:daily:{(datetime.now() - timedelta(days=i)).strftime("%Y%m%d")}'
                    for i in range(7)]
        
        values = [int(self.redis.get(key) or 0) for key in keys]
        
        return {
            'total': sum(values),
            'average': sum(values) / len(values),
            'timeline': list(zip(keys, values))
        }
```

### Dashboard API Endpoints

```python
@app.get("/api/analytics/overview")
async def get_analytics_overview(user_id: int, period: str = "30d"):
    """
    Kullanıcı analitik genel bakış
    """
    # PolitPuan trend
    politpuan_history = get_politpuan_history(user_id, period)
    
    # Takipçi analizi
    follower_growth = get_follower_growth(user_id, period)
    follower_demographics = get_follower_demographics(user_id)
    
    # İçerik performansı
    top_posts = get_top_posts(user_id, period, limit=10)
    content_type_breakdown = get_content_type_breakdown(user_id, period)
    
    # Etkileşim analizi
    engagement_rate = calculate_engagement_rate(user_id, period)
    engagement_by_time = get_engagement_by_time(user_id, period)
    
    # Sentiment
    sentiment_breakdown = get_sentiment_breakdown(user_id, period)
    
    # Coğrafi dağılım
    geographic_distribution = get_geographic_distribution(user_id)
    
    return {
        'politpuan': {
            'current': politpuan_history[-1]['value'],
            'change': calculate_change(politpuan_history),
            'timeline': politpuan_history
        },
        'followers': {
            'total': follower_growth[-1]['value'],
            'new': calculate_new(follower_growth, period),
            'demographics': follower_demographics,
            'timeline': follower_growth
        },
        'content': {
            'top_posts': top_posts,
            'type_breakdown': content_type_breakdown
        },
        'engagement': {
            'rate': engagement_rate,
            'by_time': engagement_by_time
        },
        'sentiment': sentiment_breakdown,
        'geography': geographic_distribution
    }
```

---

**Sonraki Dokümantasyon**: [07-TECHNICAL-ARCHITECTURE.md](./07-TECHNICAL-ARCHITECTURE.md)
