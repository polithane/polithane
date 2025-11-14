import Navbar from './components/Navbar'
import PostCard from './components/PostCard'

// Mock data - gerçek uygulamada API'den gelecek
const mockPosts = [
  {
    author: {
      name: 'Ahmet Yılmaz',
      username: 'ahmet_yilmaz',
      verified: true,
      role: 'Milletvekili',
      party: 'AK Parti',
    },
    content: `Ekonomi politikalarımızın temel amacı, vatandaşlarımızın refah seviyesini artırmak ve sürdürülebilir büyümeyi sağlamaktır. 

Son dönemde aldığımız kararlar ve uyguladığımız politikalar, ülkemizin ekonomik gücünü artırmaya devam ediyor. 📈

#Ekonomi #Büyüme #Refah`,
    timestamp: '2 saat önce',
    location: 'Ankara',
    politPuan: 1843,
    topic: 'Ekonomi',
    sentiment: 'Olumlu',
    stats: {
      views: 5200,
      comments: 45,
      reposts: 30,
      likes: 250,
    },
  },
  {
    author: {
      name: 'Mehmet Demir',
      username: 'mehmet_demir',
      verified: false,
      role: 'Gazeteci',
    },
    content: `Bugün TBMM'de görüşülen yasa tasarısı hakkında detaylı bir analiz hazırladım. 

Özellikle eğitim bölümündeki değişiklikler dikkat çekici. Eğitim sistemimizin geleceği için önemli adımlar atılıyor. 🎓

Detaylar için linke tıklayabilirsiniz.`,
    timestamp: '5 saat önce',
    location: 'İstanbul',
    politPuan: 1234,
    topic: 'Eğitim',
    sentiment: 'Eleştirel',
    stats: {
      views: 3200,
      comments: 28,
      reposts: 15,
      likes: 180,
    },
  },
  {
    author: {
      name: 'Ayşe Kaya',
      username: 'ayse_kaya',
      verified: true,
      role: 'Vatandaş',
    },
    content: `Sağlık sistemimizin güçlendirilmesi için yapılan yatırımları takdir ediyorum. 

Özellikle kırsal bölgelerdeki sağlık hizmetlerinin iyileştirilmesi çok önemli. 👨‍⚕️

#Sağlık #HalkSağlığı`,
    timestamp: '1 gün önce',
    location: 'İzmir',
    politPuan: 856,
    topic: 'Sağlık',
    sentiment: 'Olumlu',
    stats: {
      views: 1800,
      comments: 12,
      reposts: 8,
      likes: 95,
    },
  },
  {
    author: {
      name: 'Can Özkan',
      username: 'can_ozkan',
      verified: false,
      role: 'Siyasetçi',
      party: 'CHP',
    },
    content: `Dış politikada attığımız adımlar, ülkemizin bölgesel ve küresel konumunu güçlendiriyor. 

Diplomasi ve işbirliği, barış ve refahın temelidir. 🌍

#DışPolitika #Diplomasi`,
    timestamp: '1 gün önce',
    location: 'Ankara',
    politPuan: 1520,
    topic: 'Dış Politika',
    sentiment: 'Olumlu',
    stats: {
      views: 4100,
      comments: 35,
      reposts: 22,
      likes: 210,
    },
  },
]

export default function Home() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      
      <main className="max-w-4xl mx-auto px-4 py-8">
        {/* Feed Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-bold text-gray-900">Ana Sayfa</h1>
            <div className="flex space-x-2">
              <button className="px-4 py-2 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700 transition-colors">
                Sana Özel
              </button>
              <button className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-300 transition-colors">
                Takip
              </button>
              <button className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-300 transition-colors">
                Trend
              </button>
            </div>
          </div>
        </div>

        {/* Posts Feed */}
        <div className="space-y-6">
          {mockPosts.map((post, index) => (
            <PostCard key={index} {...post} />
          ))}
        </div>

        {/* Load More */}
        <div className="mt-8 text-center">
          <button className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-300 transition-colors">
            Daha Fazla Yükle
          </button>
        </div>
      </main>
    </div>
  )
}
