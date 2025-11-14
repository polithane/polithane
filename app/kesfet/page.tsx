'use client'

import { useState } from 'react'
import Navbar from '../components/Navbar'
import PostCard from '../components/PostCard'
import CreatePostModal from '../components/CreatePostModal'
import { useStore } from '../store/useStore'
import { Toaster } from 'react-hot-toast'

export default function KesfetPage() {
  const { posts, currentUser } = useStore()
  const [showCreateModal, setShowCreateModal] = useState(false)

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
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Keşfet</h1>
              <p className="text-gray-600">Yeni içerikler ve trend konular</p>
            </div>
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-6 py-3 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700 transition-colors shadow-md hover:shadow-lg flex items-center space-x-2"
            >
              <span className="text-xl">✏️</span>
              <span>Paylaş</span>
            </button>
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
        </div>

        {/* Posts */}
        <div className="space-y-6">
          {posts.map((post) => (
            <PostCard key={post.id} post={post} />
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
