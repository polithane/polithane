'use client'

import Navbar from '../components/Navbar'
import PostCard from '../components/PostCard'
import { mockUsers, mockPosts } from '../lib/mockData'
import { UserRole } from '../types'
import { getRoleDisplayName } from '../lib/permissions'

export default function ProfilPage() {
  // Mock current user - in real app, get from auth context
  const userProfile = mockUsers[0] // Ahmet Yılmaz - Milletvekili
  const userPosts = mockPosts.filter(p => p.authorId === userProfile.id)

  const currentUser = {
    id: userProfile.id,
    name: userProfile.name,
    username: userProfile.username,
    role: userProfile.role,
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar currentUser={currentUser} />
      
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
              <button className="mt-4 px-6 py-2 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700 transition-colors shadow-sm">
                Takip Et
              </button>
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

            {/* Milletvekili Özel Bilgiler */}
            {userProfile.role === UserRole.MILLETVEKILI && (
              <div className="mt-4 pt-4 border-t border-gray-200">
                <h3 className="font-semibold text-gray-900 mb-2">Milletvekili Bilgileri</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  {userProfile.secimBolgesi && (
                    <div>
                      <span className="text-gray-600">Seçim Bölgesi:</span>
                      <span className="ml-2 font-medium text-gray-900">{userProfile.secimBolgesi}</span>
                    </div>
                  )}
                  {userProfile.partiKademesi && (
                    <div>
                      <span className="text-gray-600">Parti Kademesi:</span>
                      <span className="ml-2 font-medium text-gray-900">{userProfile.partiKademesi}</span>
                    </div>
                  )}
                  {userProfile.gorevler && userProfile.gorevler.length > 0 && (
                    <div className="md:col-span-2">
                      <span className="text-gray-600">Görevler:</span>
                      <div className="mt-1 flex flex-wrap gap-2">
                        {userProfile.gorevler.map((gorev, idx) => (
                          <span key={idx} className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs">
                            {gorev}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
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
              <p className="text-gray-600">Bu kullanıcı henüz içerik paylaşmamış.</p>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
