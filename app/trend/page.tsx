import Navbar from '../components/Navbar'
import PostCard from '../components/PostCard'

const trendingPosts = [
  {
    author: {
      name: 'Zeynep Arslan',
      username: 'zeynep_arslan',
      verified: true,
      role: 'Milletvekili',
      party: 'CHP',
    },
    content: `Bugün TBMM'de önemli bir yasa tasarısı görüşüldü. 

Çevre koruma ve sürdürülebilirlik konularında atılan bu adımlar, gelecek nesiller için çok değerli. 🌱

#Çevre #Sürdürülebilirlik #Gelecek`,
    timestamp: '1 saat önce',
    location: 'Ankara',
    politPuan: 1950,
    topic: 'Çevre',
    sentiment: 'Olumlu',
    stats: {
      views: 12500,
      comments: 180,
      reposts: 120,
      likes: 650,
    },
  },
  {
    author: {
      name: 'Mustafa Yıldız',
      username: 'mustafa_yildiz',
      verified: true,
      role: 'Bakan',
      party: 'AK Parti',
    },
    content: `Dijital dönüşüm projelerimiz hızla ilerliyor. 

e-Devlet altyapısındaki iyileştirmeler, vatandaşlarımızın hayatını kolaylaştırıyor. 💻

#DijitalDönüşüm #eDevlet #Teknoloji`,
    timestamp: '4 saat önce',
    location: 'Ankara',
    politPuan: 2200,
    topic: 'Teknoloji',
    sentiment: 'Olumlu',
    stats: {
      views: 15200,
      comments: 210,
      reposts: 145,
      likes: 890,
    },
  },
]

export default function TrendPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      
      <main className="max-w-4xl mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">🔥 Trend</h1>
          <p className="text-gray-600">Şu anda en çok konuşulan içerikler</p>
        </div>

        {/* Trending Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="text-3xl font-bold text-primary-600">12.5K</div>
            <div className="text-sm text-gray-600 mt-1">Günlük Aktif Kullanıcı</div>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="text-3xl font-bold text-green-600">2.1K</div>
            <div className="text-sm text-gray-600 mt-1">Ortalama PolitPuan</div>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="text-3xl font-bold text-orange-600">45K</div>
            <div className="text-sm text-gray-600 mt-1">Toplam Paylaşım</div>
          </div>
        </div>

        {/* Posts */}
        <div className="space-y-6">
          {trendingPosts.map((post, index) => (
            <PostCard key={index} {...post} />
          ))}
        </div>
      </main>
    </div>
  )
}
