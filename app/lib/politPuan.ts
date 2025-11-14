import { 
  User, 
  Post, 
  ContentType, 
  ContentSentiment, 
  TopicCategory,
  PolitPuanLayers,
  PolitPuanHistory 
} from '../types'

// İçerik türü çarpanları (Katman 3)
const CONTENT_TYPE_MULTIPLIERS: Record<ContentType, number> = {
  [ContentType.METIN]: 1.0,
  [ContentType.FOTOGRAF]: 1.3,
  [ContentType.VIDEO]: 1.8,
  [ContentType.CANLI_YAYIN]: 3.0,
  [ContentType.ANKET]: 1.5,
}

// Meslek çarpanları (Katman 2)
const MESLEK_CARPANLARI: Record<string, number> = {
  'öğretmen': 1.2,
  'doktor': 1.3,
  'avukat': 1.4,
  'mühendis': 1.2,
  'akademisyen': 1.5,
  'gazeteci': 1.6,
  'kamu çalışanı': 1.1,
  'çiftçi': 1.0,
  'işçi': 1.0,
  'emekli': 0.9,
  'öğrenci': 0.8,
}

// Bölgesel nüfuz çarpanları (Katman 2)
const BOLGESEL_NUFUZ_CARPANLARI: Record<string, number> = {
  'İstanbul': 1.5,
  'Ankara': 1.4,
  'İzmir': 1.3,
  'Bursa': 1.2,
  'Antalya': 1.2,
  'Adana': 1.1,
  'Konya': 1.1,
  'Gaziantep': 1.1,
  'Kayseri': 1.0,
  'Kars': 0.7,
  'Ağrı': 0.7,
  'Hakkari': 0.6,
}

// Yüksek gerilim kategorileri (Katman 4)
const YUKSEK_GERILIM_KATEGORILERI: TopicCategory[] = [
  TopicCategory.EKONOMI,
  TopicCategory.DIS_POLITIKA,
  TopicCategory.GUVENLIK,
]

// Gerilim çarpanları (Katman 4)
function getGerilimCarpani(sentiment: ContentSentiment, topic: TopicCategory, gerilimDerecesi: number): number {
  let carpan = 1.0

  // Sentiment çarpanı
  switch (sentiment) {
    case ContentSentiment.ELEŞTİREL:
      carpan *= 1.5
      break
    case ContentSentiment.TARTIŞMALI:
      carpan *= 1.8
      break
    case ContentSentiment.KRİZ_AFET:
      carpan *= 2.5
      break
    case ContentSentiment.DESTEKLEYICI:
      carpan *= 1.2
      break
  }

  // Yüksek gerilim kategorisi
  if (YUKSEK_GERILIM_KATEGORILERI.includes(topic)) {
    carpan *= 1.4
  }

  // Gerilim derecesi (0-100)
  carpan *= (1 + gerilimDerecesi / 100)

  return carpan
}

// Katman 1: Son 5 post ağırlıklı hesaplama
function calculateKatman1(recentPosts: Post[]): number {
  const agirliklar = [0.25, 0.20, 0.15, 0.10, 0.05]
  let toplam = 0

  recentPosts.slice(0, 5).forEach((post, index) => {
    if (index < agirliklar.length) {
      toplam += post.politPuan * agirliklar[index]
    }
  })

  return toplam
}

// Katman 2: Kullanıcı etki profili
function calculateKatman2(user: User, recentPosts: Post[]): number {
  // Takipçi sayısı etkisi (logaritmik)
  const takipciEtkisi = Math.log10(user.stats.followers + 1) * 50

  // Meslek çarpanı
  const meslekCarpani = MESLEK_CARPANLARI[user.meslek?.toLowerCase() || ''] || 1.0

  // Bölgesel nüfuz çarpanı
  const bolgeselCarpan = BOLGESEL_NUFUZ_CARPANLARI[user.location.il] || 1.0

  // Son 90 gün etkileşim ortalaması (basitleştirilmiş)
  const son90GunOrtalama = recentPosts.length > 0
    ? recentPosts.reduce((sum, p) => sum + p.stats.likes + p.stats.comments, 0) / recentPosts.length
    : 0

  // Özgünlük oranı (repost olmayan içeriklerin oranı)
  const ozgunlukOrani = recentPosts.length > 0
    ? recentPosts.filter(p => !p.isRepost).length / recentPosts.length
    : 1.0

  // DM yazışma sıklığı (simüle edilmiş - gerçekte veritabanından gelecek)
  const dmYazismaSikligi = 0.5 // Placeholder

  const katman2Toplam = (
    takipciEtkisi * meslekCarpani * bolgeselCarpan +
    son90GunOrtalama * 0.1 +
    ozgunlukOrani * 100 +
    dmYazismaSikligi * 50
  ) / 4

  return katman2Toplam
}

// Katman 3: İçerik türü çarpanı
function calculateKatman3(contentType: ContentType, basePuan: number): number {
  const carpan = CONTENT_TYPE_MULTIPLIERS[contentType]
  return basePuan * carpan
}

// Katman 4: Siyasi gerilim derecesi
function calculateKatman4(
  sentiment: ContentSentiment,
  topic: TopicCategory,
  gerilimDerecesi: number,
  basePuan: number
): number {
  const carpan = getGerilimCarpani(sentiment, topic, gerilimDerecesi)
  return basePuan * carpan
}

// Katman 5: Zamanlama ve trend etkisi
function calculateKatman5(
  post: Post,
  gundemEslestirmeSkoru: number,
  viralPotansiyelSkoru: number
): number {
  // Seçim dönemi kontrolü (basitleştirilmiş)
  const now = new Date()
  const secimDonemiCarpani = 1.2 // Placeholder - gerçekte seçim takviminden kontrol edilecek

  // Gündem eşleşme skoru (0-100)
  const gundemEtkisi = gundemEslestirmeSkoru * 0.5

  // Viral potansiyel skoru (0-100)
  const viralEtkisi = viralPotansiyelSkoru * 0.3

  const katman5Toplam = (secimDonemiCarpani * 100) + gundemEtkisi + viralEtkisi

  return katman5Toplam
}

// Ana PolitPuan hesaplama fonksiyonu
export function calculatePolitPuan(
  user: User,
  post: Post,
  recentPosts: Post[],
  gundemEslestirmeSkoru: number = 50,
  viralPotansiyelSkoru: number = 50
): PolitPuanLayers {
  // Katman 1: Son 5 post ağırlıklı
  const katman1Toplam = calculateKatman1(recentPosts)

  // Katman 2: Kullanıcı etki profili
  const katman2Toplam = calculateKatman2(user, recentPosts)

  // Katman 3: İçerik türü
  const basePuan = (katman1Toplam + katman2Toplam) / 2
  const katman3Toplam = calculateKatman3(post.contentType, basePuan)

  // Katman 4: Siyasi gerilim
  const gerilimDerecesi = post.aiAnalysis?.gerilimDerecesi || 50
  const katman4Toplam = calculateKatman4(
    post.sentiment,
    post.topic,
    gerilimDerecesi,
    katman3Toplam
  )

  // Katman 5: Zamanlama ve trend
  const katman5Toplam = calculateKatman5(
    post,
    gundemEslestirmeSkoru,
    viralPotansiyelSkoru
  )

  // Final skor: Ağırlıklı ortalama
  // Katman 1: 25%, Katman 2: 20%, Katman 3: 15%, Katman 4: 10%, Katman 5: 5%
  // Kalan %25'i temel etkileşim skorundan
  const temelEtkilesimSkoru = (
    post.stats.likes * 2 +
    post.stats.comments * 3 +
    post.stats.reposts * 2 +
    post.stats.views * 0.1
  )

  const finalSkor = Math.round(
    katman1Toplam * 0.25 +
    katman2Toplam * 0.20 +
    katman3Toplam * 0.15 +
    katman4Toplam * 0.10 +
    katman5Toplam * 0.05 +
    temelEtkilesimSkoru * 0.25
  )

  return {
    katman1: {
      sonPostlar: recentPosts.slice(0, 5).map((p, i) => ({
        postId: p.id,
        puan: p.politPuan,
        agirlik: [0.25, 0.20, 0.15, 0.10, 0.05][i] || 0,
      })),
      katman1Toplam,
    },
    katman2: {
      takipciSayisi: user.stats.followers,
      meslekCarpani: MESLEK_CARPANLARI[user.meslek?.toLowerCase() || ''] || 1.0,
      bolgeselNufuzCarpani: BOLGESEL_NUFUZ_CARPANLARI[user.location.il] || 1.0,
      son90GunOrtalama: recentPosts.length > 0
        ? recentPosts.reduce((sum, p) => sum + p.stats.likes + p.stats.comments, 0) / recentPosts.length
        : 0,
      dmYazismaSikligi: 0.5, // Placeholder
      ozgunlukOrani: recentPosts.length > 0
        ? recentPosts.filter(p => !p.isRepost).length / recentPosts.length
        : 1.0,
      katman2Toplam,
    },
    katman3: {
      icerikTuru: post.contentType,
      carpan: CONTENT_TYPE_MULTIPLIERS[post.contentType],
      katman3Toplam,
    },
    katman4: {
      gerilimDerecesi,
      kategoriYuksekGerilim: YUKSEK_GERILIM_KATEGORILERI.includes(post.topic),
      carpan: getGerilimCarpani(post.sentiment, post.topic, gerilimDerecesi),
      katman4Toplam,
    },
    katman5: {
      secimDonemiCarpani: 1.2,
      gundemEslestirmeSkoru,
      viralPotansiyelSkoru,
      katman5Toplam,
    },
    finalSkor,
  }
}

// Kullanıcı için genel PolitPuan güncelleme
export function updateUserPolitPuan(user: User, recentPosts: Post[]): number {
  if (recentPosts.length === 0) return user.politPuan

  // Son 30 postun ortalaması
  const avgPolitPuan = recentPosts
    .slice(0, 30)
    .reduce((sum, p) => sum + p.politPuan, 0) / Math.min(recentPosts.length, 30)

  // Kullanıcı istatistiklerine göre çarpan
  const etkilesimCarpani = 1 + (user.stats.followers / 10000) * 0.1

  return Math.round(avgPolitPuan * etkilesimCarpani)
}
