'use client'

import { useState } from 'react'
import Navbar from './components/Navbar'
import PostCard from './components/PostCard'
import CreatePostModal from './components/CreatePostModal'
import { FeedType } from './types'
import { useStore } from './store/useStore'
import { UserRole } from './types'
import { Toaster } from 'react-hot-toast'

const feedTypes = [
  { id: FeedType.GENEL_GUNDEM, label: 'Genel Gündem', icon: '🌐' },
  { id: FeedType.PARTI_GUNDEMI, label: 'Parti Gündemi', icon: '🎯' },
  { id: FeedType.YEREL_GUNDEM, label: 'Yerel Gündem', icon: '📍' },
  { id: FeedType.TAKIP_EDILENLER, label: 'Takip Edilenler', icon: '👥' },
  { id: FeedType.TREND_OLAYLAR, label: 'Trend Olaylar', icon: '🔥' },
  { id: FeedType.MEDYA_AKISI, label: 'Medya Akışı', icon: '📺' },
  { id: FeedType.ANALITIK_ONERILEN, label: 'Önerilen', icon: '✨' },
]

export default function Home() {
  const { posts, currentUser } = useStore()
  const [activeFeed, setActiveFeed] = useState<FeedType>(FeedType.GENEL_GUNDEM)
  const [showDetailedAnalysis, setShowDetailedAnalysis] = useState(false)
  const [showCreateModal, setShowCreateModal] = useState(false)

  // Filter posts based on feed type
  const getFilteredPosts = () => {
    let filtered = [...posts]
    
    switch (activeFeed) {
      case FeedType.PARTI_GUNDEMI:
        filtered = filtered.filter(p => p.author.party)
        break
      case FeedType.TREND_OLAYLAR:
        filtered = filtered.sort((a, b) => b.politPuan - a.politPuan)
        break
      case FeedType.MEDYA_AKISI:
        filtered = filtered.filter(p => p.author.role === UserRole.GAZETECI)
        break
      case FeedType.TAKIP_EDILENLER:
        // In real app, filter by following list
        filtered = filtered.slice(0, 5)
        break
      default:
        break
    }
    
    return filtered
  }

  const filteredPosts = getFilteredPosts()

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
        {/* Feed Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Ana Sayfa</h1>
              <p className="text-gray-600 mt-1">Kişiselleştirilmiş içerik akışınız</p>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setShowCreateModal(true)}
                className="px-6 py-3 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700 transition-colors shadow-md hover:shadow-lg flex items-center space-x-2"
              >
                <span className="text-xl">✏️</span>
                <span>Paylaş</span>
              </button>
              <button
                onClick={() => setShowDetailedAnalysis(!showDetailedAnalysis)}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-300 transition-colors text-sm"
              >
                {showDetailedAnalysis ? '📊 Basit' : '📊 Detaylı'}
              </button>
            </div>
          </div>

          {/* Feed Type Tabs */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-2 overflow-x-auto">
            <div className="flex space-x-2">
              {feedTypes.map((feed) => (
                <button
                  key={feed.id}
                  onClick={() => setActiveFeed(feed.id)}
                  className={`px-4 py-2 rounded-lg font-medium text-sm whitespace-nowrap transition-all duration-200 ${
                    activeFeed === feed.id
                      ? 'bg-primary-600 text-white shadow-md scale-105'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <span className="mr-2">{feed.icon}</span>
                  {feed.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Stats Bar */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 hover:shadow-md transition-shadow">
            <div className="text-2xl font-bold text-primary-600">{filteredPosts.length}</div>
            <div className="text-sm text-gray-600 mt-1">Toplam Paylaşım</div>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 hover:shadow-md transition-shadow">
            <div className="text-2xl font-bold text-green-600">
              {filteredPosts.length > 0 
                ? Math.round(filteredPosts.reduce((sum, p) => sum + p.politPuan, 0) / filteredPosts.length)
                : 0}
            </div>
            <div className="text-sm text-gray-600 mt-1">Ortalama PolitPuan</div>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 hover:shadow-md transition-shadow">
            <div className="text-2xl font-bold text-orange-600">
              {filteredPosts.reduce((sum, p) => sum + p.stats.views, 0).toLocaleString()}
            </div>
            <div className="text-sm text-gray-600 mt-1">Toplam Görüntüleme</div>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 hover:shadow-md transition-shadow">
            <div className="text-2xl font-bold text-purple-600">
              {filteredPosts.reduce((sum, p) => sum + p.stats.likes, 0).toLocaleString()}
            </div>
            <div className="text-sm text-gray-600 mt-1">Toplam Beğeni</div>
          </div>
        </div>

        {/* Posts Feed */}
        <div className="space-y-6">
          {filteredPosts.length > 0 ? (
            filteredPosts.map((post) => (
              <PostCard
                key={post.id}
                post={post}
                showDetailedAnalysis={showDetailedAnalysis}
              />
            ))
          ) : (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
              <div className="text-6xl mb-4">📭</div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Henüz içerik yok</h3>
              <p className="text-gray-600 mb-4">Bu feed türü için henüz paylaşım bulunmuyor.</p>
              <button
                onClick={() => setShowCreateModal(true)}
                className="px-6 py-3 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700 transition-colors"
              >
                İlk Paylaşımı Yap
              </button>
            </div>
          )}
        </div>

        {/* Load More */}
        {filteredPosts.length > 0 && (
          <div className="mt-8 text-center">
            <button className="px-6 py-3 bg-white border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors shadow-sm hover:shadow-md">
              Daha Fazla Yükle
            </button>
          </div>
        )}
      </main>

      {/* Create Post Modal */}
      <CreatePostModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
      />
    </div>
  )
}
