import { useState, useEffect } from 'react';
import { HeroSlider } from '../components/home/HeroSlider';
import { ParliamentBar } from '../components/home/ParliamentBar';
import { StoriesBar } from '../components/home/StoriesBar';
import { AgendaBar } from '../components/home/AgendaBar';
import { PostCardHorizontal } from '../components/post/PostCardHorizontal';
import { HorizontalScroll } from '../components/common/HorizontalScroll';
import { MediaSidebar } from '../components/media/MediaSidebar';
import { mockParties } from '../mock/parties';
import { mockAgendas } from '../mock/agendas';
import { currentParliamentDistribution, totalSeats } from '../data/parliamentDistribution';
import { filterConsecutiveTextAudio } from '../utils/postFilters';
import api from '../utils/api';
import { supabase } from '../services/supabase';

export const HomePage = () => {
  const [posts, setPosts] = useState([]);
  const [parties, setParties] = useState([]);
  const [agendas, setAgendas] = useState([]);
  const [users, setUsers] = useState([]);
  const [activeCategory, setActiveCategory] = useState('all'); // Mobil için aktif kategori - Default 'Tüm'
  
  useEffect(() => {
    // Load data from Supabase
    const loadData = async () => {
      try {
        // Partiler + kullanıcılar + postlar (tamamı DB)
        const [partiesData, usersResponse, postsResponse] = await Promise.all([
          api.parties.getAll().catch((err) => { console.error('Parties error:', err); return []; }),
          supabase.from('users').select('id,username,full_name,avatar_url,user_type,party_id,province,is_verified,polit_score').eq('is_active', true).limit(2000),
          supabase
            .from('posts')
            .select('id,user_id,party_id,content_type,content_text,content,media_urls,thumbnail_url,media_duration,category,agenda_tag,polit_score,view_count,like_count,dislike_count,comment_count,share_count,is_featured,created_at,source_url, user:users(id,username,full_name,avatar_url,user_type,party_id,province,is_verified, party:parties(id,slug,short_name,logo_url,color))')
            .eq('is_deleted', false)
            .order('created_at', { ascending: false })
            .limit(500)
        ]);

        const usersData = usersResponse?.data || [];
        const postsData = postsResponse?.data || [];
        
        console.log('=== SUPABASE DATA LOADED ===');
        console.log('Parties:', partiesData?.length || 0);
        console.log('Users from Supabase:', usersData?.length || 0);
        console.log('Posts from Supabase:', postsData?.length || 0);
        
        if (usersData.length > 0) {
          console.log('✅ Sample user avatar:', usersData[0]?.avatar_url);
        }
        
        if (usersResponse?.error) {
          console.error('❌ Supabase users error:', usersResponse.error);
        }
        if (postsResponse?.error) {
          console.error('❌ Supabase posts error:', postsResponse.error);
        }

        // Partileri ayarla
        if (partiesData && partiesData.length > 0) {
          setParties(partiesData);
        } else {
          console.log('Using mock parties as fallback');
          setParties(mockParties);
        }

        // Kullanıcıları ayarla
        if (usersData && usersData.length > 0) {
          setUsers(usersData);
          console.log('✅ Using real users from Supabase');
        }

        // Postları ayarla (tamamı DB)
        const mapDbPostToUi = (p) => ({
          post_id: p.id,
          user_id: p.user_id,
          content_type: p.content_type || 'text',
          content_text: p.content_text ?? p.content ?? '',
          media_url: p.media_urls ?? [],
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
                party: p.user.party
                  ? {
                      party_id: p.user.party.id,
                      party_slug: p.user.party.slug,
                      party_short_name: p.user.party.short_name,
                      party_logo: p.user.party.logo_url,
                      party_color: p.user.party.color,
                    }
                  : null,
              }
            : null,
        });

        setPosts(postsData.map(mapDbPostToUi));

        // Agendas için şimdilik mock data kullan
        setAgendas(mockAgendas);

      } catch (error) {
        console.error('Error loading data:', error);
        setPosts([]);
        setParties(mockParties);
        setAgendas(mockAgendas);
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
  const citizenPosts = pickFixedMix(posts.filter((p) => p.user?.user_type === 'party_member'));
  const exPoliticianPosts = pickFixedMix([]); // DB'de henüz ex_politician yok
  const mediaPosts = pickFixedMix([]); // DB'de henüz media yok
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
    const expSorted = exPoliticianPosts.slice();
    const mediaSorted = mediaPosts.slice();
    
    const mixed = [];
    const maxLength = Math.max(
      mpsSorted.length,
      orgSorted.length,
      citizenSorted.length,
      expSorted.length,
      mediaSorted.length
    );
    
    // Round-robin: Her kategoriden sırayla al
    for (let i = 0; i < maxLength; i++) {
      if (mpsSorted[i]) mixed.push(mpsSorted[i]);
      if (orgSorted[i]) mixed.push(orgSorted[i]);
      if (citizenSorted[i]) mixed.push(citizenSorted[i]);
      if (expSorted[i]) mixed.push(expSorted[i]);
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
    { id: 'experience', name: 'Deneyim', posts: exPoliticianPosts, color: 'rgba(212, 160, 23, 0.08)' },
    { id: 'media', name: 'Medya', posts: mediaPosts, color: 'rgba(255, 193, 7, 0.1)' }
  ];
  
  const activeTab = categories.find(c => c.id === activeCategory);
  
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container-main py-6 lg:pr-0">
        {/* Manşet Slayt */}
        {featuredPosts.length > 0 && <HeroSlider posts={featuredPosts} />}
        
        {/* Parti Bayrakları - Meclis Dağılımı */}
        <ParliamentBar parliamentData={currentParliamentDistribution} totalSeats={totalSeats} />
        
        {/* Stories/Reels Bar */}
        <StoriesBar />
        
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
                      {activeTab.id === 'all' ? 'TÜM İÇERİKLER' : `${activeTab.name.toUpperCase()} KONUŞUYOR`}
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
              
              {/* VEKİLLER KONUŞUYOR */}
              <section className="min-w-0 rounded-lg p-4" style={{ backgroundColor: 'rgba(0, 159, 214, 0.08)' }}>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-gray-900">VEKİLLER KONUŞUYOR</h2>
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
            
            {/* TEŞKİLAT KONUŞUYOR */}
            <section className="min-w-0 rounded-lg p-4" style={{ backgroundColor: 'rgba(135, 180, 51, 0.08)' }}>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-gray-900">TEŞKİLAT KONUŞUYOR</h2>
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
            
            {/* VATANDAŞ KONUŞUYOR */}
            <section className="min-w-0 rounded-lg p-4" style={{ backgroundColor: 'rgba(229, 229, 229, 0.5)' }}>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-gray-900">VATANDAŞ KONUŞUYOR</h2>
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
            
            {/* DENEYİM KONUŞUYOR */}
            <section className="min-w-0 rounded-lg p-4" style={{ backgroundColor: 'rgba(212, 160, 23, 0.08)' }}>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-gray-900">DENEYİM KONUŞUYOR</h2>
                <a href="/category/experience" className="text-primary-blue hover:underline text-sm">
                  Tümünü Gör
                </a>
              </div>
              <HorizontalScroll 
                autoScroll={true} 
                scrollInterval={5000}
                itemsPerView={{ desktop: 5, tablet: 3, mobile: 2 }}
              >
                {filterConsecutiveTextAudio(exPoliticianPosts, true).map(post => (
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
              <h2 className="text-sm font-bold text-white mb-4 whitespace-nowrap">MEDYA KONUŞUYOR</h2>
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
