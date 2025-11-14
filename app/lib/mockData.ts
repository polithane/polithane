import { User, Post, MediaArticle, AgendaTopic, Organization, UserRole, ContentType, ContentSentiment, TopicCategory } from '../types'

// Mock kullanıcılar
export const mockUsers: User[] = [
  {
    id: '1',
    name: 'Ahmet Yılmaz',
    username: 'ahmet_yilmaz',
    email: 'ahmet@example.com',
    verified: true,
    role: UserRole.MILLETVEKILI,
    party: 'AK Parti',
    location: { il: 'Ankara', ilce: 'Çankaya' },
    meslek: 'Milletvekili',
    yasGrubu: '45-54',
    createdAt: new Date('2020-01-15'),
    politPuan: 1843,
    politPuanHistory: [],
    stats: {
      followers: 12500,
      following: 890,
      posts: 1245,
      avgPolitPuan: 1843,
    },
    secimBolgesi: 'Ankara 1. Bölge',
    partiKademesi: 'Genel Merkez',
    gorevler: ['Ekonomi Komisyonu Üyesi', 'Bütçe Komisyonu Üyesi'],
  },
  {
    id: '2',
    name: 'Mehmet Demir',
    username: 'mehmet_demir',
    email: 'mehmet@example.com',
    verified: true,
    role: UserRole.GAZETECI,
    location: { il: 'İstanbul', ilce: 'Kadıköy' },
    meslek: 'Gazeteci',
    yasGrubu: '35-44',
    createdAt: new Date('2019-06-20'),
    politPuan: 1234,
    politPuanHistory: [],
    stats: {
      followers: 8500,
      following: 1200,
      posts: 2100,
      avgPolitPuan: 1234,
    },
  },
  {
    id: '3',
    name: 'Ayşe Kaya',
    username: 'ayse_kaya',
    email: 'ayse@example.com',
    verified: true,
    role: UserRole.VATANDAS_DOGRULANMIS,
    location: { il: 'İzmir', ilce: 'Konak', mahalle: 'Alsancak' },
    meslek: 'Öğretmen',
    yasGrubu: '30-39',
    createdAt: new Date('2021-03-10'),
    politPuan: 856,
    politPuanHistory: [],
    stats: {
      followers: 450,
      following: 320,
      posts: 180,
      avgPolitPuan: 856,
    },
  },
  {
    id: '4',
    name: 'Can Özkan',
    username: 'can_ozkan',
    email: 'can@example.com',
    verified: true,
    role: UserRole.SİYASETCI_IL,
    party: 'CHP',
    location: { il: 'İzmir', ilce: 'Bornova' },
    meslek: 'Siyasetçi',
    yasGrubu: '40-49',
    createdAt: new Date('2018-11-05'),
    politPuan: 1520,
    politPuanHistory: [],
    stats: {
      followers: 6800,
      following: 650,
      posts: 890,
      avgPolitPuan: 1520,
    },
    partiKademesi: 'İl Yönetim Kurulu',
    gorevler: ['İl Başkan Yardımcısı'],
  },
]

// Mock postlar
export const mockPosts: Post[] = [
  {
    id: 'p1',
    authorId: '1',
    author: mockUsers[0],
    content: `Ekonomi politikalarımızın temel amacı, vatandaşlarımızın refah seviyesini artırmak ve sürdürülebilir büyümeyi sağlamaktır. 

Son dönemde aldığımız kararlar ve uyguladığımız politikalar, ülkemizin ekonomik gücünü artırmaya devam ediyor. 📈

#Ekonomi #Büyüme #Refah`,
    contentType: ContentType.METIN,
    topic: TopicCategory.EKONOMI,
    sentiment: ContentSentiment.DESTEKLEYICI,
    politPuan: 1843,
    location: { il: 'Ankara' },
    createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
    updatedAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
    stats: {
      views: 5200,
      comments: 45,
      reposts: 30,
      likes: 250,
    },
    aiAnalysis: {
      gerilimDerecesi: 35,
      viralPotansiyel: 65,
      partizanlikSkoru: 70,
      duyguAnalizi: {
        mutluluk: 60,
        ofke: 20,
        endise: 15,
        umut: 75,
      },
    },
    hashtags: ['Ekonomi', 'Büyüme', 'Refah'],
  },
  {
    id: 'p2',
    authorId: '2',
    author: mockUsers[1],
    content: `Bugün TBMM'de görüşülen yasa tasarısı hakkında detaylı bir analiz hazırladım. 

Özellikle eğitim bölümündeki değişiklikler dikkat çekici. Eğitim sistemimizin geleceği için önemli adımlar atılıyor. 🎓`,
    contentType: ContentType.METIN,
    topic: TopicCategory.EGITIM,
    sentiment: ContentSentiment.ELEŞTİREL,
    politPuan: 1234,
    location: { il: 'İstanbul' },
    createdAt: new Date(Date.now() - 5 * 60 * 60 * 1000),
    updatedAt: new Date(Date.now() - 5 * 60 * 60 * 1000),
    stats: {
      views: 3200,
      comments: 28,
      reposts: 15,
      likes: 180,
    },
    aiAnalysis: {
      gerilimDerecesi: 45,
      viralPotansiyel: 55,
      partizanlikSkoru: 30,
      duyguAnalizi: {
        mutluluk: 40,
        ofke: 30,
        endise: 50,
        umut: 45,
      },
    },
    hashtags: ['Eğitim', 'TBMM'],
  },
]

// Mock medya haberleri
export const mockMediaArticles: MediaArticle[] = [
  {
    id: 'm1',
    title: 'Ekonomi Bakanlığı Yeni Yatırım Paketini Açıkladı',
    content: 'Ekonomi Bakanlığı, ülke genelinde yeni yatırım paketini açıkladı...',
    source: 'Anadolu Ajansı',
    author: 'Fatma Şahin',
    publishedAt: new Date(Date.now() - 3 * 60 * 60 * 1000),
    category: TopicCategory.EKONOMI,
    tags: ['Ekonomi', 'Yatırım', 'Bakanlık'],
    relatedPoliticians: ['1'],
    relatedParties: ['AK Parti'],
    mediaType: 'haber',
    aiAnalysis: {
      tarafsizlikSkoru: 75,
      gerilimPuani: 40,
      partizanlikEtiketi: 'Orta',
      factCheckSkoru: 85,
    },
  },
]

// Mock gündem konuları
export const mockAgendaTopics: AgendaTopic[] = [
  {
    id: 'a1',
    title: 'Ekonomik Büyüme ve İstihdam',
    description: 'Ülke genelinde ekonomik büyüme ve istihdam konuları gündemde',
    category: 'ulke',
    priority: 9,
    createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
    relatedPosts: ['p1'],
    relatedMedia: ['m1'],
    partiDestekleri: {
      'AK Parti': 'destekliyor',
      'CHP': 'karsı',
      'MHP': 'destekliyor',
    },
    vatandasGorusleri: {
      olumlu: 65,
      olumsuz: 25,
      notr: 10,
    },
    trendSkoru: 85,
  },
]

// Mock teşkilat yapısı
export const mockOrganizations: Organization[] = [
  {
    id: 'org1',
    type: 'il',
    name: 'Ankara',
    location: { il: 'Ankara' },
    partiGucu: {
      'AK Parti': 45,
      'CHP': 35,
      'MHP': 12,
      'İYİ Parti': 8,
    },
    siyasetciAgı: ['1'],
    gundemIsiHaritasi: {
      'Ekonomi': 85,
      'Eğitim': 70,
      'Sağlık': 60,
    },
    vatandasGeriBildirimYogunlugu: 75,
    yoneticiler: {
      ilBaskani: 'org1_il_baskani',
      vekiller: ['1'],
    },
  },
]
