import Navbar from '../components/Navbar'
import PostCard from '../components/PostCard'

const userProfile = {
  name: 'Ahmet Yılmaz',
  username: 'ahmet_yilmaz',
  verified: true,
  role: 'Milletvekili',
  party: 'AK Parti',
  bio: 'Ankara Milletvekili | Ekonomi ve Kalkınma Komisyonu Üyesi | Vatandaşlarımızın refahı için çalışıyorum.',
  location: 'Ankara, Türkiye',
  joinDate: 'Ocak 2020',
  stats: {
    posts: 1245,
    followers: 12500,
    following: 890,
    politPuan: 1843,
  },
}

const userPosts = [
  {
    author: {
      name: 'Ahmet Yılmaz',
      username: 'ahmet_yilmaz',
      verified: true,
      role: 'Milletvekili',
      party: 'AK Parti',
    },
    content: `Bugün komisyon toplantısında önemli kararlar aldık. 

Ekonomi politikalarımızın vatandaşlarımıza olan etkisini değerlendirdik ve yeni öneriler geliştirdik. 📊`,
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
]

export default function ProfilPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      
      <main className="max-w-4xl mx-auto px-4 py-8">
        {/* Profile Header */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 mb-6 overflow-hidden">
          {/* Cover Image */}
          <div className="h-48 bg-gradient-to-r from-primary-500 to-primary-700"></div>
          
          {/* Profile Info */}
          <div className="px-6 pb-6">
            <div className="flex items-start justify-between -mt-16 mb-4">
              <div className="w-32 h-32 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center text-white font-bold text-4xl border-4 border-white shadow-lg">
                {userProfile.name.charAt(0)}
              </div>
              <button className="mt-4 px-6 py-2 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700 transition-colors">
                Takip Et
              </button>
            </div>
            
            <div className="mb-4">
              <div className="flex items-center space-x-2 mb-2">
                <h1 className="text-2xl font-bold text-gray-900">{userProfile.name}</h1>
                {userProfile.verified && (
                  <span className="text-blue-500 text-xl" title="Doğrulanmış">✓</span>
                )}
              </div>
              <p className="text-gray-600">@{userProfile.username}</p>
              <p className="text-gray-800 mt-2">{userProfile.bio}</p>
              <div className="flex items-center space-x-4 mt-3 text-sm text-gray-600">
                <span>📍 {userProfile.location}</span>
                <span>📅 {userProfile.joinDate} tarihinden beri</span>
              </div>
            </div>

            {/* Stats */}
            <div className="flex items-center space-x-6 pt-4 border-t border-gray-200">
              <div>
                <span className="font-bold text-gray-900">{userProfile.stats.posts.toLocaleString()}</span>
                <span className="text-gray-600 ml-1">Paylaşım</span>
              </div>
              <div>
                <span className="font-bold text-gray-900">{userProfile.stats.followers.toLocaleString()}</span>
                <span className="text-gray-600 ml-1">Takipçi</span>
              </div>
              <div>
                <span className="font-bold text-gray-900">{userProfile.stats.following.toLocaleString()}</span>
                <span className="text-gray-600 ml-1">Takip</span>
              </div>
              <div>
                <span className="font-bold text-primary-600">🔥 {userProfile.stats.politPuan.toLocaleString()}</span>
                <span className="text-gray-600 ml-1">PolitPuan</span>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex space-x-4 mb-6 border-b border-gray-200">
          <button className="px-4 py-2 border-b-2 border-primary-600 text-primary-600 font-medium">
            Paylaşımlar
          </button>
          <button className="px-4 py-2 text-gray-600 hover:text-gray-900">
            Medya
          </button>
          <button className="px-4 py-2 text-gray-600 hover:text-gray-900">
            Beğeniler
          </button>
        </div>

        {/* Posts */}
        <div className="space-y-6">
          {userPosts.map((post, index) => (
            <PostCard key={index} {...post} />
          ))}
        </div>
      </main>
    </div>
  )
}
