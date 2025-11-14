'use client'

import { useState } from 'react'
import { Post } from '../types'
import { getRoleDisplayName } from '../lib/permissions'
import { formatDistanceToNow } from 'date-fns'
import { tr } from 'date-fns/locale'
import { useStore } from '../store/useStore'
import { motion } from 'framer-motion'
import toast from 'react-hot-toast'

interface PostCardProps {
  post: Post
  showDetailedAnalysis?: boolean
}

export default function PostCard({ post, showDetailedAnalysis = false }: PostCardProps) {
  const { likePost, unlikePost, repost, likedPosts, repostedPosts, currentUser } = useStore()
  const [showComments, setShowComments] = useState(false)
  const [commentText, setCommentText] = useState('')
  const [isLiking, setIsLiking] = useState(false)

  const isLiked = likedPosts.has(post.id)
  const isReposted = repostedPosts.has(post.id)

  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`
    return num.toString()
  }

  const getPolitPuanColor = (score: number) => {
    if (score >= 1500) return 'text-green-700 bg-green-100 border-green-300'
    if (score >= 1000) return 'text-yellow-700 bg-yellow-100 border-yellow-300'
    return 'text-gray-700 bg-gray-100 border-gray-300'
  }

  const getSentimentEmoji = (sentiment: string) => {
    switch (sentiment) {
      case 'elestirel': return '😠'
      case 'destekleyici': return '😊'
      case 'tartismali': return '⚡'
      case 'kriz_afet': return '🚨'
      default: return '😐'
    }
  }

  const getTopicEmoji = (topic: string) => {
    const emojis: Record<string, string> = {
      'ekonomi': '💰',
      'egitim': '🎓',
      'saglik': '🏥',
      'dis_politika': '🌍',
      'guvenlik': '🛡️',
      'cevre': '🌱',
      'ulastirma': '🚇',
      'teknoloji': '💻',
    }
    return emojis[topic] || '📌'
  }

  const handleLike = async () => {
    if (isLiking) return
    setIsLiking(true)
    
    try {
      if (isLiked) {
        unlikePost(post.id)
        toast.success('Beğeni kaldırıldı')
      } else {
        likePost(post.id)
        toast.success('Beğenildi ❤️')
      }
    } catch (error) {
      toast.error('Bir hata oluştu')
    } finally {
      setTimeout(() => setIsLiking(false), 300)
    }
  }

  const handleRepost = () => {
    repost(post.id)
    toast.success(isReposted ? 'Paylaşım kaldırıldı' : 'Paylaşıldı 🔄')
  }

  const handleComment = () => {
    if (!commentText.trim()) {
      toast.error('Lütfen yorum yazın')
      return
    }
    toast.success('Yorum eklendi 💬')
    setCommentText('')
    setShowComments(false)
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-all duration-200"
    >
      {/* Header */}
      <div className="p-6 pb-4">
        <div className="flex items-start justify-between">
          <div className="flex items-start space-x-3 flex-1">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center text-white font-bold text-lg flex-shrink-0 cursor-pointer hover:scale-110 transition-transform">
              {post.author.name.charAt(0)}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center space-x-2 flex-wrap">
                <h3 className="font-semibold text-gray-900 cursor-pointer hover:text-primary-600 transition-colors">
                  {post.author.name}
                </h3>
                {post.author.verified && (
                  <span className="text-blue-500 text-sm" title="Doğrulanmış">✓</span>
                )}
                <span className="px-2 py-0.5 text-xs rounded-full bg-purple-100 text-purple-700 font-medium">
                  {getRoleDisplayName(post.author.role)}
                </span>
                {post.author.party && (
                  <span className="px-2 py-0.5 text-xs rounded-full bg-red-100 text-red-700 font-medium">
                    {post.author.party}
                  </span>
                )}
              </div>
              <div className="flex items-center space-x-2 text-sm text-gray-500 mt-1 flex-wrap">
                <span className="cursor-pointer hover:text-primary-600">@{post.author.username}</span>
                {post.location && (
                  <>
                    <span>·</span>
                    <span>📍 {post.location.il}{post.location.ilce && `, ${post.location.ilce}`}</span>
                  </>
                )}
                <span>·</span>
                <span>{formatDistanceToNow(post.createdAt, { addSuffix: true, locale: tr })}</span>
              </div>
            </div>
          </div>
          <button className="text-gray-400 hover:text-gray-600 p-1 hover:bg-gray-100 rounded-lg transition-colors">
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
            </svg>
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="px-6 pb-4">
        <p className="text-gray-800 leading-relaxed whitespace-pre-wrap break-words text-base">
          {post.content}
        </p>
        {post.hashtags && post.hashtags.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-3">
            {post.hashtags.map((tag, idx) => (
              <span key={idx} className="text-primary-600 hover:text-primary-700 font-medium text-sm cursor-pointer">
                #{tag}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Metadata Bar */}
      <div className="px-6 pb-4 flex flex-wrap items-center gap-3">
        <div className={`px-3 py-1.5 rounded-full text-sm font-semibold border ${getPolitPuanColor(post.politPuan)}`}>
          🔥 {post.politPuan.toLocaleString()}
        </div>
        <div className="px-3 py-1.5 rounded-full text-sm bg-blue-100 text-blue-700 font-medium">
          {getTopicEmoji(post.topic)} {post.topic.replace('_', ' ').toUpperCase()}
        </div>
        <div className="px-3 py-1.5 rounded-full text-sm bg-orange-100 text-orange-700 font-medium">
          {getSentimentEmoji(post.sentiment)} {post.sentiment.replace('_', ' ').toUpperCase()}
        </div>
      </div>

      {/* Stats & Actions */}
      <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between">
        <div className="flex items-center space-x-6 text-gray-500">
          <button className="flex items-center space-x-2 hover:text-primary-600 transition-colors group">
            <span className="text-lg group-hover:scale-110 transition-transform">👁️</span>
            <span className="text-sm font-medium">{formatNumber(post.stats.views)}</span>
          </button>
          
          <button
            onClick={() => setShowComments(!showComments)}
            className="flex items-center space-x-2 hover:text-primary-600 transition-colors group"
          >
            <span className="text-lg group-hover:scale-110 transition-transform">💬</span>
            <span className="text-sm font-medium">{formatNumber(post.stats.comments)}</span>
          </button>
          
          <button
            onClick={handleRepost}
            className={`flex items-center space-x-2 transition-colors group ${
              isReposted ? 'text-green-600' : 'hover:text-primary-600'
            }`}
          >
            <motion.span
              animate={{ rotate: isReposted ? 360 : 0 }}
              transition={{ duration: 0.3 }}
              className="text-lg group-hover:scale-110 transition-transform"
            >
              🔄
            </motion.span>
            <span className="text-sm font-medium">{formatNumber(post.stats.reposts)}</span>
          </button>
          
          <button
            onClick={handleLike}
            disabled={isLiking}
            className={`flex items-center space-x-2 transition-colors group ${
              isLiked ? 'text-red-500' : 'hover:text-red-500'
            }`}
          >
            <motion.span
              animate={{ scale: isLiked ? [1, 1.3, 1] : 1 }}
              transition={{ duration: 0.3 }}
              className="text-lg group-hover:scale-110 transition-transform"
            >
              {isLiked ? '❤️' : '🤍'}
            </motion.span>
            <span className="text-sm font-medium">{formatNumber(post.stats.likes)}</span>
          </button>
        </div>
        
        <button className="text-gray-400 hover:text-gray-600 p-1 hover:bg-gray-100 rounded-lg transition-colors">
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path d="M15 8a3 3 0 10-2.977-2.63l-4.94 2.47a3 3 0 100 4.319l4.94 2.47a3 3 0 10.895-1.789l-4.94-2.47a3.027 3.027 0 000-.74l4.94-2.47C13.456 7.68 14.19 8 15 8z" />
          </svg>
        </button>
      </div>

      {/* Comments Section */}
      {showComments && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          className="border-t border-gray-100 px-6 py-4 bg-gray-50"
        >
          <div className="space-y-3 mb-4">
            {/* Comment input */}
            <div className="flex space-x-2">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center text-white font-bold text-xs flex-shrink-0">
                {currentUser?.name.charAt(0) || 'U'}
              </div>
              <div className="flex-1">
                <input
                  type="text"
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleComment()}
                  placeholder="Yorum yaz..."
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>
              <button
                onClick={handleComment}
                className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors font-medium"
              >
                Gönder
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </motion.div>
  )
}
