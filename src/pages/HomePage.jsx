import { useState, useEffect } from 'react';
import { HeroSlider } from '../components/home/HeroSlider';
import { ParliamentBar } from '../components/home/ParliamentBar';
import { StoriesBar } from '../components/home/StoriesBar';
import { AgendaBar } from '../components/home/AgendaBar';
import { PostCardHorizontal } from '../components/post/PostCardHorizontal';
import { HorizontalScroll } from '../components/common/HorizontalScroll';
import { MediaSidebar } from '../components/media/MediaSidebar';
import { Avatar } from '../components/common/Avatar';
import { mockParties } from '../mock/parties';
import { mockAgendas } from '../mock/agendas';
import { currentParliamentDistribution, totalSeats } from '../data/parliamentDistribution';
import { filterConsecutiveTextAudio } from '../utils/postFilters';
import api from '../utils/api';
import { apiCall } from '../utils/api';
import { useAuth } from '../contexts/AuthContext';

export const HomePage = () => {
  const { user, isAuthenticated } = useAuth();
  const [posts, setPosts] = useState([]);
  const [parties, setParties] = useState([]);
  const [agendas, setAgendas] = useState([]);
  const [users, setUsers] = useState([]);
  const [polifest, setPolifest] = useState([]);
  const [activeCategory, setActiveCategory] = useState('all'); // Mobil için aktif kategori - Default 'Tüm'
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    // Load data from Supabase
    const loadData = async () => {
      setLoading(true);
      try {
        // Partiler + postlar (tamamı DB - Vercel /api üzerinden)
        const [partiesData, postsData] = await Promise.all([
          api.parties.getAll().catch((err) => { console.error('Parties error:', err); return []; }),
          api.posts.getAll({ limit: 500, order: 'created_at.desc' }).catch((err) => { console.error('Posts error:', err); return []; }),
        ]);
        
        console.log('=== SUPABASE DATA LOADED ===');
        console.log('Parties:', partiesData?.length || 0);
        console.log('Posts from Supabase:', postsData?.length || 0);

        // Partileri ayarla
        if (partiesData && partiesData.length > 0) {
          setParties(partiesData);
        } else {
          console.log('Using mock parties as fallback');
          setParties(mockParties);
        }

        const partyMap = new Map((partiesData || []).map((p) => [p.id, p]));

        // Not: HomePage'de ayrıca kullanıcı listesi taşımaya gerek yok
        setUsers([]);

        // Postları ayarla (tamamı DB)
        const normalizeMediaUrls = (value) => {
          const raw = Array.isArray(value) ? value : value ? [value] : [];
          const isPlaceholderPostAsset = (s) =>
            s.startsWith('/assets/posts/') || s === '/assets/default/post_image.jpg' || s === '/assets/default/post.jpg';
          return raw
            .map((v) => String(v || '').trim())
            .filter((s) => s && !isPlaceholderPostAsset(s));
        };

        const mapDbPostToUi = (p) => ({
          post_id: p.id,
          user_id: p.user_id,
          content_type: p.content_type || 'text',
          content_text: p.content_text ?? p.content ?? '',
          media_url: normalizeMediaUrls(p.media_urls),
          thumbnail_url: p.thumbnail_url ?? null,
          media_duration: p.media_duration ?? null,
          agenda_tag: p.agenda_tag ?? null,
          polit_score: p.polit_score ?? 0,
          view_count: p.view_count ?? 0,
          like_count: p.like_count ?? 0,
          dislike_count: p.dislike_count ?? 0,
          comment_count: p.comment_count ?? 0,
          share_count: p.share_count ?? 0,
          is_featured: p.is_featured ?? false,
          created_at: p.created_at,
          source_url: p.source_url,
          category: p.category,
          user: p.user
            ? {
                ...p.user,
                user_id: p.user.id,
                profile_image: p.user.avatar_url,
                verification_badge: p.user.is_verified ?? false,
                party_id: p.user.party_id,
                party: p.user.party_id && partyMap.get(p.user.party_id)
                  ? {
                      party_id: partyMap.get(p.user.party_id).id,
                      party_slug: partyMap.get(p.user.party_id).slug,
                      party_short_name: partyMap.get(p.user.party_id).short_name,
                      party_logo: partyMap.get(p.user.party_id).logo_url,
                      party_color: partyMap.get(p.user.party_id).color,
                    }
                  : null,
              }
            : null,
        });

        setPosts((postsData || []).map(mapDbPostToUi));

        // Agendas için şimdilik mock data kullan
        setAgendas(mockAgendas);

        // PoliFest: real profiles from DB (no mock)
        const polifestUsers = await apiCall(
          `/api/users?user_type=mp,party_official,media&limit=24&order=polit_score.desc`
        ).catch(() => []);
        setPolifest(
          (polifestUsers || []).map((u) => ({
            user_id: u.id,
            username: u.username,
            full_name: u.full_name,
            profile_image: u.avatar_url,
            story_count: Math.max(1, Math.min(6, Math.floor((u.post_count || 1) / 3) || 1)),
          }))
        );

      } catch (error) {
        console.error('Error loading data:', error);
        setPosts([]);
        setParties(mockParties);
        setAgendas(mockAgendas);
        setPolifest([]);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);
  
  // Kategorilere göre post filtreleme (DB user_type ile)
  const pickFixedMix = (list = []) => {
    const desiredByType = { video: 3, image: 3, text: 2, audio: 2 };
    const typeOrder = ['video', 'image', 'text', 'audio'];
    const selected = [];
    const used = new Set();

    for (const t of typeOrder) {
      const need = desiredByType[t] || 0;
      if (!need) continue;
      list
        .filter((p) => (p.content_type || 'text') === t && !used.has(p.post_id))
        .slice(0, need)
        .forEach((p) => {
          used.add(p.post_id);
          selected.push(p);
        });
    }
    if (selected.length < 10) {
      list
        .filter((p) => !used.has(p.post_id))
        .slice(0, 10 - selected.length)
        .forEach((p) => {
          used.add(p.post_id);
          selected.push(p);
        });
    }
    return selected;
  };

  const mpPosts = pickFixedMix(posts.filter((p) => p.user?.user_type === 'mp'));
  const organizationPosts = pickFixedMix(posts.filter((p) => p.user?.user_type === 'party_official'));
  const citizenPosts = pickFixedMix(posts.filter((p) => p.user?.user_type === 'party_member' || p.user?.user_type === 'citizen'));
  const mediaPosts = pickFixedMix(posts.filter((p) => p.user?.user_type === 'media'));
  const featuredPosts = posts.length > 0 
    ? posts.filter(p => p.is_featured).sort((a, b) => (b.polit_score || 0) - (a.polit_score || 0)).slice(0, 5) 
    : [];
  
  // TÜM kategori - Her kategoriden sırayla, round-robin tarzında
  const allPosts = (() => {
    if (posts.length === 0) return [];
    
    // Her kategoriden içerikleri al ve polit puana göre sırala
    const mpsSorted = mpPosts.slice();
    const orgSorted = organizationPosts.slice();
    const citizenSorted = citizenPosts.slice();
    const mediaSorted = mediaPosts.slice();
    
    const mixed = [];
    const maxLength = Math.max(
      mpsSorted.length,
      orgSorted.length,
      citizenSorted.length,
      mediaSorted.length
    );
    
    // Round-robin: Her kategoriden sırayla al
    for (let i = 0; i < maxLength; i++) {
      if (mpsSorted[i]) mixed.push(mpsSorted[i]);
      if (orgSorted[i]) mixed.push(orgSorted[i]);
      if (citizenSorted[i]) mixed.push(citizenSorted[i]);
      if (mediaSorted[i]) mixed.push(mediaSorted[i]);
    }
    
    return mixed;
  })();
  
  // Mobil için kategoriler - TÜM ilk sırada
  const categories = [
    { id: 'all', name: 'Tüm', posts: allPosts, color: 'rgba(0, 0, 0, 0.02)' },
    { id: 'mps', name: 'Vekiller', posts: mpPosts, color: 'rgba(0, 159, 214, 0.08)' },
    { id: 'organization', name: 'Teşkilat', posts: organizationPosts, color: 'rgba(135, 180, 51, 0.08)' },
    { id: 'citizens', name: 'Vatandaş', posts: citizenPosts, color: 'rgba(229, 229, 229, 0.5)' },
    { id: 'media', name: 'Medya', posts: mediaPosts, color: 'rgba(255, 193, 7, 0.1)' }
  ];
  
  const activeTab = categories.find(c => c.id === activeCategory);
  
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="container-main py-10">
          <div className="max-w-xl mx-auto bg-white border border-gray-200 rounded-2xl p-8 shadow-sm text-center">
            <div className="flex items-center justify-center mb-4">
              <Avatar
                src={isAuthenticated ? (user?.avatar_url || user?.profile_image) : null}
                alt="Profil"
                size="84px"
              />
            </div>
            <div className="text-xl font-black text-gray-900">Yükleniyor…</div>
            <div className="text-sm text-gray-600 mt-1">İçerikler hazırlanıyor, lütfen bekleyin.</div>
            <div className="mt-6 space-y-3">
              <div className="h-4 bg-gray-100 rounded-full w-4/5 mx-auto animate-pulse" />
              <div className="h-4 bg-gray-100 rounded-full w-3/5 mx-auto animate-pulse" />
              <div className="h-24 bg-gray-100 rounded-2xl w-full animate-pulse" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container-main py-6 lg:pr-0">
        {/* Manşet Slayt */}
        {featuredPosts.length > 0 && <HeroSlider posts={featuredPosts} />}
        
        {/* Parti Bayrakları - Meclis Dağılımı */}
        <ParliamentBar parliamentData={currentParliamentDistribution} totalSeats={totalSeats} />
        
        {/* Stories/Reels Bar */}
        <StoriesBar stories={polifest} />
        
        {/* Gündem Bar */}
        {agendas.length > 0 && <AgendaBar agendas={agendas} />}
        
        {/* MOBİL: Tab Navigation - Sticky */}
        <div className="md:hidden sticky top-[72px] z-10 bg-gray-50 -mx-4 px-4 pb-3 mb-4 border-b border-gray-200">
          <div className="flex gap-2 overflow-x-auto scrollbar-hide">
            {categories.map(cat => (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={`flex-shrink-0 px-4 py-2 rounded-full font-semibold text-sm transition-all ${
                  activeCategory === cat.id
                    ? 'bg-primary-blue text-white shadow-md'
                    : 'bg-white text-gray-700 border border-gray-300'
                }`}
              >
                {cat.name}
              </button>
            ))}
          </div>
        </div>
        
        {/* Ana İçerik Alanı */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_200px] gap-4 lg:pr-0">
          {/* Sol Ana Kolon */}
          <div className="space-y-8 min-w-0">
            {/* MOBİL: Sadece Aktif Kategori - TEK KOLON (X/Twitter Tarzı) */}
            <div className="md:hidden">
              {activeTab && (
                <section className="min-w-0 rounded-lg p-2" style={{ backgroundColor: activeTab.color }}>
                  <div className="flex items-center justify-between mb-4 px-2">
                    <h2 className="text-xl font-bold text-gray-900">
                      {activeTab.id === 'all' ? 'TÜM İÇERİKLER' : `${activeTab.name.toUpperCase()} GÜNDEMİ`}
                    </h2>
                  </div>
                  {/* Tek Kolon Layout - Dikey Scroll (X/Twitter gibi) */}
                  <div className="flex flex-col gap-3">
                    {activeTab.posts.slice(0, 20).map(post => (
                      <PostCardHorizontal 
                        key={post.post_id} 
                        post={post}
                        showCity={activeTab.id === 'mps' || activeTab.id === 'all'}
                        showPartyLogo={activeTab.id !== 'citizens'}
                        fullWidth={true}
                      />
                    ))}
                  </div>
                </section>
              )}
            </div>
            
            {/* DESKTOP: Tüm Kategoriler */}
            <div className="hidden md:block space-y-8">
              {/* HİT GÜNDEMLER - KARİŞİK İÇERİKLER */}
              <section className="min-w-0 rounded-lg p-4" style={{ backgroundColor: 'rgba(255, 215, 0, 0.08)' }}>
                {/* Başlık */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">🔥</span>
                    <h2 className="text-xl font-bold text-gray-900">HİT PAYLAŞIMLAR</h2>
                    <span className="text-sm text-gray-500 font-medium">Tüm Kategorilerden</span>
                  </div>
                  <a href="/category/all" className="text-primary-blue hover:underline text-sm">
                    Tümünü Gör
                  </a>
                </div>
                <HorizontalScroll 
                  autoScroll={true} 
                  scrollInterval={4000}
                  itemsPerView={{ desktop: 5, tablet: 3, mobile: 2 }}
                >
                  {filterConsecutiveTextAudio(allPosts.slice(0, 30), true).map(post => (
                    <PostCardHorizontal 
                      key={post.post_id} 
                      post={post}
                      showCity={post.user?.politician_type === 'mp'}
                      showPartyLogo={post.user?.user_type !== 'normal'}
                    />
                  ))}
                </HorizontalScroll>
              </section>
              
              {/* VEKİLLER GÜNDEMİ */}
              <section className="min-w-0 rounded-lg p-4" style={{ backgroundColor: 'rgba(0, 159, 214, 0.08)' }}>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-gray-900">VEKİLLER GÜNDEMİ</h2>
                <a href="/category/mps" className="text-primary-blue hover:underline text-sm">
                  Tümünü Gör
                </a>
              </div>
              <HorizontalScroll 
                autoScroll={true} 
                scrollInterval={5000}
                itemsPerView={{ desktop: 5, tablet: 3, mobile: 2 }}
              >
                {filterConsecutiveTextAudio(mpPosts, true).map(post => (
                  <PostCardHorizontal 
                    key={post.post_id} 
                    post={post}
                    showCity={true}
                    showPartyLogo={true}
                  />
                ))}
              </HorizontalScroll>
            </section>
            
            {/* TEŞKİLAT GÜNDEMİ */}
            <section className="min-w-0 rounded-lg p-4" style={{ backgroundColor: 'rgba(135, 180, 51, 0.08)' }}>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-gray-900">TEŞKİLAT GÜNDEMİ</h2>
                <a href="/category/organization" className="text-primary-blue hover:underline text-sm">
                  Tümünü Gör
                </a>
              </div>
              <HorizontalScroll 
                autoScroll={true} 
                scrollInterval={5000}
                itemsPerView={{ desktop: 5, tablet: 3, mobile: 2 }}
              >
                {filterConsecutiveTextAudio(organizationPosts, true).map(post => (
                  <PostCardHorizontal 
                    key={post.post_id} 
                    post={post}
                    showPartyLogo={true}
                  />
                ))}
              </HorizontalScroll>
            </section>
            
            {/* VATANDAŞ GÜNDEMİ */}
            <section className="min-w-0 rounded-lg p-4" style={{ backgroundColor: 'rgba(229, 229, 229, 0.5)' }}>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-gray-900">VATANDAŞ GÜNDEMİ</h2>
                <a href="/category/citizens" className="text-primary-blue hover:underline text-sm">
                  Tümünü Gör
                </a>
              </div>
              <HorizontalScroll 
                autoScroll={true} 
                scrollInterval={5000}
                itemsPerView={{ desktop: 5, tablet: 3, mobile: 2 }}
              >
                {filterConsecutiveTextAudio(citizenPosts, true).map(post => (
                  <PostCardHorizontal 
                    key={post.post_id} 
                    post={post}
                  />
                ))}
              </HorizontalScroll>
            </section>
            
            </div>
          </div>
          
          {/* Sağ Medya Sidebar */}
          <aside className="hidden lg:block lg:mr-0 min-w-0">
            <div className="sticky top-20 bg-slate-800/80 backdrop-blur-sm rounded-lg p-4 shadow-lg">
              <h2 className="text-sm font-bold text-white mb-4 whitespace-nowrap">MEDYA GÜNDEMİ</h2>
              <div className="-mx-4 -mb-4 px-4 pb-4">
                <MediaSidebar posts={posts} />
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
};
