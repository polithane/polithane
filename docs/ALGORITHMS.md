# Algoritma Detayları

## PolitPuan Hesaplama Algoritması

### Modüler Fonksiyon Şeması

```typescript
function calculatePolitPuan(user: User, posts: Post[]): number {
  const layer1 = calculateLayer1_BasicInteraction(posts);
  const layer2 = calculateLayer2_UserInfluenceProfile(user);
  const layer3 = calculateLayer3_ContentType(posts);
  const layer4 = calculateLayer4_PoliticalTension(posts);
  const layer5 = calculateLayer5_TimingTrend(posts);
  
  const weights = {
    layer1: 0.25,
    layer2: 0.20,
    layer3: 0.15,
    layer4: 0.20,
    layer5: 0.20
  };
  
  const finalScore = 
    layer1 * weights.layer1 +
    layer2 * weights.layer2 +
    layer3 * weights.layer3 +
    layer4 * weights.layer4 +
    layer5 * weights.layer5;
  
  // Apply role multiplier
  const roleMultiplier = getRoleMultiplier(user.role);
  
  return finalScore * roleMultiplier;
}

// Layer 1: Basic Interaction
function calculateLayer1_BasicInteraction(posts: Post[]): number {
  const weights = [0.25, 0.20, 0.15, 0.10, 0.05]; // Last 5 posts
  const recentPosts = posts.slice(-5).reverse();
  
  let score = 0;
  
  recentPosts.forEach((post, index) => {
    const postScore = 
      post.likeCount * 1 +
      post.commentCount * 3 +
      post.shareCount * 5 +
      post.viewCount * 0.1;
    
    score += postScore * weights[index];
  });
  
  return score;
}

// Layer 2: User Influence Profile
function calculateLayer2_UserInfluenceProfile(user: User): number {
  // Follower score
  const followerScore = Math.log10(user.followerCount + 1) * 10;
  
  // Profession multiplier
  const professionMultiplier = getProfessionMultiplier(user.profession);
  
  // Regional influence
  const regionalMultiplier = getRegionalMultiplier(user.cityId);
  
  // 90-day average engagement
  const avgEngagement = calculate90DayAverage(user);
  
  // DM frequency
  const dmScore = (user.dmCount / 30) * 2;
  
  // Originality ratio
  const originalityRatio = user.originalPostCount / user.totalPostCount;
  const originalityScore = originalityRatio * 20;
  
  return (
    followerScore * professionMultiplier * regionalMultiplier +
    avgEngagement * 0.5 +
    dmScore +
    originalityScore
  );
}

// Layer 3: Content Type
function calculateLayer3_ContentType(posts: Post[]): number {
  const multipliers = {
    TEXT: 1.0,
    PHOTO: 1.3,
    VIDEO: 1.8,
    LIVE: 3.0,
    POLL: 1.5,
    DOCUMENT: 1.2
  };
  
  let totalScore = 0;
  
  posts.forEach(post => {
    const baseScore = calculatePostBaseScore(post);
    const multiplier = multipliers[post.type];
    totalScore += baseScore * multiplier;
  });
  
  return totalScore / posts.length;
}

// Layer 4: Political Tension
function calculateLayer4_PoliticalTension(posts: Post[]): number {
  const categoryMultipliers = {
    SUPPORTIVE: 1.0,
    INFORMATIVE: 1.2,
    CRITICAL: 1.5,
    CONTROVERSIAL: 2.0,
    CRISIS: 2.5
  };
  
  const topicMultipliers = {
    ECONOMY: 0.5,
    FOREIGN_POLICY: 0.5,
    SECURITY: 0.5,
    EDUCATION: 0.3,
    HEALTH: 0.3,
    ENVIRONMENT: 0.3,
    CULTURE: 0.2,
    SPORTS: 0.1,
    OTHER: 0.2
  };
  
  let totalScore = 0;
  
  posts.forEach(post => {
    const categoryMultiplier = categoryMultipliers[post.category] || 1.0;
    const topicMultiplier = 1 + (topicMultipliers[post.topicCategory] || 0);
    const tensionScore = post.tensionScore || 0;
    
    const postScore = (post.engagementScore || 0) * categoryMultiplier * topicMultiplier * (1 + tensionScore);
    totalScore += postScore;
  });
  
  return totalScore / posts.length;
}

// Layer 5: Timing and Trend
function calculateLayer5_TimingTrend(posts: Post[]): number {
  const isElectionPeriod = checkElectionPeriod();
  const electionMultiplier = isElectionPeriod ? 1.5 : 1.0;
  
  let totalScore = 0;
  
  posts.forEach(post => {
    // Agenda match score
    const agendaMatchScore = calculateAgendaMatch(post) * 30;
    
    // Viral potential
    const viralScore = (post.viralPotential || 0) * 25;
    
    // Time multiplier
    const timeMultiplier = getTimeMultiplier(post.createdAt);
    
    const postScore = (agendaMatchScore + viralScore) * timeMultiplier;
    totalScore += postScore;
  });
  
  return (totalScore / posts.length) * electionMultiplier;
}

// Helper Functions
function getRoleMultiplier(role: UserRole): number {
  const multipliers = {
    CITIZEN: 0.5,
    VERIFIED_CITIZEN: 1.0,
    PARTY_MEMBER: 1.2,
    POLITICIAN_DISTRICT: 1.5,
    POLITICIAN_CITY: 2.0,
    POLITICIAN_NATIONAL: 2.5,
    MP: 3.0,
    JOURNALIST: 1.8,
    DISTRICT_CHAIRMAN: 2.0,
    CITY_CHAIRMAN: 2.5,
    WOMEN_BRANCH: 1.8,
    YOUTH_BRANCH: 1.8,
    PARTY_ADMIN: 3.5,
    SYSTEM_ADMIN: 0 // Not included in scoring
  };
  
  return multipliers[role] || 1.0;
}

function getProfessionMultiplier(profession?: string): number {
  const multipliers: Record<string, number> = {
    'teacher': 1.2,
    'doctor': 1.3,
    'farmer': 1.1,
    'public_servant': 1.15,
    'academic': 1.25,
    'business': 1.1
  };
  
  return multipliers[profession?.toLowerCase() || ''] || 1.0;
}

function getRegionalMultiplier(cityId: string): number {
  const majorCities = ['istanbul', 'ankara', 'izmir'];
  const bigCities = ['bursa', 'antalya', 'adana', 'gaziantep', 'konya'];
  
  // This would be looked up from database
  if (majorCities.includes(cityId)) return 1.5;
  if (bigCities.includes(cityId)) return 1.3;
  return 1.0;
}

function getTimeMultiplier(createdAt: Date): number {
  const now = new Date();
  const diffHours = (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60);
  
  if (diffHours < 1) return 1.5;
  if (diffHours < 24) return 1.2;
  return 1.0;
}
```

## AI İçerik Analizi Algoritması

### Sentiment Analysis
```python
# Using BERT-based model
def analyze_sentiment(text: str) -> dict:
    model = load_bert_model('turkish-sentiment')
    result = model.predict(text)
    
    return {
        'score': result.score,  # -1 to 1
        'label': result.label,  # positive/negative/neutral
        'confidence': result.confidence
    }
```

### Tension Detection
```python
def detect_tension(text: str, context: dict) -> float:
    # Keywords for high tension
    tension_keywords = [
        'kriz', 'protesto', 'savaş', 'çatışma', 'skandal',
        'istifa', 'yolsuzluk', 'suçlama', 'tehdit'
    ]
    
    keyword_score = sum(1 for kw in tension_keywords if kw in text.lower()) / len(tension_keywords)
    
    # Sentiment score (negative = higher tension)
    sentiment_score = abs(min(analyze_sentiment(text)['score'], 0))
    
    # Context score (election period, crisis events)
    context_score = context.get('is_crisis_period', 0) * 0.3
    
    return min(keyword_score * 0.4 + sentiment_score * 0.4 + context_score, 1.0)
```

### Partisanship Detection
```python
def detect_partisanship(text: str, user_party: str) -> float:
    # Party keywords and mentions
    party_keywords = load_party_keywords()
    
    # Count mentions of different parties
    party_mentions = {}
    for party, keywords in party_keywords.items():
        count = sum(1 for kw in keywords if kw in text.lower())
        party_mentions[party] = count
    
    # If user's party mentioned positively, lower partisanship
    # If other parties mentioned negatively, higher partisanship
    total_mentions = sum(party_mentions.values())
    if total_mentions == 0:
        return 0.0
    
    user_party_ratio = party_mentions.get(user_party, 0) / total_mentions
    return 1.0 - user_party_ratio  # Higher if other parties mentioned more
```

## Öneri Sistemi Algoritması

### TF-IDF + Embedding Model
```python
from sklearn.feature_extraction.text import TfidfVectorizer
from sentence_transformers import SentenceTransformer

class ContentRecommendationSystem:
    def __init__(self):
        self.tfidf = TfidfVectorizer(max_features=5000)
        self.embedder = SentenceTransformer('paraphrase-multilingual-MiniLM-L12-v2')
        self.user_profiles = {}
        self.content_embeddings = {}
    
    def build_user_profile(self, user_id: str, interactions: list):
        # Get all posts user interacted with
        interacted_posts = [i.post for i in interactions]
        
        # TF-IDF vectorization
        texts = [p.content for p in interacted_posts]
        tfidf_matrix = self.tfidf.fit_transform(texts)
        
        # Average TF-IDF vector
        user_tfidf = tfidf_matrix.mean(axis=0)
        
        # Embedding vectors
        embeddings = self.embedder.encode(texts)
        user_embedding = embeddings.mean(axis=0)
        
        self.user_profiles[user_id] = {
            'tfidf': user_tfidf,
            'embedding': user_embedding,
            'preferred_categories': self._extract_categories(interacted_posts),
            'preferred_topics': self._extract_topics(interacted_posts)
        }
    
    def recommend_content(self, user_id: str, available_posts: list, top_k: int = 10):
        if user_id not in self.user_profiles:
            return self._get_trending_posts(available_posts, top_k)
        
        user_profile = self.user_profiles[user_id]
        scores = []
        
        for post in available_posts:
            # TF-IDF similarity
            post_tfidf = self.tfidf.transform([post.content])
            tfidf_sim = cosine_similarity(user_profile['tfidf'], post_tfidf)[0][0]
            
            # Embedding similarity
            post_embedding = self.embedder.encode([post.content])[0]
            embedding_sim = cosine_similarity([user_profile['embedding']], [post_embedding])[0][0]
            
            # Category match
            category_match = 1.0 if post.category in user_profile['preferred_categories'] else 0.5
            
            # Topic match
            topic_match = 1.0 if post.topicCategory in user_profile['preferred_topics'] else 0.5
            
            # PolitPuan boost
            politpuan_boost = post.politPuan / 1000  # Normalize
            
            # Final score
            score = (
                tfidf_sim * 0.3 +
                embedding_sim * 0.3 +
                category_match * 0.15 +
                topic_match * 0.15 +
                politpuan_boost * 0.1
            )
            
            scores.append((post, score))
        
        # Sort by score and return top K
        scores.sort(key=lambda x: x[1], reverse=True)
        return [post for post, score in scores[:top_k]]
```

## Graph Neural Network (Ağ Etkisi Analizi)

```python
import torch
import torch.nn as nn
from torch_geometric.nn import GCNConv

class InfluenceGNN(nn.Module):
    def __init__(self, num_features, hidden_dim, num_classes):
        super(InfluenceGNN, self).__init__()
        self.conv1 = GCNConv(num_features, hidden_dim)
        self.conv2 = GCNConv(hidden_dim, hidden_dim)
        self.classifier = nn.Linear(hidden_dim, num_classes)
    
    def forward(self, x, edge_index):
        # Node features: user attributes, post counts, etc.
        x = self.conv1(x, edge_index)
        x = torch.relu(x)
        x = self.conv2(x, edge_index)
        x = torch.relu(x)
        
        # Predict influence score
        return self.classifier(x)

# Usage for predicting viral potential
def predict_viral_potential(post: Post, user_network: Graph):
    # Build graph from user's network
    node_features = extract_node_features(user_network)
    edge_index = build_edge_index(user_network)
    
    # Predict
    model = InfluenceGNN(num_features=128, hidden_dim=64, num_classes=1)
    viral_score = model(node_features, edge_index)
    
    return viral_score.item()
```
