# 🧠 PolitPuan Süper Algoritması - Detaylı Dokümantasyon

## Genel Bakış

PolitPuan, 5 katmanlı bir puanlama sistemidir. Her katman farklı bir boyutu ölçer ve sonuçlar birleştirilerek final skor oluşturulur.

## Matematiksel Formül

```
Final PolitPuan = Base Score × Rol Çarpanı

Base Score = (K1 × 0.25) + (K2 × 0.20) + (K3 × 0.15) + (K4 × 0.20) + (K5 × 0.20)

K1 = Katman 1: Temel Etkileşim Puanı
K2 = Katman 2: Kullanıcının Genel Etki Profili
K3 = Katman 3: İçeriğin Türü
K4 = Katman 4: İçeriğin Siyasi Gerilim Derecesi
K5 = Katman 5: Zamanlama ve Trend Etkisi
```

## Katman 1: Temel Etkileşim Puanı

### Hesaplama Yöntemi

Son 5 post'un ağırlıklı ortalaması alınır.

```typescript
interface PostInteraction {
  postId: string;
  likes: number;
  comments: number;
  shares: number;
  saves: number;
  createdAt: Date;
}

function calculateLayer1(posts: PostInteraction[]): number {
  // Son 5 post'u al (zaman sırasına göre)
  const recentPosts = posts
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    .slice(0, 5);

  // Her post için puan hesapla
  const postScores = recentPosts.map(post => {
    return (post.likes * 1) + 
           (post.comments * 3) + 
           (post.shares * 5) + 
           (post.saves * 2);
  });

  // Ağırlıklı ortalama
  const weights = [0.25, 0.20, 0.15, 0.10, 0.05];
  let totalScore = 0;
  
  for (let i = 0; i < postScores.length; i++) {
    totalScore += postScores[i] * weights[i];
  }

  // Eksik postlar için 0 ağırlık
  if (postScores.length < 5) {
    const missingPosts = 5 - postScores.length;
    for (let i = 0; i < missingPosts; i++) {
      totalScore += 0 * weights[postScores.length + i];
    }
  }

  return totalScore;
}
```

### Normalizasyon

Katman 1 skoru 0-1000 aralığına normalize edilir:

```typescript
function normalizeLayer1(score: number): number {
  // Logaritmik normalizasyon
  return Math.min(1000, Math.log10(score + 1) * 100);
}
```

---

## Katman 2: Kullanıcının Genel Etki Profili

### Bileşenler ve Hesaplamalar

#### 2.1. Takipçi Sayısı Skoru

```typescript
function calculateFollowerScore(followerCount: number): number {
  // Logaritmik ölçekleme
  // 10M+ takipçi = 1.0
  return Math.min(1.0, Math.log10(followerCount + 1) / 10);
}
```

**Örnekler:**
- 100 takipçi → 0.20
- 1,000 takipçi → 0.30
- 10,000 takipçi → 0.40
- 100,000 takipçi → 0.50
- 1,000,000 takipçi → 0.60
- 10,000,000+ takipçi → 1.0

#### 2.2. Meslek Katsayısı

```typescript
const PROFESSION_MULTIPLIERS: Record<string, number> = {
  'teacher': 1.2,
  'doctor': 1.3,
  'lawyer': 1.4,
  'farmer': 1.1,
  'public_servant': 1.15,
  'worker': 1.0,
  'retired': 0.9,
  'student': 0.8,
  'other': 1.0
};

function getProfessionMultiplier(profession: string): number {
  return PROFESSION_MULTIPLIERS[profession] || 1.0;
}
```

#### 2.3. Bölgesel Nüfuz Çarpanı

```typescript
const REGIONAL_MULTIPLIERS: Record<string, number> = {
  'istanbul': 1.5,
  'ankara': 1.4,
  'izmir': 1.3,
  'metropolitan': 1.2, // Büyükşehir
  'province': 1.0,      // İl
  'district': 0.9,      // İlçe
  'rural': 0.8          // Kırsal
};

function getRegionalMultiplier(location: {
  city: string;
  type: 'metropolitan' | 'province' | 'district' | 'rural';
}): number {
  const cityMultiplier = REGIONAL_MULTIPLIERS[location.city.toLowerCase()] || 1.0;
  const typeMultiplier = REGIONAL_MULTIPLIERS[location.type] || 1.0;
  
  // İki çarpanın ortalaması
  return (cityMultiplier + typeMultiplier) / 2;
}
```

#### 2.4. Geçmiş 90 Gün Etkileşim Ortalaması

```typescript
interface DailyInteraction {
  date: Date;
  interactions: number; // Toplam beğeni + yorum + paylaşım
}

function calculateInteractionScore(
  dailyInteractions: DailyInteraction[]
): number {
  const last90Days = dailyInteractions.filter(
    interaction => {
      const daysDiff = (Date.now() - interaction.date.getTime()) / (1000 * 60 * 60 * 24);
      return daysDiff <= 90;
    }
  );

  const totalInteractions = last90Days.reduce(
    (sum, day) => sum + day.interactions, 
    0
  );
  
  const averageDaily = totalInteractions / 90;
  
  // Normalize: 100 etkileşim/gün = 1.0, max 1.5
  return Math.min(1.5, averageDaily / 100);
}
```

#### 2.5. DM Yazışma Sıklığı

```typescript
function calculateDMScore(dmCount: number): number {
  // Logaritmik ölçekleme
  // 10,000 DM = 1.2x
  return Math.min(1.2, Math.log10(dmCount + 1) / 5);
}
```

#### 2.6. Paylaşımların Özgünlük Oranı

```typescript
function calculateOriginalityScore(
  totalPosts: number,
  originalPosts: number
): number {
  if (totalPosts === 0) return 1.0;
  
  const originalityRatio = originalPosts / totalPosts;
  
  // Özgünlük oranı × 1.3 (max)
  return Math.min(1.3, originalityRatio * 1.3);
}
```

### Katman 2 Final Hesaplama

```typescript
interface UserProfile {
  followerCount: number;
  profession: string;
  location: {
    city: string;
    type: 'metropolitan' | 'province' | 'district' | 'rural';
  };
  dailyInteractions: DailyInteraction[];
  dmCount: number;
  totalPosts: number;
  originalPosts: number;
}

function calculateLayer2(profile: UserProfile): number {
  const followerScore = calculateFollowerScore(profile.followerCount);
  const professionMultiplier = getProfessionMultiplier(profile.profession);
  const regionalMultiplier = getRegionalMultiplier(profile.location);
  const interactionScore = calculateInteractionScore(profile.dailyInteractions);
  const dmScore = calculateDMScore(profile.dmCount);
  const originalityScore = calculateOriginalityScore(
    profile.totalPosts, 
    profile.originalPosts
  );

  // Ağırlıklı toplam
  const score = (
    followerScore * 0.3 +
    professionMultiplier * 0.2 +
    regionalMultiplier * 0.2 +
    interactionScore * 0.15 +
    dmScore * 0.1 +
    originalityScore * 0.05
  );

  // Normalize to 0-1000
  return Math.min(1000, score * 500);
}
```

---

## Katman 3: İçeriğin Türü

### İçerik Türü Çarpanları

```typescript
enum ContentType {
  TEXT = 'text',
  IMAGE = 'image',
  VIDEO = 'video',
  LIVE = 'live',
  POLL = 'poll',
  LINK = 'link',
  DOCUMENT = 'document'
}

const CONTENT_TYPE_MULTIPLIERS: Record<ContentType, number> = {
  [ContentType.TEXT]: 1.0,
  [ContentType.IMAGE]: 1.3,
  [ContentType.VIDEO]: 1.8,
  [ContentType.LIVE]: 3.0,
  [ContentType.POLL]: 1.5,
  [ContentType.LINK]: 1.1,
  [ContentType.DOCUMENT]: 1.2
};

function calculateLayer3(contentType: ContentType): number {
  const multiplier = CONTENT_TYPE_MULTIPLIERS[contentType];
  
  // Base score 100, çarpanla çarp
  return 100 * multiplier;
}
```

---

## Katman 4: İçeriğin Siyasi Gerilim Derecesi (AI Analiz)

### AI Model Mimarisi

**Model:** Fine-tuned BERT for Turkish (BERTurk)

**Input:**
- İçerik metni
- Görsel OCR metni (varsa)
- Video transkript (varsa)
- Metadata (konum, zaman, kullanıcı)

**Output:**
```typescript
interface AIAnalysis {
  sentiment: {
    label: 'positive' | 'neutral' | 'negative' | 'aggressive';
    score: number; // 0-1 confidence
  };
  topic: {
    category: string;
    subcategory?: string;
    confidence: number;
  };
  controversy: {
    score: number; // 0-1
    factors: string[];
  };
  tension: {
    level: 'low' | 'medium' | 'high' | 'critical';
    score: number; // 0-1
  };
  politicalAlignment?: {
    score: number; // -1 (sol) to +1 (sağ)
    confidence: number;
  };
}
```

### Sentiment Çarpanları

```typescript
const SENTIMENT_MULTIPLIERS = {
  'positive': 1.0,
  'neutral': 1.1,
  'negative': 1.5,
  'aggressive': 2.0
};
```

### Konu Kategorisi Çarpanları

```typescript
const TOPIC_MULTIPLIERS: Record<string, number> = {
  'economy': 1.8,
  'foreign_policy': 1.7,
  'security': 2.0,
  'education': 1.3,
  'health': 1.4,
  'environment': 1.2,
  'culture': 1.1,
  'sports': 0.9,
  'technology': 1.0,
  'social': 1.2
};
```

### Tartışma Potansiyeli Çarpanları

```typescript
function getControversyMultiplier(controversyScore: number): number {
  if (controversyScore < 0.3) return 1.0;      // Düşük
  if (controversyScore < 0.6) return 1.3;    // Orta
  if (controversyScore < 0.8) return 1.8;   // Yüksek
  return 2.5;                                // Çok Yüksek
}
```

### Kriz/Afet Çarpanı

```typescript
function getCrisisMultiplier(hasCrisis: boolean, hasDisaster: boolean): number {
  if (hasDisaster) return 3.0;
  if (hasCrisis) return 2.5;
  return 1.0;
}
```

### Katman 4 Final Hesaplama

```typescript
function calculateLayer4(aiAnalysis: AIAnalysis): number {
  const sentimentMultiplier = SENTIMENT_MULTIPLIERS[aiAnalysis.sentiment.label];
  const topicMultiplier = TOPIC_MULTIPLIERS[aiAnalysis.topic.category] || 1.0;
  const controversyMultiplier = getControversyMultiplier(aiAnalysis.controversy.score);
  const crisisMultiplier = getCrisisMultiplier(
    aiAnalysis.tension.level === 'critical',
    aiAnalysis.tension.level === 'critical' && aiAnalysis.topic.category === 'disaster'
  );

  const score = (
    sentimentMultiplier * 0.3 +
    topicMultiplier * 0.4 +
    controversyMultiplier * 0.2 +
    crisisMultiplier * 0.1
  );

  // Normalize to 0-1000
  return Math.min(1000, score * 500);
}
```

### AI Model Training

**Dataset:**
- 100K+ Türkçe siyasi içerik
- Manuel etiketlenmiş sentiment
- Topic classification labels
- Controversy annotations

**Training Pipeline:**
```python
# Python example
from transformers import BertForSequenceClassification, Trainer, TrainingArguments
import torch

model = BertForSequenceClassification.from_pretrained(
    'dbmdz/bert-base-turkish-cased',
    num_labels=4  # sentiment classes
)

training_args = TrainingArguments(
    output_dir='./models/politpuan-sentiment',
    num_train_epochs=3,
    per_device_train_batch_size=16,
    per_device_eval_batch_size=64,
    warmup_steps=500,
    weight_decay=0.01,
    logging_dir='./logs',
)

trainer = Trainer(
    model=model,
    args=training_args,
    train_dataset=train_dataset,
    eval_dataset=eval_dataset,
)

trainer.train()
```

---

## Katman 5: Zamanlama ve Trend Etkisi

### Seçim Dönemi Çarpanı

```typescript
interface ElectionPeriod {
  isElectionPeriod: boolean;
  daysUntilElection?: number;
  isElectionDay: boolean;
}

function getElectionMultiplier(period: ElectionPeriod): number {
  if (period.isElectionDay) return 2.5;
  if (period.isElectionPeriod && period.daysUntilElection) {
    if (period.daysUntilElection <= 30) return 1.8;  // Seçim dönemi
    if (period.daysUntilElection <= 180) return 1.3; // Seçim öncesi
  }
  return 1.0; // Normal dönem
}
```

### Gündemle Eşleşme Skoru

```typescript
interface AgendaMatch {
  isOnAgenda: boolean;
  trendRank?: number; // 1 = #1 trend
  relevanceScore: number; // 0-1
}

function getAgendaMultiplier(match: AgendaMatch): number {
  if (!match.isOnAgenda) return 1.0;
  
  if (match.trendRank === 1) return 2.2;      // #1 trend
  if (match.trendRank && match.trendRank <= 5) return 1.8; // Top 5
  if (match.relevanceScore > 0.7) return 1.4; // Gündemle ilgili
  
  return 1.0;
}
```

### Viral Potansiyel Skoru

```typescript
interface ViralMetrics {
  firstHourInteractions: number;
  expectedInteractions: number;
  shareRate: number;
  averageShareRate: number;
  commentDepth: number;
  averageCommentDepth: number;
  hoursSincePost: number;
}

function calculateViralScore(metrics: ViralMetrics): number {
  // İlk 1 saat içinde beklenenin üzerinde etkileşim
  const interactionRatio = metrics.firstHourInteractions / metrics.expectedInteractions;
  
  // Paylaşım oranı
  const shareRatio = metrics.shareRate / metrics.averageShareRate;
  
  // Yorum derinliği
  const depthRatio = metrics.commentDepth / metrics.averageCommentDepth;
  
  // Viral skor
  const viralScore = (interactionRatio * 0.4) + 
                     (shareRatio * 0.4) + 
                     (depthRatio * 0.2);
  
  // Normalize
  if (viralScore < 0.5) return 1.0;      // Düşük
  if (viralScore < 1.0) return 1.2;      // Orta
  if (viralScore < 1.5) return 1.6;      // Yüksek
  return 2.0;                             // Çok Yüksek
}
```

### Zaman Bazlı Ağırlık

```typescript
function getTimeMultiplier(hoursSincePost: number): number {
  if (hoursSincePost <= 1) return 1.5;   // İlk 1 saat
  if (hoursSincePost <= 6) return 1.3;   // İlk 6 saat
  if (hoursSincePost <= 24) return 1.1; // İlk 24 saat
  return 1.0;                            // Sonrası
}
```

### Katman 5 Final Hesaplama

```typescript
function calculateLayer5(
  electionPeriod: ElectionPeriod,
  agendaMatch: AgendaMatch,
  viralMetrics: ViralMetrics,
  hoursSincePost: number
): number {
  const electionMultiplier = getElectionMultiplier(electionPeriod);
  const agendaMultiplier = getAgendaMultiplier(agendaMatch);
  const viralMultiplier = calculateViralScore(viralMetrics);
  const timeMultiplier = getTimeMultiplier(hoursSincePost);

  const score = (
    electionMultiplier * 0.3 +
    agendaMultiplier * 0.4 +
    viralMultiplier * 0.2 +
    timeMultiplier * 0.1
  );

  // Normalize to 0-1000
  return Math.min(1000, score * 500);
}
```

---

## Final PolitPuan Hesaplama

### Ana Fonksiyon

```typescript
interface PolitPuanInput {
  // Katman 1
  recentPosts: PostInteraction[];
  
  // Katman 2
  userProfile: UserProfile;
  
  // Katman 3
  contentType: ContentType;
  
  // Katman 4
  aiAnalysis: AIAnalysis;
  
  // Katman 5
  electionPeriod: ElectionPeriod;
  agendaMatch: AgendaMatch;
  viralMetrics: ViralMetrics;
  hoursSincePost: number;
  
  // Rol
  userRole: UserRole;
}

const ROLE_MULTIPLIERS: Record<UserRole, number> = {
  [UserRole.CITIZEN]: 0.3,
  [UserRole.VERIFIED_CITIZEN]: 1.0,
  [UserRole.PARTY_MEMBER]: 1.5,
  [UserRole.POLITICIAN]: 2.5,
  [UserRole.MP]: 3.5,
  [UserRole.JOURNALIST]: 1.8,
  [UserRole.ORG_LEADER]: 3.0,
  [UserRole.PARTY_ADMIN]: 3.5,
  [UserRole.SYSTEM_ADMIN]: 0, // Hesaplanmaz
};

function calculatePolitPuan(input: PolitPuanInput): {
  finalScore: number;
  breakdown: {
    layer1: number;
    layer2: number;
    layer3: number;
    layer4: number;
    layer5: number;
    baseScore: number;
    roleMultiplier: number;
  };
} {
  // Her katmanı hesapla
  const layer1 = normalizeLayer1(calculateLayer1(input.recentPosts));
  const layer2 = calculateLayer2(input.userProfile);
  const layer3 = calculateLayer3(input.contentType);
  const layer4 = calculateLayer4(input.aiAnalysis);
  const layer5 = calculateLayer5(
    input.electionPeriod,
    input.agendaMatch,
    input.viralMetrics,
    input.hoursSincePost
  );

  // Base score (ağırlıklı toplam)
  const baseScore = (
    layer1 * 0.25 +
    layer2 * 0.20 +
    layer3 * 0.15 +
    layer4 * 0.20 +
    layer5 * 0.20
  );

  // Rol çarpanı
  const roleMultiplier = ROLE_MULTIPLIERS[input.userRole] || 1.0;

  // Final skor
  const finalScore = baseScore * roleMultiplier;

  // Max 10,000'e sınırla
  const cappedScore = Math.min(10000, Math.max(0, finalScore));

  return {
    finalScore: Math.round(cappedScore),
    breakdown: {
      layer1: Math.round(layer1),
      layer2: Math.round(layer2),
      layer3: Math.round(layer3),
      layer4: Math.round(layer4),
      layer5: Math.round(layer5),
      baseScore: Math.round(baseScore),
      roleMultiplier
    }
  };
}
```

---

## Güncelleme Stratejisi

### Gerçek Zamanlı Güncelleme

Her etkileşimde (beğeni, yorum, paylaşım) ilgili post'un PolitPuan'ı güncellenir.

```typescript
async function updatePostPolitPuan(postId: string) {
  const post = await getPost(postId);
  const user = await getUser(post.userId);
  
  // Gerekli verileri topla
  const input = await gatherPolitPuanInput(post, user);
  
  // Hesapla
  const result = calculatePolitPuan(input);
  
  // Güncelle
  await updatePost(postId, { politPuan: result.finalScore });
  
  // Kullanıcının genel PolitPuan'ını da güncelle
  await updateUserPolitPuan(user.id);
}
```

### Batch Güncelleme

Gece yarısı tüm kullanıcılar için batch işlemi:

```typescript
async function batchUpdatePolitPuan() {
  const users = await getAllActiveUsers();
  
  for (const user of users) {
    const posts = await getRecentPosts(user.id, 5);
    
    // Her post için hesapla
    for (const post of posts) {
      await updatePostPolitPuan(post.id);
    }
    
    // Kullanıcının genel skorunu güncelle
    await updateUserPolitPuan(user.id);
  }
}
```

### Haftalık Derin Analiz

Her hafta sonu trend analizi ve geçmiş performans değerlendirmesi:

```typescript
async function weeklyDeepAnalysis() {
  // Trend analizi
  await analyzeTrends();
  
  // Geçmiş performans
  await analyzeHistoricalPerformance();
  
  // Rozet dağıtımı
  await distributeBadges();
}
```

---

## Performans Optimizasyonu

### Caching Stratejisi

```typescript
// Redis cache keys
const CACHE_KEYS = {
  politPuan: (userId: string) => `politpuan:user:${userId}`,
  postPolitPuan: (postId: string) => `politpuan:post:${postId}`,
  leaderboard: (period: string) => `politpuan:leaderboard:${period}`
};

// Cache TTL
const CACHE_TTL = {
  userPolitPuan: 3600,      // 1 saat
  postPolitPuan: 300,       // 5 dakika
  leaderboard: 1800         // 30 dakika
};
```

### Asenkron Hesaplama

Ağır hesaplamalar background job olarak çalıştırılır:

```typescript
// Message queue (Kafka/RabbitMQ)
await queue.enqueue('calculate-politpuan', {
  userId: user.id,
  postId: post.id,
  priority: 'normal'
});
```

---

## Test Senaryoları

### Unit Test Örnekleri

```typescript
describe('PolitPuan Calculation', () => {
  it('should calculate layer 1 correctly', () => {
    const posts = [
      { likes: 100, comments: 20, shares: 10, saves: 5, createdAt: new Date() },
      { likes: 50, comments: 10, shares: 5, saves: 2, createdAt: new Date() }
    ];
    
    const score = calculateLayer1(posts);
    expect(score).toBeGreaterThan(0);
  });

  it('should apply role multiplier correctly', () => {
    const input = createMockInput(UserRole.MP);
    const result = calculatePolitPuan(input);
    
    expect(result.breakdown.roleMultiplier).toBe(3.5);
  });
});
```

---

## Monitoring ve Alerting

### Metrikler

- Hesaplama süresi (p50, p95, p99)
- Hata oranı
- Cache hit rate
- Queue depth

### Alerting

- Hesaplama süresi > 5 saniye
- Hata oranı > %1
- Queue depth > 10,000

---

*Bu dokümantasyon, PolitPuan algoritmasının tüm detaylarını içermektedir. Implementasyon sırasında bu dokümantasyon referans alınmalıdır.*
