'use client'

import Navbar from '../components/Navbar'
import PostCard from '../components/PostCard'
import { mockPosts, mockUsers } from '../lib/mockData'
import { UserRole } from '../types'

export default function TrendPage() {
  // Mock current user
  const currentUser = {
    id: '3',
    name: mockUsers[2].name,
    username: mockUsers[2].username,
    role: UserRole.VATANDAS_DOGRULANMIS,
  }

  // Sort by PolitPuan
  const trendingPosts = [...mockPosts].sort((a, b) => b.politPuan - a.politPuan)

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar currentUser={currentUser} />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">🔥 Trend</h1>
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
          {trendingPosts.map((post) => (
            <PostCard key={post.id} post={post} showDetailedAnalysis={true} />
          ))}
        </div>
      </main>
    </div>
  )
}
