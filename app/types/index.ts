// Kullanıcı Rolleri
export enum UserRole {
  VATANDAS_DOGRULANMAMIS = 'vatandas_dogrulanmamis',
  VATANDAS_DOGRULANMIS = 'vatandas_dogrulanmis',
  PARTI_UYESI = 'parti_uyesi',
  SİYASETCI_ILCE = 'siyasetci_ilce',
  SİYASETCI_IL = 'siyasetci_il',
  SİYASETCI_GENEL_MERKEZ = 'siyasetci_genel_merkez',
  MILLETVEKILI = 'milletvekili',
  GAZETECI = 'gazeteci',
  TESKILAT_IL_BASKANI = 'teskilat_il_baskani',
  TESKILAT_ILCE_BASKANI = 'teskilat_ilce_baskani',
  TESKILAT_KADIN_KOLLARI = 'teskilat_kadin_kollari',
  TESKILAT_GENC_KOLLARI = 'teskilat_genc_kollari',
  PARTI_GENEL_MERKEZ_ADMIN = 'parti_genel_merkez_admin',
  SISTEM_ADMIN = 'sistem_admin',
}

// İçerik Türleri
export enum ContentType {
  METIN = 'metin',
  FOTOGRAF = 'fotograf',
  VIDEO = 'video',
  CANLI_YAYIN = 'canli_yayin',
  ANKET = 'anket',
}

// İçerik Tonu
export enum ContentSentiment {
  ELEŞTİREL = 'elestirel',
  DESTEKLEYICI = 'destekleyici',
  TARTIŞMALI = 'tartismali',
  KRİZ_AFET = 'kriz_afet',
  NÖTR = 'notr',
}

// Konu Kategorileri
export enum TopicCategory {
  EKONOMI = 'ekonomi',
  EGITIM = 'egitim',
  SAGLIK = 'saglik',
  DIS_POLITIKA = 'dis_politika',
  GUVENLIK = 'guvenlik',
  CEVRE = 'cevre',
  ULASTIRMA = 'ulastirma',
  TEKNOLOJI = 'teknoloji',
  TARIM = 'tarim',
  SPOR = 'spor',
  KULTUR = 'kultur',
}

// Kullanıcı Modeli
export interface User {
  id: string
  name: string
  username: string
  email: string
  avatar?: string
  verified: boolean
  role: UserRole
  party?: string
  bio?: string
  location: {
    il: string
    ilce?: string
    mahalle?: string
  }
  meslek?: string
  yasGrubu?: string
  createdAt: Date
  politPuan: number
  politPuanHistory: PolitPuanHistory[]
  stats: {
    followers: number
    following: number
    posts: number
    avgPolitPuan: number
  }
  // Siyasetçi/Vekil özel alanlar
  secimBolgesi?: string
  partiKademesi?: string
  gorevler?: string[]
  teşkilatBaglantilari?: string[]
}

// Post Modeli
export interface Post {
  id: string
  authorId: string
  author: User
  content: string
  contentType: ContentType
  mediaUrls?: string[]
  topic: TopicCategory
  sentiment: ContentSentiment
  politPuan: number
  location?: {
    il: string
    ilce?: string
  }
  createdAt: Date
  updatedAt: Date
  stats: {
    views: number
    comments: number
    reposts: number
    likes: number
  }
  // AI analiz sonuçları
  aiAnalysis?: {
    gerilimDerecesi: number // 0-100
    viralPotansiyel: number // 0-100
    partizanlikSkoru: number // 0-100
    duyguAnalizi: {
      mutluluk: number
      ofke: number
      endise: number
      umut: number
    }
  }
  hashtags?: string[]
  mentions?: string[]
  isRepost?: boolean
  originalPostId?: string
}

// PolitPuan Hesaplama Katmanları
export interface PolitPuanLayers {
  katman1: {
    // Son 5 post ağırlıklı (25% / 20% / 15% / 10% / 5%)
    sonPostlar: Array<{
      postId: string
      puan: number
      agirlik: number
    }>
    katman1Toplam: number
  }
  katman2: {
    // Kullanıcı etki profili
    takipciSayisi: number
    meslekCarpani: number
    bolgeselNufuzCarpani: number
    son90GunOrtalama: number
    dmYazismaSikligi: number
    ozgunlukOrani: number
    katman2Toplam: number
  }
  katman3: {
    // İçerik türü çarpanı
    icerikTuru: ContentType
    carpan: number
    katman3Toplam: number
  }
  katman4: {
    // Siyasi gerilim
    gerilimDerecesi: number
    kategoriYuksekGerilim: boolean
    carpan: number
    katman4Toplam: number
  }
  katman5: {
    // Zamanlama ve trend
    secimDonemiCarpani: number
    gundemEslestirmeSkoru: number
    viralPotansiyelSkoru: number
    katman5Toplam: number
  }
  finalSkor: number
}

// PolitPuan Geçmişi
export interface PolitPuanHistory {
  date: Date
  puan: number
  katmanlar: PolitPuanLayers
  trend: 'up' | 'down' | 'stable'
}

// Feed Türleri
export enum FeedType {
  GENEL_GUNDEM = 'genel_gundem',
  PARTI_GUNDEMI = 'parti_gundemi',
  YEREL_GUNDEM = 'yerel_gundem',
  TAKIP_EDILENLER = 'takip_edilenler',
  TREND_OLAYLAR = 'trend_olaylar',
  MEDYA_AKISI = 'medya_akisi',
  ANALITIK_ONERILEN = 'analitik_onerilen',
}

// Teşkilat Yapısı
export interface Organization {
  id: string
  type: 'il' | 'ilce' | 'mahalle' | 'sandik'
  name: string
  parentId?: string
  location: {
    il: string
    ilce?: string
    mahalle?: string
    sandik?: string
  }
  partiGucu: {
    [partyName: string]: number // 0-100
  }
  siyasetciAgı: string[] // User IDs
  gundemIsiHaritasi: {
    [topic: string]: number // 0-100
  }
  vatandasGeriBildirimYogunlugu: number
  yoneticiler: {
    ilBaskani?: string
    ilceBaskani?: string
    kadinKollari?: string
    gencKollari?: string
    vekiller?: string[]
    belediyeBaskanlari?: string[]
  }
}

// Medya Haberi
export interface MediaArticle {
  id: string
  title: string
  content: string
  source: string
  author?: string
  publishedAt: Date
  category: TopicCategory
  tags: string[]
  relatedPoliticians?: string[] // User IDs
  relatedParties?: string[]
  mediaType: 'haber' | 'roportaj' | 'canli_yayin' | 'aciklama'
  url?: string
  imageUrl?: string
  // AI analiz
  aiAnalysis?: {
    tarafsizlikSkoru: number // 0-100
    gerilimPuani: number
    partizanlikEtiketi: string
    factCheckSkoru?: number
  }
}

// Gündem Konusu
export interface AgendaTopic {
  id: string
  title: string
  description: string
  category: 'ulke' | 'parti' | 'bolgesel' | 'stk' | 'vatandas'
  priority: number
  createdAt: Date
  relatedPosts: string[] // Post IDs
  relatedMedia: string[] // MediaArticle IDs
  partiDestekleri: {
    [partyName: string]: 'destekliyor' | 'karsı' | 'notr'
  }
  vatandasGorusleri: {
    olumlu: number
    olumsuz: number
    notr: number
  }
  trendSkoru: number
}

// Analitik Veriler
export interface Analytics {
  userId: string
  imajSkoru: number // 0-100
  son30GunTrend: Array<{
    date: Date
    destekSkoru: number
    trendSkoru: number
  }>
  rakipKarsilastirma: {
    [competitorId: string]: {
      name: string
      politPuanFarki: number
      takipciFarki: number
      etkilesimFarki: number
    }
  }
  secimBolgesiNabiz: {
    bolge: string
    destekOrani: number
    trend: 'up' | 'down' | 'stable'
  }
  partizanlikIsiHaritasi: {
    [topic: string]: number
  }
  duyguHaritasi: {
    mutluluk: number
    ofke: number
    endise: number
    umut: number
  }
}

// AI Öneri
export interface AIRecommendation {
  id: string
  type: 'paylasim' | 'kriz_iletisimi' | 'konusma_metni' | 'gorev_hatirlatma' | 'gundem_onerisi'
  title: string
  content: string
  confidence: number // 0-100
  reasoning: string
  suggestedActions?: string[]
}
