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

export const HomePage = () => {
  const [posts, setPosts] = useState([]);
  const [parties, setParties] = useState([]);
  const [agendas, setAgendas] = useState([]);
  
  useEffect(() => {
    // Mock data loading simulation
    setTimeout(() => {
      const allPosts = generateMockPosts(200);
      setPosts(allPosts);
      setParties(mockParties);
      setAgendas(mockAgendas);
    }, 100);
  }, []);
  
  // Kategorilere göre post filtreleme - her kategori için 20 örnek
  const mpPosts = getCategoryPosts('mps', posts);
  const organizationPosts = getCategoryPosts('organization', posts);
  const citizenPosts = getCategoryPosts('citizens', posts);
  const exPoliticianPosts = getCategoryPosts('experience', posts);
  const mediaPosts = getCategoryPosts('media', posts);
  const featuredPosts = posts.filter(p => p.is_featured).slice(0, 5);
  
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container-main py-6">
        {/* Manşet Slayt */}
        <HeroSlider posts={featuredPosts} />
        
        {/* Parti Bayrakları */}
        <ParliamentBar parties={parties} totalSeats={600} />
        
        {/* Gündem Bar */}
        <AgendaBar agendas={agendas} />
        
        {/* Ana İçerik Alanı */}
        <div className="grid grid-cols-1 lg:grid-cols-[800px_230px] gap-8">
          {/* Sol Ana Kolon */}
          <div className="space-y-8">
            {/* VEKİLLER KONUŞUYOR */}
            <section>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-gray-900">VEKİLLER KONUŞUYOR</h2>
                <a href="/category/mps" className="text-primary-blue hover:underline text-sm">
                  Tümünü Gör
                </a>
              </div>
              <HorizontalScroll 
                autoScroll={true} 
                scrollInterval={5000}
                itemsPerView={{ desktop: 5, mobile: 2 }}
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
            <section>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-gray-900">TEŞKİLAT KONUŞUYOR</h2>
                <a href="/category/organization" className="text-primary-blue hover:underline text-sm">
                  Tümünü Gör
                </a>
              </div>
              <HorizontalScroll 
                autoScroll={true} 
                scrollInterval={5000}
                itemsPerView={{ desktop: 5, mobile: 2 }}
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
            <section>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-gray-900">VATANDAŞ KONUŞUYOR</h2>
                <a href="/category/citizens" className="text-primary-blue hover:underline text-sm">
                  Tümünü Gör
                </a>
              </div>
              <HorizontalScroll 
                autoScroll={true} 
                scrollInterval={5000}
                itemsPerView={{ desktop: 5, mobile: 2 }}
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
            <section>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-gray-900">DENEYİM KONUŞUYOR</h2>
                <a href="/category/experience" className="text-primary-blue hover:underline text-sm">
                  Tümünü Gör
                </a>
              </div>
              <HorizontalScroll 
                autoScroll={true} 
                scrollInterval={5000}
                itemsPerView={{ desktop: 5, mobile: 2 }}
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
          <aside className="hidden lg:block">
            <div className="sticky top-20">
              <h2 className="text-lg font-bold text-gray-900 mb-4">MEDYA KONUŞUYOR</h2>
              <MediaSidebar posts={posts} />
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
};
