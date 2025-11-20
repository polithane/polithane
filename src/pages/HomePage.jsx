import { useState, useEffect } from 'react';
import { HeroSlider } from '../components/home/HeroSlider';
import { ParliamentBar } from '../components/home/ParliamentBar';
import { StoriesBar } from '../components/home/StoriesBar';
import { AgendaBar } from '../components/home/AgendaBar';
import { PostCardHorizontal } from '../components/post/PostCardHorizontal';
import { HorizontalScroll } from '../components/common/HorizontalScroll';
import { MediaSidebar } from '../components/media/MediaSidebar';
import { mockPosts, generateMockPosts, getCategoryPosts } from '../mock/posts';
import { mockParties } from '../mock/parties';
import { mockAgendas } from '../mock/agendas';
import { mockUsers } from '../mock/users';
import { currentParliamentDistribution, totalSeats } from '../data/parliamentDistribution';

export const HomePage = () => {
  const [posts, setPosts] = useState([]);
  const [parties, setParties] = useState([]);
  const [agendas, setAgendas] = useState([]);
  const [activeCategory, setActiveCategory] = useState('all'); // Mobil için aktif kategori - Default 'Tüm'
  
  useEffect(() => {
    // Mock data loading simulation
    try {
      setTimeout(() => {
        const allPosts = generateMockPosts(400, mockUsers, mockParties);
        
        // Debug: İlk 3 postu kontrol et
        console.log('=== LOGO DEBUG ===');
        console.log('İlk 3 post:', allPosts.slice(0, 3).map(p => ({
          post_id: p.post_id,
          user_name: p.user?.full_name,
          party_id: p.user?.party_id,
          party_short_name: p.user?.party?.party_short_name,
          party_logo: p.user?.party?.party_logo
        })));
        
        setPosts(allPosts);
        setParties(mockParties);
        setAgendas(mockAgendas);
      }, 100);
    } catch (error) {
      console.error('Error loading mock data:', error);
      // Fallback: en azından boş array'ler set et
      setPosts([]);
      setParties([]);
      setAgendas([]);
    }
  }, []);
  
  // Kategorilere göre post filtreleme - her kategori için 30 örnek (POLİT PUANA GÖRE SIRALANMIŞ)
  const mpPosts = posts.length > 0 ? getCategoryPosts('mps', posts) : [];
  const organizationPosts = posts.length > 0 ? getCategoryPosts('organization', posts) : [];
  const citizenPosts = posts.length > 0 ? getCategoryPosts('citizens', posts) : [];
  const exPoliticianPosts = posts.length > 0 ? getCategoryPosts('experience', posts) : [];
  const mediaPosts = posts.length > 0 ? getCategoryPosts('media', posts) : [];
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
            {/* MOBİL: Sadece Aktif Kategori */}
            <div className="md:hidden">
              {activeTab && (
                <section className="min-w-0 rounded-lg p-4" style={{ backgroundColor: activeTab.color }}>
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-bold text-gray-900">
                      {activeTab.id === 'all' ? 'TÜM İÇERİKLER' : `${activeTab.name.toUpperCase()} KONUŞUYOR`}
                    </h2>
                  </div>
                  <div className="space-y-4">
                    {activeTab.posts.slice(0, 10).map(post => (
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
                  {allPosts.slice(0, 30).map(post => (
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
                {mpPosts.map(post => (
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
                {organizationPosts.map(post => (
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
                {citizenPosts.map(post => (
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
                {exPoliticianPosts.map(post => (
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
