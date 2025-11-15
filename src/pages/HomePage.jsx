import { useState, useEffect } from 'react';
import { HeroSlider } from '../components/home/HeroSlider';
import { ParliamentBar } from '../components/home/ParliamentBar';
import { AgendaBar } from '../components/home/AgendaBar';
import { PostCard } from '../components/post/PostCard';
import { mockPosts } from '../mock/posts';
import { mockParties } from '../mock/parties';
import { mockAgendas } from '../mock/agendas';

export const HomePage = () => {
  const [posts, setPosts] = useState([]);
  const [parties, setParties] = useState([]);
  const [agendas, setAgendas] = useState([]);
  
  useEffect(() => {
    // Mock data loading simulation
    setTimeout(() => {
      setPosts(mockPosts);
      setParties(mockParties);
      setAgendas(mockAgendas);
    }, 100);
  }, []);
  
  // Kategorilere göre post filtreleme
  const mpPosts = posts.filter(p => p.user?.user_type === 'politician' && p.user?.politician_type === 'mp');
  const organizationPosts = posts.filter(p => 
    p.user?.user_type === 'politician' && 
    p.user?.politician_type !== 'mp' && 
    p.user?.politician_type !== 'party_chair'
  );
  const citizenPosts = posts.filter(p => p.user?.user_type === 'normal');
  const exPoliticianPosts = posts.filter(p => p.user?.user_type === 'ex_politician');
  const mediaPosts = posts.filter(p => p.user?.user_type === 'media');
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
        <div className="grid grid-cols-1 lg:grid-cols-[600px_230px] gap-8">
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
              <div className="space-y-4">
                {mpPosts.slice(0, 5).map(post => (
                  <PostCard 
                    key={post.post_id} 
                    post={post}
                    showCity={true}
                    showPartyLogo={true}
                  />
                ))}
              </div>
            </section>
            
            {/* TEŞKİLAT KONUŞUYOR */}
            <section>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-gray-900">TEŞKİLAT KONUŞUYOR</h2>
                <a href="/category/organization" className="text-primary-blue hover:underline text-sm">
                  Tümünü Gör
                </a>
              </div>
              <div className="space-y-4">
                {organizationPosts.slice(0, 5).map(post => (
                  <PostCard 
                    key={post.post_id} 
                    post={post}
                    showPosition={true}
                    showPartyLogo={true}
                  />
                ))}
              </div>
            </section>
            
            {/* VATANDAŞ KONUŞUYOR */}
            <section>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-gray-900">VATANDAŞ KONUŞUYOR</h2>
                <a href="/category/citizens" className="text-primary-blue hover:underline text-sm">
                  Tümünü Gör
                </a>
              </div>
              <div className="space-y-4">
                {citizenPosts.slice(0, 5).map(post => (
                  <PostCard 
                    key={post.post_id} 
                    post={post}
                    showPartyMemberBadge={post.user?.user_type === 'party_member'}
                  />
                ))}
              </div>
            </section>
            
            {/* DENEYİM KONUŞUYOR */}
            <section>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-gray-900">DENEYİM KONUŞUYOR</h2>
                <a href="/category/experience" className="text-primary-blue hover:underline text-sm">
                  Tümünü Gör
                </a>
              </div>
              <div className="space-y-4">
                {exPoliticianPosts.slice(0, 5).map(post => (
                  <PostCard 
                    key={post.post_id} 
                    post={post}
                    showPreviousPosition={true}
                  />
                ))}
              </div>
            </section>
          </div>
          
          {/* Sağ Medya Sidebar */}
          <aside className="hidden lg:block">
            <div className="sticky top-20">
              <h2 className="text-lg font-bold text-gray-900 mb-4">MEDYA KONUŞUYOR</h2>
              <div className="space-y-4">
                {mediaPosts.slice(0, 5).map(post => (
                  <PostCard 
                    key={post.post_id} 
                    post={post}
                    className="compact"
                  />
                ))}
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
};
