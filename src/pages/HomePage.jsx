import { useState, useEffect } from 'react';
import { HeroSlider } from '../components/home/HeroSlider';
import { ParliamentBar } from '../components/home/ParliamentBar';
import { AgendaBar } from '../components/home/AgendaBar';
import { PostCardHorizontal } from '../components/post/PostCardHorizontal';
import { HorizontalScroll } from '../components/common/HorizontalScroll';
import { MediaSidebar } from '../components/media/MediaSidebar';
import { mockPosts, generateMockPosts, getCategoryPosts } from '../mock/posts';
import { mockParties } from '../mock/parties';
import { mockAgendas } from '../mock/agendas';
import { mockUsers } from '../mock/users';

export const HomePage = () => {
  const [posts, setPosts] = useState([]);
  const [parties, setParties] = useState([]);
  const [agendas, setAgendas] = useState([]);
  
  useEffect(() => {
    // Mock data loading simulation
    try {
      setTimeout(() => {
        const allPosts = generateMockPosts(400, mockUsers, mockParties);
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
  
  // Kategorilere göre post filtreleme - her kategori için 30 örnek
  const mpPosts = posts.length > 0 ? getCategoryPosts('mps', posts) : [];
  const organizationPosts = posts.length > 0 ? getCategoryPosts('organization', posts) : [];
  const citizenPosts = posts.length > 0 ? getCategoryPosts('citizens', posts) : [];
  const exPoliticianPosts = posts.length > 0 ? getCategoryPosts('experience', posts) : [];
  const mediaPosts = posts.length > 0 ? getCategoryPosts('media', posts) : [];
  const featuredPosts = posts.length > 0 ? posts.filter(p => p.is_featured).slice(0, 5) : [];
  
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container-main py-6 lg:pr-0">
        {/* Manşet Slayt */}
        {featuredPosts.length > 0 && <HeroSlider posts={featuredPosts} />}
        
        {/* Parti Bayrakları */}
        {parties.length > 0 && <ParliamentBar parties={parties} totalSeats={600} />}
        
        {/* Gündem Bar */}
        {agendas.length > 0 && <AgendaBar agendas={agendas} />}
        
        {/* Ana İçerik Alanı */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_200px] gap-4 lg:pr-0">
          {/* Sol Ana Kolon */}
          <div className="space-y-8 min-w-0">
            {/* VEKİLLER KONUŞUYOR */}
            <section className="min-w-0 bg-blue-50/30 rounded-lg p-4">
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
            <section className="min-w-0 bg-green-50/30 rounded-lg p-4">
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
            <section className="min-w-0 bg-gray-50/30 rounded-lg p-4">
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
            <section className="min-w-0 bg-amber-50/30 rounded-lg p-4">
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
          
          {/* Sağ Medya Sidebar */}
          <aside className="hidden lg:block lg:mr-0 min-w-0">
            <div className="sticky top-20 bg-yellow-100/30 rounded-lg p-4">
              <h2 className="text-sm font-bold text-gray-900 mb-4 whitespace-nowrap">MEDYA KONUŞUYOR</h2>
              <div className="bg-yellow-100/30 -mx-4 -mb-4 px-4 pb-4">
                <MediaSidebar posts={posts} />
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
};
