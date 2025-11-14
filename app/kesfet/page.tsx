'use client'

import Navbar from '../components/Navbar'
import PostCard from '../components/PostCard'
import { mockPosts, mockUsers } from '../lib/mockData'
import { UserRole } from '../types'

export default function KesfetPage() {
  // Mock current user
  const currentUser = {
    id: '3',
    name: mockUsers[2].name,
    username: mockUsers[2].username,
    role: UserRole.VATANDAS_DOGRULANMIS,
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar currentUser={currentUser} />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Keşfet</h1>
          <p className="text-gray-600">Yeni içerikler ve trend konular</p>
        </div>
          
        {/* Search Bar */}
        <div className="mb-6">
          <div className="relative">
            <input
              type="text"
              placeholder="Konu, kişi veya hashtag ara..."
              className="w-full px-4 py-3 pl-12 rounded-xl border border-gray-300 focus:ring-2 focus:ring-primary-500 focus:border-transparent shadow-sm"
            />
            <span className="absolute left-4 top-3.5 text-gray-400 text-xl">🔍</span>
          </div>
        </div>

        {/* Trending Topics */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">🔥 Trend Konular</h2>
          <div className="flex flex-wrap gap-2">
            {['Ekonomi', 'Eğitim', 'Sağlık', 'Ulaşım', 'DışPolitika', 'Çevre'].map((tag) => (
              <button
                key={tag}
                className="px-4 py-2 bg-primary-100 text-primary-700 rounded-full text-sm font-medium hover:bg-primary-200 transition-colors"
              >
                #{tag}
              </button>
            ))}
          </div>
        </div>

        {/* Posts */}
        <div className="space-y-6">
          {mockPosts.map((post) => (
            <PostCard key={post.id} post={post} />
          ))}
        </div>
      </main>
    </div>
  )
}
