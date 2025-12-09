import { useState, useEffect } from 'react';
import { Users, FileText, TrendingUp, Activity, DollarSign, Eye, Heart, MessageCircle, Share2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { mockUsers } from '../../mock/users';
import { generateMockPosts } from '../../mock/posts';

export const AdminDashboardNew = () => {
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalPosts: 0,
    totalViews: 0,
    totalLikes: 0,
    totalComments: 0,
    totalShares: 0,
    totalPolitScore: 0,
    activeUsers24h: 0,
    newUsersToday: 0,
    newPostsToday: 0,
    avgPolitScore: 0,
  });
  
  const [recentUsers, setRecentUsers] = useState([]);
  const [recentPosts, setRecentPosts] = useState([]);
  const [topPosts, setTopPosts] = useState([]);

  useEffect(() => {
    // Calculate real stats from mock data
    const users = mockUsers;
    const posts = generateMockPosts(400);
    
    const totalViews = posts.reduce((sum, p) => sum + p.view_count, 0);
    const totalLikes = posts.reduce((sum, p) => sum + p.like_count, 0);
    const totalComments = posts.reduce((sum, p) => sum + p.comment_count, 0);
    const totalShares = posts.reduce((sum, p) => sum + (p.share_count || 0), 0);
    const totalPolitScore = posts.reduce((sum, p) => sum + p.polit_score, 0);
    
    setStats({
      totalUsers: users.length,
      totalPosts: posts.length,
      totalViews,
      totalLikes,
      totalComments,
      totalShares,
      totalPolitScore,
      activeUsers24h: Math.floor(users.length * 0.3),
      newUsersToday: Math.floor(users.length * 0.05),
      newPostsToday: Math.floor(posts.length * 0.08),
      avgPolitScore: Math.floor(totalPolitScore / posts.length),
    });
    
    setRecentUsers(users.slice(0, 5));
    setRecentPosts(posts.slice(0, 5));
    setTopPosts(posts.sort((a, b) => b.polit_score - a.polit_score).slice(0, 5));
  }, []);
  
  const statCards = [
    { label: 'Toplam Kullanıcı', value: stats.totalUsers.toLocaleString('tr-TR'), icon: Users, color: 'blue', change: '+12%', link: '/admin/users' },
    { label: 'Toplam Post', value: stats.totalPosts.toLocaleString('tr-TR'), icon: FileText, color: 'green', change: '+8%', link: '/admin/posts' },
    { label: 'Toplam Görüntülenme', value: stats.totalViews.toLocaleString('tr-TR'), icon: Eye, color: 'purple', change: '+25%' },
    { label: 'Toplam Polit Puan', value: `${(stats.totalPolitScore / 1000000).toFixed(1)}M`, icon: TrendingUp, color: 'orange', change: '+15%', link: '/admin/algorithm' },
    { label: 'Bugün Yeni Kullanıcı', value: stats.newUsersToday.toLocaleString('tr-TR'), icon: Users, color: 'green', change: '+5%' },
    { label: 'Bugün Yeni Post', value: stats.newPostsToday.toLocaleString('tr-TR'), icon: FileText, color: 'blue', change: '+10%' },
    { label: 'Aktif Kullanıcı (24s)', value: stats.activeUsers24h.toLocaleString('tr-TR'), icon: Activity, color: 'red', change: '+18%' },
    { label: 'Ort. Polit Puan', value: stats.avgPolitScore.toLocaleString('tr-TR'), icon: TrendingUp, color: 'yellow', change: '+3%' },
  ];
  
  return (
    <div className="p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-black text-gray-900 mb-2">Dashboard</h1>
        <p className="text-gray-600">Platform yönetim merkezi - Tüm istatistikler</p>
      </div>
      
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {statCards.map((stat, index) => (
          <Link
            key={index}
            to={stat.link || '#'}
            className={`bg-white rounded-xl border border-gray-200 p-6 hover:shadow-lg transition-shadow ${stat.link ? 'cursor-pointer' : ''}`}
          >
            <div className="flex items-center justify-between mb-4">
              <div className={`p-3 rounded-lg bg-${stat.color}-100`}>
                <stat.icon className={`w-6 h-6 text-${stat.color}-600`} />
              </div>
              <span className={`text-sm font-semibold ${stat.change.startsWith('+') ? 'text-green-500' : 'text-red-500'}`}>
                {stat.change}
              </span>
            </div>
            <div className="text-3xl font-black text-gray-900 mb-1">{stat.value}</div>
            <div className="text-sm text-gray-600">{stat.label}</div>
          </Link>
        ))}
      </div>
      
      {/* Engagement Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 mb-8">
        <div className="bg-gradient-to-br from-red-500 to-pink-500 rounded-xl p-6 text-white">
          <Heart className="w-8 h-8 mb-2" fill="white" />
          <div className="text-3xl font-black mb-1">{stats.totalLikes.toLocaleString('tr-TR')}</div>
          <div className="text-sm opacity-90">Toplam Beğeni</div>
        </div>
        
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-6 text-white">
          <MessageCircle className="w-8 h-8 mb-2" />
          <div className="text-3xl font-black mb-1">{stats.totalComments.toLocaleString('tr-TR')}</div>
          <div className="text-sm opacity-90">Toplam Yorum</div>
        </div>
        
        <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl p-6 text-white">
          <Share2 className="w-8 h-8 mb-2" />
          <div className="text-3xl font-black mb-1">{stats.totalShares.toLocaleString('tr-TR')}</div>
          <div className="text-sm opacity-90">Toplam Paylaşım</div>
        </div>
        
        <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl p-6 text-white">
          <Eye className="w-8 h-8 mb-2" />
          <div className="text-3xl font-black mb-1">{(stats.totalViews / 1000).toFixed(1)}K</div>
          <div className="text-sm opacity-90">Toplam Görüntülenme</div>
        </div>
      </div>
      
      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Recent Users */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-gray-900">Son Kullanıcılar</h3>
            <Link to="/admin/users" className="text-sm text-primary-blue hover:text-blue-600 font-semibold">
              Tümünü Gör →
            </Link>
          </div>
          
          <div className="space-y-3">
            {recentUsers.map(user => (
              <div key={user.user_id} className="flex items-center gap-3 p-3 hover:bg-gray-50 rounded-lg transition-colors">
                <img src={user.avatar_url || user.profile_image} alt={user.full_name} className="w-10 h-10 rounded-full object-cover" />
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-gray-900 truncate">{user.full_name}</div>
                  <div className="text-xs text-gray-500">{user.user_type}</div>
                </div>
                <span className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded-full font-semibold">Yeni</span>
              </div>
            ))}
          </div>
        </div>
        
        {/* Top Posts */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-gray-900">En Yüksek Polit Puan</h3>
            <Link to="/admin/posts" className="text-sm text-primary-blue hover:text-blue-600 font-semibold">
              Tümünü Gör →
            </Link>
          </div>
          
          <div className="space-y-3">
            {topPosts.map(post => (
              <div key={post.post_id} className="flex items-center gap-3 p-3 hover:bg-gray-50 rounded-lg transition-colors">
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-gray-900 truncate">{post.user?.full_name}</div>
                  <div className="text-xs text-gray-500 truncate">{post.content_text?.slice(0, 50)}...</div>
                </div>
                <div className="text-right">
                  <div className="text-lg font-bold text-primary-blue">{(post.polit_score / 1000).toFixed(1)}K</div>
                  <div className="text-xs text-gray-500">Polit Puan</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
      
      {/* Quick Actions */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Link to="/admin/users" className="bg-white border border-gray-200 rounded-xl p-4 hover:shadow-lg transition-shadow">
          <Users className="w-8 h-8 text-blue-500 mb-2" />
          <div className="font-bold text-gray-900">Kullanıcılar</div>
          <div className="text-xs text-gray-500">Yönet & Doğrula</div>
        </Link>
        
        <Link to="/admin/posts" className="bg-white border border-gray-200 rounded-xl p-4 hover:shadow-lg transition-shadow">
          <FileText className="w-8 h-8 text-green-500 mb-2" />
          <div className="font-bold text-gray-900">Postlar</div>
          <div className="text-xs text-gray-500">Moderasyon</div>
        </Link>
        
        <Link to="/admin/algorithm" className="bg-white border border-gray-200 rounded-xl p-4 hover:shadow-lg transition-shadow">
          <TrendingUp className="w-8 h-8 text-purple-500 mb-2" />
          <div className="font-bold text-gray-900">Algoritma</div>
          <div className="text-xs text-gray-500">Polit Puan</div>
        </Link>
        
        <Link to="/admin/theme" className="bg-white border border-gray-200 rounded-xl p-4 hover:shadow-lg transition-shadow">
          <DollarSign className="w-8 h-8 text-orange-500 mb-2" />
          <div className="font-bold text-gray-900">Tasarım</div>
          <div className="text-xs text-gray-500">Tema & Renk</div>
        </Link>
      </div>
    </div>
  );
};
