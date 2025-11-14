'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Post, ContentType, TopicCategory, ContentSentiment, UserRole } from '../types'
import { useStore } from '../store/useStore'
import { calculatePolitPuan } from '../lib/politPuan'
import toast from 'react-hot-toast'

interface CreatePostModalProps {
  isOpen: boolean
  onClose: () => void
}

export default function CreatePostModal({ isOpen, onClose }: CreatePostModalProps) {
  const { addPost, currentUser, posts } = useStore()
  const [content, setContent] = useState('')
  const [contentType, setContentType] = useState<ContentType>(ContentType.METIN)
  const [topic, setTopic] = useState<TopicCategory>(TopicCategory.EKONOMI)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async () => {
    if (!content.trim() || !currentUser) {
      toast.error('Lütfen içerik girin')
      return
    }

    if (content.length > 5000) {
      toast.error('İçerik çok uzun (max 5000 karakter)')
      return
    }

    setIsSubmitting(true)

    try {
      // Yeni post oluştur
      const newPost: Post = {
        id: `post_${Date.now()}`,
        authorId: currentUser.id,
        author: currentUser,
        content: content.trim(),
        contentType,
        topic,
        sentiment: ContentSentiment.NÖTR,
        politPuan: 0,
        location: currentUser.location,
        createdAt: new Date(),
        updatedAt: new Date(),
        stats: {
          views: 0,
          comments: 0,
          reposts: 0,
          likes: 0,
        },
        aiAnalysis: {
          gerilimDerecesi: 30,
          viralPotansiyel: 50,
          partizanlikSkoru: 40,
          duyguAnalizi: {
            mutluluk: 50,
            ofke: 20,
            endise: 20,
            umut: 60,
          },
        },
        hashtags: content.match(/#\w+/g)?.map(tag => tag.slice(1)) || [],
      }

      // PolitPuan hesapla
      const recentPosts = posts.filter(p => p.authorId === currentUser.id).slice(0, 5)
      const politPuanLayers = calculatePolitPuan(currentUser, newPost, recentPosts)
      newPost.politPuan = politPuanLayers.finalSkor

      // Post'u ekle
      addPost(newPost)
      
      toast.success('Paylaşımınız yayınlandı!')
      setContent('')
      setContentType(ContentType.METIN)
      onClose()
    } catch (error) {
      toast.error('Bir hata oluştu')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!isOpen) return null

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        />

        {/* Modal */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <h2 className="text-2xl font-bold text-gray-900">Yeni Paylaşım</h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6">
            {/* User Info */}
            <div className="flex items-center space-x-3 mb-6">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center text-white font-bold text-lg">
                {currentUser?.name.charAt(0) || 'U'}
              </div>
              <div>
                <div className="font-semibold text-gray-900">{currentUser?.name}</div>
                <div className="text-sm text-gray-600">@{currentUser?.username}</div>
              </div>
            </div>

            {/* Textarea */}
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Ne düşünüyorsun?"
              className="w-full h-64 p-4 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none text-lg"
              maxLength={5000}
            />

            {/* Character Count */}
            <div className="flex justify-between items-center mt-2">
              <div className="text-sm text-gray-500">
                {content.length} / 5000 karakter
              </div>
              <div className="flex space-x-2">
                <button className="text-sm text-primary-600 hover:text-primary-700">
                  📷 Fotoğraf
                </button>
                <button className="text-sm text-primary-600 hover:text-primary-700">
                  🎥 Video
                </button>
                <button className="text-sm text-primary-600 hover:text-primary-700">
                  📊 Anket
                </button>
              </div>
            </div>

            {/* Options */}
            <div className="mt-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Konu Kategorisi
                </label>
                <select
                  value={topic}
                  onChange={(e) => setTopic(e.target.value as TopicCategory)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                >
                  {Object.values(TopicCategory).map((cat) => (
                    <option key={cat} value={cat}>
                      {cat.replace('_', ' ').toUpperCase()}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  İçerik Türü
                </label>
                <div className="flex space-x-2">
                  {[
                    { type: ContentType.METIN, label: '📝 Metin', icon: '📝' },
                    { type: ContentType.FOTOGRAF, label: '📷 Fotoğraf', icon: '📷' },
                    { type: ContentType.VIDEO, label: '🎥 Video', icon: '🎥' },
                    { type: ContentType.ANKET, label: '📊 Anket', icon: '📊' },
                  ].map(({ type, label, icon }) => (
                    <button
                      key={type}
                      onClick={() => setContentType(type)}
                      className={`flex-1 px-4 py-3 rounded-lg border-2 transition-all ${
                        contentType === type
                          ? 'border-primary-500 bg-primary-50 text-primary-700'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="text-2xl mb-1">{icon}</div>
                      <div className="text-xs font-medium">{label.split(' ')[1]}</div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between p-6 border-t border-gray-200 bg-gray-50">
            <button
              onClick={onClose}
              className="px-6 py-2 text-gray-700 hover:bg-gray-200 rounded-lg font-medium transition-colors"
            >
              İptal
            </button>
            <button
              onClick={handleSubmit}
              disabled={isSubmitting || !content.trim()}
              className="px-6 py-2 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isSubmitting ? 'Yayınlanıyor...' : 'Paylaş'}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}
