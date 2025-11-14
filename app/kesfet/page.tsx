import Navbar from '../components/Navbar'
import PostCard from '../components/PostCard'

const trendingPosts = [
  {
    author: {
      name: 'Fatma Şahin',
      username: 'fatma_sahin',
      verified: true,
      role: 'Belediye Başkanı',
      party: 'AK Parti',
    },
    content: `Şehrimizdeki yeni metro hattı projesi için çalışmalar başladı! 🚇

Bu proje, şehrimizin ulaşım sorununu büyük ölçüde çözecek ve vatandaşlarımıza daha konforlu bir ulaşım imkanı sunacak.

#Ulaşım #Metro #ŞehirGelişimi`,
    timestamp: '3 saat önce',
    location: 'Bursa',
    politPuan: 2100,
    topic: 'Ulaşım',
    sentiment: 'Olumlu',
    stats: {
      views: 8900,
      comments: 120,
      reposts: 85,
      likes: 450,
    },
  },
  {
    author: {
      name: 'Ali Vural',
      username: 'ali_vural',
      verified: false,
      role: 'Ekonomist',
    },
    content: `Enflasyon rakamları açıklandı. Son dönemdeki düşüş trendi devam ediyor. 

Ekonomi politikalarının etkisini görmek umut verici. 📊

Detaylı analiz için blog yazıma göz atabilirsiniz.`,
    timestamp: '6 saat önce',
    location: 'Ankara',
    politPuan: 1650,
    topic: 'Ekonomi',
    sentiment: 'Eleştirel',
    stats: {
      views: 7200,
      comments: 95,
      reposts: 60,
      likes: 380,
    },
  },
]

export default function KesfetPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      
      <main className="max-w-4xl mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Keşfet</h1>
          
          {/* Search Bar */}
          <div className="mb-6">
            <div className="relative">
              <input
                type="text"
                placeholder="Konu, kişi veya hashtag ara..."
                className="w-full px-4 py-3 pl-12 rounded-lg border border-gray-300 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
              <span className="absolute left-4 top-3.5 text-gray-400">🔍</span>
            </div>
          </div>

          {/* Trending Topics */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Trend Konular</h2>
            <div className="flex flex-wrap gap-2">
              {['#Ekonomi', '#Eğitim', '#Sağlık', '#Ulaşım', '#DışPolitika', '#Çevre'].map((tag) => (
                <button
                  key={tag}
                  className="px-4 py-2 bg-primary-100 text-primary-700 rounded-full text-sm font-medium hover:bg-primary-200 transition-colors"
                >
                  {tag}
                </button>
              ))}
            </div>
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
