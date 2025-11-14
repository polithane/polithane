'use client'

import { Post } from '../types'
import { getRoleDisplayName } from '../lib/permissions'
import { formatDistanceToNow } from 'date-fns'
import { tr } from 'date-fns/locale'

interface PostCardProps {
  post: Post
  showDetailedAnalysis?: boolean
}

export default function PostCard({ post, showDetailedAnalysis = false }: PostCardProps) {
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

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-all duration-200">
      {/* Header */}
      <div className="p-6 pb-4">
        <div className="flex items-start justify-between">
          <div className="flex items-start space-x-3 flex-1">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center text-white font-bold text-lg flex-shrink-0">
              {post.author.name.charAt(0)}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center space-x-2 flex-wrap">
                <h3 className="font-semibold text-gray-900">{post.author.name}</h3>
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
                <span>@{post.author.username}</span>
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
          <button className="text-gray-400 hover:text-gray-600 p-1">
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
            </svg>
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="px-6 pb-4">
        <p className="text-gray-800 leading-relaxed whitespace-pre-wrap break-words">
          {post.content}
        </p>
        {post.hashtags && post.hashtags.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-3">
            {post.hashtags.map((tag, idx) => (
              <span key={idx} className="text-primary-600 hover:text-primary-700 font-medium text-sm">
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
        {post.aiAnalysis && (
          <div className="px-3 py-1.5 rounded-full text-xs bg-gray-100 text-gray-700">
            Gerilim: {post.aiAnalysis.gerilimDerecesi}% | Viral: {post.aiAnalysis.viralPotansiyel}%
          </div>
        )}
      </div>

      {/* AI Analysis Details */}
      {showDetailedAnalysis && post.aiAnalysis && (
        <div className="px-6 pb-4 border-t border-gray-100 pt-4">
          <h4 className="text-sm font-semibold text-gray-700 mb-2">AI Analiz Detayları</h4>
          <div className="grid grid-cols-2 gap-4 text-xs">
            <div>
              <span className="text-gray-600">Partizanlık Skoru:</span>
              <span className="ml-2 font-medium">{post.aiAnalysis.partizanlikSkoru}%</span>
            </div>
            <div>
              <span className="text-gray-600">Viral Potansiyel:</span>
              <span className="ml-2 font-medium">{post.aiAnalysis.viralPotansiyel}%</span>
            </div>
            <div className="col-span-2">
              <span className="text-gray-600">Duygu Analizi:</span>
              <div className="mt-1 flex space-x-4">
                <span>😊 {post.aiAnalysis.duyguAnalizi.mutluluk}%</span>
                <span>😠 {post.aiAnalysis.duyguAnalizi.ofke}%</span>
                <span>😰 {post.aiAnalysis.duyguAnalizi.endise}%</span>
                <span>✨ {post.aiAnalysis.duyguAnalizi.umut}%</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Stats & Actions */}
      <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between">
        <div className="flex items-center space-x-6 text-gray-500">
          <button className="flex items-center space-x-2 hover:text-primary-600 transition-colors group">
            <span className="text-lg group-hover:scale-110 transition-transform">👁️</span>
            <span className="text-sm font-medium">{formatNumber(post.stats.views)}</span>
          </button>
          <button className="flex items-center space-x-2 hover:text-primary-600 transition-colors group">
            <span className="text-lg group-hover:scale-110 transition-transform">💬</span>
            <span className="text-sm font-medium">{formatNumber(post.stats.comments)}</span>
          </button>
          <button className="flex items-center space-x-2 hover:text-primary-600 transition-colors group">
            <span className="text-lg group-hover:scale-110 transition-transform">🔄</span>
            <span className="text-sm font-medium">{formatNumber(post.stats.reposts)}</span>
          </button>
          <button className="flex items-center space-x-2 hover:text-red-500 transition-colors group">
            <span className="text-lg group-hover:scale-110 transition-transform">❤️</span>
            <span className="text-sm font-medium">{formatNumber(post.stats.likes)}</span>
          </button>
        </div>
        <button className="text-gray-400 hover:text-gray-600 p-1">
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path d="M15 8a3 3 0 10-2.977-2.63l-4.94 2.47a3 3 0 100 4.319l4.94 2.47a3 3 0 10.895-1.789l-4.94-2.47a3.027 3.027 0 000-.74l4.94-2.47C13.456 7.68 14.19 8 15 8z" />
          </svg>
        </button>
      </div>
    </div>
  )
}
