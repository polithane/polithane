import { User, Post, UserRole, PolitPuanBreakdown } from '../types';

/**
 * PolitPuan Hesaplama Servisi
 * 5 katmanlı algoritma ile kullanıcı ve içerik puanlaması
 */

const LAYER_WEIGHTS = {
  layer1: 0.25,
  layer2: 0.20,
  layer3: 0.15,
  layer4: 0.20,
  layer5: 0.20
};

const POST_WEIGHTS = [0.25, 0.20, 0.15, 0.10, 0.05]; // Son 5 post için

const ROLE_MULTIPLIERS: Record<UserRole, number> = {
  [UserRole.CITIZEN]: 0.5,
  [UserRole.VERIFIED_CITIZEN]: 1.0,
  [UserRole.PARTY_MEMBER]: 1.2,
  [UserRole.POLITICIAN_DISTRICT]: 1.5,
  [UserRole.POLITICIAN_CITY]: 2.0,
  [UserRole.POLITICIAN_NATIONAL]: 2.5,
  [UserRole.MP]: 3.0,
  [UserRole.JOURNALIST]: 1.8,
  [UserRole.DISTRICT_CHAIRMAN]: 2.0,
  [UserRole.CITY_CHAIRMAN]: 2.5,
  [UserRole.WOMEN_BRANCH]: 1.8,
  [UserRole.YOUTH_BRANCH]: 1.8,
  [UserRole.PARTY_ADMIN]: 3.5,
  [UserRole.SYSTEM_ADMIN]: 0
};

const CONTENT_TYPE_MULTIPLIERS = {
  text: 1.0,
  photo: 1.3,
  video: 1.8,
  live: 3.0,
  poll: 1.5,
  document: 1.2
};

const CATEGORY_MULTIPLIERS = {
  supportive: 1.0,
  informative: 1.2,
  critical: 1.5,
  controversial: 2.0,
  crisis: 2.5
};

const TOPIC_MULTIPLIERS = {
  economy: 0.5,
  foreign_policy: 0.5,
  security: 0.5,
  education: 0.3,
  health: 0.3,
  environment: 0.3,
  culture: 0.2,
  sports: 0.1,
  other: 0.2
};

const PROFESSION_MULTIPLIERS: Record<string, number> = {
  teacher: 1.2,
  doctor: 1.3,
  farmer: 1.1,
  public_servant: 1.15,
  academic: 1.25,
  business: 1.1
};

const MAJOR_CITIES = ['istanbul', 'ankara', 'izmir'];
const BIG_CITIES = ['bursa', 'antalya', 'adana', 'gaziantep', 'konya'];

export class PolitPuanCalculator {
  /**
   * Kullanıcı için PolitPuan hesapla
   */
  static calculateUserPolitPuan(user: User, posts: Post[]): number {
    const layer1 = this.calculateLayer1_BasicInteraction(posts);
    const layer2 = this.calculateLayer2_UserInfluenceProfile(user);
    const layer3 = this.calculateLayer3_ContentType(posts);
    const layer4 = this.calculateLayer4_PoliticalTension(posts);
    const layer5 = this.calculateLayer5_TimingTrend(posts);

    const breakdown: PolitPuanBreakdown = {
      layer1,
      layer2,
      layer3,
      layer4,
      layer5,
      total: 0
    };

    const finalScore =
      layer1 * LAYER_WEIGHTS.layer1 +
      layer2 * LAYER_WEIGHTS.layer2 +
      layer3 * LAYER_WEIGHTS.layer3 +
      layer4 * LAYER_WEIGHTS.layer4 +
      layer5 * LAYER_WEIGHTS.layer5;

    breakdown.total = finalScore;

    // Rol çarpanı uygula
    const roleMultiplier = ROLE_MULTIPLIERS[user.role] || 1.0;
    const finalPolitPuan = finalScore * roleMultiplier;

    return Math.round(finalPolitPuan);
  }

  /**
   * Katman 1: Temel Etkileşim Puanı
   */
  private static calculateLayer1_BasicInteraction(posts: Post[]): number {
    const recentPosts = posts.slice(-5).reverse();
    let score = 0;

    recentPosts.forEach((post, index) => {
      const postScore =
        post.likeCount * 1 +
        post.commentCount * 3 +
        post.shareCount * 5 +
        post.viewCount * 0.1;

      const weight = POST_WEIGHTS[index] || 0;
      score += postScore * weight;
    });

    return score;
  }

  /**
   * Katman 2: Kullanıcı Etki Profili
   */
  private static calculateLayer2_UserInfluenceProfile(user: User): number {
    // Takipçi skoru
    const followerScore = Math.log10(user.followerCount + 1) * 10;

    // Meslek çarpanı
    const professionMultiplier =
      PROFESSION_MULTIPLIERS[user.profession?.toLowerCase() || ''] || 1.0;

    // Bölgesel nüfuz (basitleştirilmiş - gerçekte veritabanından gelecek)
    const regionalMultiplier = this.getRegionalMultiplier(user.cityId);

    // 90 günlük ortalama etkileşim (basitleştirilmiş)
    const avgEngagement = (user.postCount / 90) * 0.5;

    // Özgünlük oranı (basitleştirilmiş)
    const originalityRatio = 0.7; // Gerçekte hesaplanacak
    const originalityScore = originalityRatio * 20;

    return (
      followerScore * professionMultiplier * regionalMultiplier +
      avgEngagement +
      originalityScore
    );
  }

  /**
   * Katman 3: İçerik Türü Çarpanı
   */
  private static calculateLayer3_ContentType(posts: Post[]): number {
    if (posts.length === 0) return 0;

    let totalScore = 0;

    posts.forEach((post) => {
      const baseScore =
        post.likeCount * 1 +
        post.commentCount * 3 +
        post.shareCount * 5;
      const multiplier =
        CONTENT_TYPE_MULTIPLIERS[post.type as keyof typeof CONTENT_TYPE_MULTIPLIERS] || 1.0;
      totalScore += baseScore * multiplier;
    });

    return totalScore / posts.length;
  }

  /**
   * Katman 4: Siyasi Gerilim Derecesi
   */
  private static calculateLayer4_PoliticalTension(posts: Post[]): number {
    if (posts.length === 0) return 0;

    let totalScore = 0;

    posts.forEach((post) => {
      const categoryMultiplier =
        CATEGORY_MULTIPLIERS[post.category as keyof typeof CATEGORY_MULTIPLIERS] || 1.0;
      const topicMultiplier =
        1 + (TOPIC_MULTIPLIERS[post.topicCategory as keyof typeof TOPIC_MULTIPLIERS] || 0);
      const tensionScore = post.tensionScore || 0;

      const engagementScore =
        post.likeCount + post.commentCount * 3 + post.shareCount * 5;
      const postScore =
        engagementScore * categoryMultiplier * topicMultiplier * (1 + tensionScore);
      totalScore += postScore;
    });

    return totalScore / posts.length;
  }

  /**
   * Katman 5: Zamanlama ve Trend Etkisi
   */
  private static calculateLayer5_TimingTrend(posts: Post[]): number {
    if (posts.length === 0) return 0;

    const isElectionPeriod = this.checkElectionPeriod();
    const electionMultiplier = isElectionPeriod ? 1.5 : 1.0;

    let totalScore = 0;

    posts.forEach((post) => {
      // Gündem eşleşme skoru (basitleştirilmiş)
      const agendaMatchScore = 15; // Gerçekte AI ile hesaplanacak

      // Viral potansiyel
      const viralScore = (post.viralPotential || 0) * 25;

      // Zaman çarpanı
      const timeMultiplier = this.getTimeMultiplier(post.createdAt);

      const postScore = (agendaMatchScore + viralScore) * timeMultiplier;
      totalScore += postScore;
    });

    return (totalScore / posts.length) * electionMultiplier;
  }

  /**
   * Bölgesel çarpan hesapla
   */
  private static getRegionalMultiplier(cityId: string): number {
    const cityLower = cityId.toLowerCase();
    if (MAJOR_CITIES.includes(cityLower)) return 1.5;
    if (BIG_CITIES.includes(cityLower)) return 1.3;
    return 1.0;
  }

  /**
   * Zaman çarpanı hesapla
   */
  private static getTimeMultiplier(createdAt: Date): number {
    const now = new Date();
    const diffHours = (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60);

    if (diffHours < 1) return 1.5;
    if (diffHours < 24) return 1.2;
    return 1.0;
  }

  /**
   * Seçim dönemi kontrolü
   */
  private static checkElectionPeriod(): boolean {
    // Basitleştirilmiş - gerçekte takvimden kontrol edilecek
    // Seçimden 6 ay önce başlar
    return false; // Gerçek implementasyonda dinamik olacak
  }

  /**
   * Post için PolitPuan hesapla
   */
  static calculatePostPolitPuan(post: Post, author: User): number {
    const baseScore =
      post.likeCount * 1 +
      post.commentCount * 3 +
      post.shareCount * 5 +
      post.viewCount * 0.1;

    const contentTypeMultiplier =
      CONTENT_TYPE_MULTIPLIERS[post.type as keyof typeof CONTENT_TYPE_MULTIPLIERS] || 1.0;
    const categoryMultiplier =
      CATEGORY_MULTIPLIERS[post.category as keyof typeof CATEGORY_MULTIPLIERS] || 1.0;
    const roleMultiplier = ROLE_MULTIPLIERS[author.role] || 1.0;

    return Math.round(
      baseScore * contentTypeMultiplier * categoryMultiplier * roleMultiplier
    );
  }
}
