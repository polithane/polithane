'use client'

import { useState } from 'react'
import Navbar from '../components/Navbar'
import PostCard from '../components/PostCard'
import CreatePostModal from '../components/CreatePostModal'
import { useStore } from '../store/useStore'
import { Toaster } from 'react-hot-toast'

export default function TrendPage() {
  const { posts, currentUser } = useStore()
  const [showCreateModal, setShowCreateModal] = useState(false)

  // Sort by PolitPuan
  const trendingPosts = [...posts].sort((a, b) => b.politPuan - a.politPuan)

  const currentUserForNavbar = currentUser ? {
    id: currentUser.id,
    name: currentUser.name,
    username: currentUser.username,
    role: currentUser.role,
  } : undefined

  return (
    <div className="min-h-screen bg-gray-50">
      <Toaster position="top-right" />
      <Navbar currentUser={currentUserForNavbar} />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">🔥 Trend</h1>
              <p className="text-gray-600">Şu anda en çok konuşulan içerikler</p>
            </div>
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-6 py-3 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700 transition-colors shadow-md hover:shadow-lg flex items-center space-x-2"
            >
              <span className="text-xl">✏️</span>
              <span>Paylaş</span>
            </button>
          </div>
        </div>

        {/* Trending Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
            <div className="text-3xl font-bold text-primary-600">12.5K</div>
            <div className="text-sm text-gray-600 mt-1">Günlük Aktif Kullanıcı</div>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
            <div className="text-3xl font-bold text-green-600">2.1K</div>
            <div className="text-sm text-gray-600 mt-1">Ortalama PolitPuan</div>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
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

      <CreatePostModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
      />
    </div>
  )
}
