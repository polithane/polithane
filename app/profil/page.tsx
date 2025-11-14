'use client'

import { useState } from 'react'
import Navbar from '../components/Navbar'
import PostCard from '../components/PostCard'
import CreatePostModal from '../components/CreatePostModal'
import { useStore } from '../store/useStore'
import { getRoleDisplayName } from '../lib/permissions'
import { Toaster } from 'react-hot-toast'

export default function ProfilPage() {
  const { posts, currentUser } = useStore()
  const [showCreateModal, setShowCreateModal] = useState(false)
  
  // Use current user or default to first mock user
  const userProfile = currentUser || useStore.getState().posts[0]?.author
  const userPosts = posts.filter(p => p.authorId === userProfile?.id)

  const currentUserForNavbar = currentUser ? {
    id: currentUser.id,
    name: currentUser.name,
    username: currentUser.username,
    role: currentUser.role,
  } : undefined

  if (!userProfile) {
    return <div>Kullanıcı bulunamadı</div>
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Toaster position="top-right" />
      <Navbar currentUser={currentUserForNavbar} />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Profile Header */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 mb-6 overflow-hidden">
          {/* Cover Image */}
          <div className="h-48 bg-gradient-to-r from-primary-500 via-primary-600 to-primary-700 relative">
            <div className="absolute inset-0 bg-black bg-opacity-10"></div>
          </div>
          
          {/* Profile Info */}
          <div className="px-6 pb-6">
            <div className="flex items-start justify-between -mt-16 mb-4">
              <div className="w-32 h-32 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center text-white font-bold text-4xl border-4 border-white shadow-lg">
                {userProfile.name.charAt(0)}
              </div>
              <div className="flex space-x-2 mt-4">
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-300 transition-colors"
                >
                  Paylaş
                </button>
                <button className="px-6 py-2 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700 transition-colors shadow-sm">
                  Takip Et
                </button>
              </div>
            </div>
            
            <div className="mb-4">
              <div className="flex items-center space-x-2 mb-2">
                <h1 className="text-3xl font-bold text-gray-900">{userProfile.name}</h1>
                {userProfile.verified && (
                  <span className="text-blue-500 text-2xl" title="Doğrulanmış">✓</span>
                )}
              </div>
              <p className="text-gray-600 text-lg">@{userProfile.username}</p>
              <p className="text-gray-800 mt-3 text-lg">{userProfile.bio || 'Profil açıklaması buraya gelecek'}</p>
              <div className="flex items-center space-x-4 mt-4 text-sm text-gray-600 flex-wrap">
                <span>📍 {userProfile.location.il}{userProfile.location.ilce && `, ${userProfile.location.ilce}`}</span>
                <span>📅 {new Date(userProfile.createdAt).getFullYear()} tarihinden beri</span>
                {userProfile.meslek && <span>💼 {userProfile.meslek}</span>}
              </div>
              <div className="flex items-center space-x-2 mt-3">
                <span className="px-3 py-1 rounded-full bg-purple-100 text-purple-700 text-sm font-medium">
                  {getRoleDisplayName(userProfile.role)}
                </span>
                {userProfile.party && (
                  <span className="px-3 py-1 rounded-full bg-red-100 text-red-700 text-sm font-medium">
                    {userProfile.party}
                  </span>
                )}
              </div>
            </div>

            {/* Stats */}
            <div className="flex items-center space-x-8 pt-4 border-t border-gray-200 flex-wrap">
              <div>
                <span className="font-bold text-gray-900 text-lg">{userProfile.stats.posts.toLocaleString()}</span>
                <span className="text-gray-600 ml-2">Paylaşım</span>
              </div>
              <div>
                <span className="font-bold text-gray-900 text-lg">{userProfile.stats.followers.toLocaleString()}</span>
                <span className="text-gray-600 ml-2">Takipçi</span>
              </div>
              <div>
                <span className="font-bold text-gray-900 text-lg">{userProfile.stats.following.toLocaleString()}</span>
                <span className="text-gray-600 ml-2">Takip</span>
              </div>
              <div>
                <span className="font-bold text-primary-600 text-lg">🔥 {userProfile.politPuan.toLocaleString()}</span>
                <span className="text-gray-600 ml-2">PolitPuan</span>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex space-x-4 mb-6 border-b border-gray-200 bg-white rounded-t-xl px-6 pt-4">
          <button className="px-4 py-2 border-b-2 border-primary-600 text-primary-600 font-medium">
            Paylaşımlar
          </button>
          <button className="px-4 py-2 text-gray-600 hover:text-gray-900 transition-colors">
            Medya
          </button>
          <button className="px-4 py-2 text-gray-600 hover:text-gray-900 transition-colors">
            Beğeniler
          </button>
          <button className="px-4 py-2 text-gray-600 hover:text-gray-900 transition-colors">
            PolitPuan Geçmişi
          </button>
        </div>

        {/* Posts */}
        <div className="space-y-6">
          {userPosts.length > 0 ? (
            userPosts.map((post) => (
              <PostCard key={post.id} post={post} />
            ))
          ) : (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
              <div className="text-6xl mb-4">📭</div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Henüz paylaşım yok</h3>
              <p className="text-gray-600 mb-4">Bu kullanıcı henüz içerik paylaşmamış.</p>
              <button
                onClick={() => setShowCreateModal(true)}
                className="px-6 py-3 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700 transition-colors"
              >
                İlk Paylaşımı Yap
              </button>
            </div>
          )}
        </div>
      </main>

      <CreatePostModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
      />
    </div>
  )
}
