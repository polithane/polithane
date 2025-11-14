'use client'

interface PostCardProps {
  author: {
    name: string
    username: string
    avatar?: string
    verified?: boolean
    role?: string
    party?: string
  }
  content: string
  timestamp: string
  location?: string
  politPuan?: number
  topic?: string
  sentiment?: string
  stats: {
    views: number
    comments: number
    reposts: number
    likes: number
  }
}

export default function PostCard({
  author,
  content,
  timestamp,
  location,
  politPuan = 0,
  topic,
  sentiment,
  stats,
}: PostCardProps) {
  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`
    return num.toString()
  }

  const getPolitPuanColor = (score: number) => {
    if (score >= 1500) return 'text-green-600 bg-green-100'
    if (score >= 1000) return 'text-yellow-600 bg-yellow-100'
    return 'text-gray-600 bg-gray-100'
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center space-x-3">
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center text-white font-bold text-lg">
            {author.name.charAt(0)}
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h3 className="font-semibold text-gray-900">{author.name}</h3>
              {author.verified && (
                <span className="text-blue-500" title="Doğrulanmış">✓</span>
              )}
              {author.role && (
                <span className="px-2 py-0.5 text-xs rounded-full bg-purple-100 text-purple-700">
                  {author.role}
                </span>
              )}
            </div>
            <div className="flex items-center space-x-2 text-sm text-gray-500">
              <span>@{author.username}</span>
              {location && (
                <>
                  <span>·</span>
                  <span>📍 {location}</span>
                </>
              )}
              <span>·</span>
              <span>{timestamp}</span>
            </div>
          </div>
        </div>
        {author.party && (
          <span className="px-3 py-1 text-xs rounded-full bg-red-100 text-red-700 font-medium">
            {author.party}
          </span>
        )}
      </div>

      {/* Content */}
      <div className="mb-4">
        <p className="text-gray-800 leading-relaxed whitespace-pre-wrap">{content}</p>
      </div>

      {/* Metadata */}
      <div className="flex items-center space-x-4 mb-4 pb-4 border-b border-gray-100">
        <div className={`px-3 py-1 rounded-full text-sm font-semibold ${getPolitPuanColor(politPuan)}`}>
          🔥 PolitPuan: {politPuan.toLocaleString()}
        </div>
        {topic && (
          <span className="px-3 py-1 rounded-full text-sm bg-blue-100 text-blue-700">
            🎯 {topic}
          </span>
        )}
        {sentiment && (
          <span className="px-3 py-1 rounded-full text-sm bg-orange-100 text-orange-700">
            {sentiment === 'Eleştirel' ? '😠' : sentiment === 'Olumlu' ? '😊' : '😐'} {sentiment}
          </span>
        )}
      </div>

      {/* Stats & Actions */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-6 text-gray-500 text-sm">
          <button className="flex items-center space-x-2 hover:text-primary-600 transition-colors">
            <span>👁️</span>
            <span>{formatNumber(stats.views)}</span>
          </button>
          <button className="flex items-center space-x-2 hover:text-primary-600 transition-colors">
            <span>💬</span>
            <span>{formatNumber(stats.comments)}</span>
          </button>
          <button className="flex items-center space-x-2 hover:text-primary-600 transition-colors">
            <span>🔄</span>
            <span>{formatNumber(stats.reposts)}</span>
          </button>
          <button className="flex items-center space-x-2 hover:text-primary-600 transition-colors">
            <span>❤️</span>
            <span>{formatNumber(stats.likes)}</span>
          </button>
        </div>
        <button className="text-gray-400 hover:text-gray-600">
          <span>⋯</span>
        </button>
      </div>
    </div>
  )
}
