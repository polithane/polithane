# 💻 Implementasyon Örnekleri

## Frontend Örnekleri (Next.js + TypeScript)

### 1. Feed Bileşeni

```typescript
// components/Feed.tsx
import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { PostCard } from './PostCard';
import { FeedFilters } from './FeedFilters';

interface FeedProps {
  type: 'general' | 'party' | 'local' | 'following' | 'trending';
  userId?: string;
}

export function Feed({ type, userId }: FeedProps) {
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState({
    city: '',
    district: ''
  });

  const { data, isLoading, error } = useQuery({
    queryKey: ['feed', type, page, filters],
    queryFn: async () => {
      const params = new URLSearchParams({
        type,
        page: page.toString(),
        limit: '20',
        ...(filters.city && { city: filters.city }),
        ...(filters.district && { district: filters.district })
      });

      const response = await fetch(`/api/v1/posts/feed?${params}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) throw new Error('Failed to fetch feed');
      return response.json();
    }
  });

  if (isLoading) return <FeedSkeleton />;
  if (error) return <ErrorMessage error={error} />;

  return (
    <div className="feed-container">
      <FeedFilters filters={filters} onFiltersChange={setFilters} />
      
      <div className="feed-posts">
        {data.posts.map((post: Post) => (
          <PostCard key={post.id} post={post} />
        ))}
      </div>

      <Pagination
        page={page}
        totalPages={data.pagination.totalPages}
        onPageChange={setPage}
      />
    </div>
  );
}
```

### 2. Post Kartı Bileşeni

```typescript
// components/PostCard.tsx
import { useState } from 'react';
import { Post, User } from '@/types';
import { PolitPuanBadge } from './PolitPuanBadge';
import { InteractionButtons } from './InteractionButtons';
import { AIAnalysisTag } from './AIAnalysisTag';

interface PostCardProps {
  post: Post;
}

export function PostCard({ post }: PostCardProps) {
  const [isLiked, setIsLiked] = useState(post.userInteraction?.liked || false);
  const [likeCount, setLikeCount] = useState(post.interactionCounts.likes);

  const handleLike = async () => {
    try {
      const method = isLiked ? 'DELETE' : 'POST';
      const response = await fetch(`/api/v1/posts/${post.id}/like`, {
        method,
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        setIsLiked(!isLiked);
        setLikeCount(prev => isLiked ? prev - 1 : prev + 1);
      }
    } catch (error) {
      console.error('Failed to like post:', error);
    }
  };

  return (
    <article className="post-card">
      <div className="post-header">
        <div className="user-info">
          <img
            src={post.user.avatarUrl || '/default-avatar.png'}
            alt={post.user.firstName}
            className="avatar"
          />
          <div>
            <div className="user-name">
              {post.user.firstName} {post.user.lastName}
              {post.user.roleBadge && (
                <span className={`role-badge ${post.user.role}`}>
                  {post.user.roleBadge}
                </span>
              )}
            </div>
            <div className="post-meta">
              @{post.user.username} · {formatTimeAgo(post.createdAt)}
              {post.location && (
                <> · 📍 {post.location.city}, {post.location.district}</>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="post-content">
        <p>{post.content}</p>
        
        {post.mediaUrls && post.mediaUrls.length > 0 && (
          <div className="post-media">
            {post.mediaUrls.map((url, index) => (
              <img key={index} src={url} alt={`Media ${index + 1}`} />
            ))}
          </div>
        )}
      </div>

      <div className="post-footer">
        <div className="politpuan-section">
          <PolitPuanBadge score={post.politPuan} />
          {post.aiAnalysis && (
            <AIAnalysisTag analysis={post.aiAnalysis} />
          )}
        </div>

        <InteractionButtons
          postId={post.id}
          isLiked={isLiked}
          likeCount={likeCount}
          commentCount={post.interactionCounts.comments}
          shareCount={post.interactionCounts.shares}
          onLike={handleLike}
        />
      </div>
    </article>
  );
}
```

### 3. PolitPuan Dashboard

```typescript
// components/PolitPuanDashboard.tsx
import { useQuery } from '@tanstack/react-query';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { Badge } from './Badge';

interface PolitPuanDashboardProps {
  userId: string;
}

export function PolitPuanDashboard({ userId }: PolitPuanDashboardProps) {
  const { data, isLoading } = useQuery({
    queryKey: ['politpuan', userId],
    queryFn: async () => {
      const response = await fetch(`/api/v1/politpuan/${userId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      return response.json();
    }
  });

  const { data: history } = useQuery({
    queryKey: ['politpuan-history', userId],
    queryFn: async () => {
      const response = await fetch(
        `/api/v1/politpuan/${userId}/history?period=monthly&limit=30`,
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        }
      );
      return response.json();
    }
  });

  if (isLoading) return <div>Loading...</div>;

  return (
    <div className="politpuan-dashboard">
      <div className="score-overview">
        <div className="current-score">
          <h2>PolitPuan</h2>
          <div className="score-value">{data.currentScore.toLocaleString()}</div>
          <Badge level={data.badge} />
          <div className={`trend ${data.trend.direction}`}>
            {data.trend.direction === 'up' ? '↑' : '↓'} {data.trend.change}
            ({data.trend.changePercent}%)
          </div>
        </div>

        <div className="rank">
          <div className="rank-value">#{data.rank}</div>
          <div className="rank-label">Sıralama</div>
        </div>
      </div>

      <div className="breakdown">
        <h3>Katman Detayları</h3>
        <div className="breakdown-grid">
          <div className="breakdown-item">
            <span className="label">Katman 1 (Etkileşim)</span>
            <span className="value">{data.breakdown.layer1}</span>
          </div>
          <div className="breakdown-item">
            <span className="label">Katman 2 (Etki Profili)</span>
            <span className="value">{data.breakdown.layer2}</span>
          </div>
          <div className="breakdown-item">
            <span className="label">Katman 3 (İçerik Türü)</span>
            <span className="value">{data.breakdown.layer3}</span>
          </div>
          <div className="breakdown-item">
            <span className="label">Katman 4 (Gerilim)</span>
            <span className="value">{data.breakdown.layer4}</span>
          </div>
          <div className="breakdown-item">
            <span className="label">Katman 5 (Zamanlama)</span>
            <span className="value">{data.breakdown.layer5}</span>
          </div>
          <div className="breakdown-item">
            <span className="label">Rol Çarpanı</span>
            <span className="value">×{data.breakdown.roleMultiplier}</span>
          </div>
        </div>
      </div>

      {history && (
        <div className="history-chart">
          <h3>Geçmiş Performans</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={history.history}>
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Line
                type="monotone"
                dataKey="score"
                stroke="#1E40AF"
                strokeWidth={2}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
```

### 4. Harita Modülü (Teşkilat)

```typescript
// components/OrganizationMap.tsx
import { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import { useQuery } from '@tanstack/react-query';
import 'leaflet/dist/leaflet.css';

interface OrganizationMapProps {
  partyId?: string;
  zoomLevel: 'country' | 'province' | 'district';
}

export function OrganizationMap({ partyId, zoomLevel }: OrganizationMapProps) {
  const [bounds, setBounds] = useState<[number, number, number, number] | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['organization-map', partyId, zoomLevel, bounds],
    queryFn: async () => {
      const params = new URLSearchParams({
        zoomLevel,
        ...(partyId && { partyId }),
        ...(bounds && { bounds: bounds.join(',') })
      });

      const response = await fetch(`/api/v1/organizations/map?${params}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      return response.json();
    }
  });

  if (isLoading) return <div>Loading map...</div>;

  return (
    <div className="organization-map">
      <MapContainer
        center={[39.9334, 32.8597]} // Ankara
        zoom={6}
        style={{ height: '600px', width: '100%' }}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; OpenStreetMap contributors'
        />

        {data?.organizations.map((org: Organization) => (
          <Marker
            key={org.id}
            position={[org.location.coordinates[1], org.location.coordinates[0]]}
          >
            <Popup>
              <div className="org-popup">
                <h3>{org.name}</h3>
                <p>Üye Sayısı: {org.memberCount}</p>
                <p>Ortalama PolitPuan: {org.statistics.averagePolitPuan}</p>
                {org.leader && (
                  <p>Lider: {org.leader.name}</p>
                )}
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}
```

---

## Backend Örnekleri (NestJS)

### 1. Post Service

```typescript
// services/post.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Post } from '../entities/post.entity';
import { PolitPuanService } from './politpuan.service';
import { AIService } from './ai.service';

@Injectable()
export class PostService {
  constructor(
    @InjectRepository(Post)
    private postRepository: Repository<Post>,
    private politPuanService: PolitPuanService,
    private aiService: AIService
  ) {}

  async createPost(userId: string, createPostDto: CreatePostDto): Promise<Post> {
    // AI analizi
    const aiAnalysis = await this.aiService.analyzeContent(createPostDto.content);

    // Post oluştur
    const post = this.postRepository.create({
      userId,
      content: createPostDto.content,
      contentType: createPostDto.contentType,
      mediaUrls: createPostDto.mediaUrls,
      visibility: createPostDto.visibility,
      location: createPostDto.location,
      aiAnalysis
    });

    const savedPost = await this.postRepository.save(post);

    // PolitPuan hesapla (async)
    this.politPuanService.calculatePostPolitPuan(savedPost.id).catch(console.error);

    return savedPost;
  }

  async getFeed(
    userId: string,
    type: FeedType,
    page: number,
    limit: number,
    filters?: FeedFilters
  ): Promise<{ posts: Post[]; pagination: Pagination }> {
    const queryBuilder = this.postRepository
      .createQueryBuilder('post')
      .leftJoinAndSelect('post.user', 'user')
      .leftJoinAndSelect('user.profile', 'profile')
      .where('post.isDeleted = :isDeleted', { isDeleted: false });

    // Feed tipine göre filtrele
    switch (type) {
      case 'party':
        // Parti üyelerinin içerikleri
        queryBuilder
          .innerJoin('user.partyMemberships', 'membership')
          .where('membership.status = :status', { status: 'active' });
        break;
      case 'local':
        if (filters?.city) {
          queryBuilder.andWhere('post.locationCity = :city', { city: filters.city });
        }
        if (filters?.district) {
          queryBuilder.andWhere('post.locationDistrict = :district', {
            district: filters.district
          });
        }
        break;
      case 'following':
        // Takip edilen kullanıcılar
        queryBuilder
          .innerJoin('user.followers', 'follower', 'follower.followerId = :userId', {
            userId
          });
        break;
      case 'trending':
        // Trend içerikler (son 24 saat, yüksek PolitPuan)
        queryBuilder
          .where('post.createdAt > :date', {
            date: new Date(Date.now() - 24 * 60 * 60 * 1000)
          })
          .orderBy('post.politPuan', 'DESC');
        break;
      default:
        // Genel feed
        queryBuilder.orderBy('post.politPuan', 'DESC');
    }

    // Sayfalama
    const skip = (page - 1) * limit;
    queryBuilder.skip(skip).take(limit);

    const [posts, total] = await queryBuilder.getManyAndCount();

    return {
      posts,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  async likePost(postId: string, userId: string): Promise<void> {
    const post = await this.postRepository.findOne({ where: { id: postId } });
    if (!post) throw new NotFoundException('Post not found');

    // Etkileşim kaydı oluştur (veya güncelle)
    // ...

    // PolitPuan'ı güncelle (async)
    this.politPuanService.updatePostPolitPuan(postId).catch(console.error);
  }
}
```

### 2. PolitPuan Service

```typescript
// services/politpuan.service.ts
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Post } from '../entities/post.entity';
import { User } from '../entities/user.entity';
import { PolitPuanHistory } from '../entities/politpuan-history.entity';
import {
  calculatePolitPuan,
  calculateLayer1,
  calculateLayer2,
  calculateLayer3,
  calculateLayer4,
  calculateLayer5
} from '../utils/politpuan-calculator';

@Injectable()
export class PolitPuanService {
  constructor(
    @InjectRepository(Post)
    private postRepository: Repository<Post>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(PolitPuanHistory)
    private historyRepository: Repository<PolitPuanHistory>
  ) {}

  async calculatePostPolitPuan(postId: string): Promise<number> {
    const post = await this.postRepository.findOne({
      where: { id: postId },
      relations: ['user', 'user.profile', 'interactions']
    });

    if (!post) throw new Error('Post not found');

    // Gerekli verileri topla
    const recentPosts = await this.getRecentPosts(post.userId, 5);
    const userProfile = await this.getUserProfile(post.userId);
    const aiAnalysis = post.aiAnalysis;
    const electionPeriod = await this.getElectionPeriod();
    const agendaMatch = await this.getAgendaMatch(post);
    const viralMetrics = await this.getViralMetrics(post);

    // Hesapla
    const result = calculatePolitPuan({
      recentPosts,
      userProfile,
      contentType: post.contentType,
      aiAnalysis,
      electionPeriod,
      agendaMatch,
      viralMetrics,
      hoursSincePost: this.getHoursSincePost(post.createdAt),
      userRole: post.user.role
    });

    // Post'u güncelle
    post.politPuan = result.finalScore;
    await this.postRepository.save(post);

    // Geçmişe kaydet
    await this.historyRepository.save({
      userId: post.userId,
      postId: post.id,
      score: result.finalScore,
      ...result.breakdown,
      period: 'realtime',
      calculatedAt: new Date()
    });

    return result.finalScore;
  }

  async updateUserPolitPuan(userId: string): Promise<number> {
    const posts = await this.postRepository.find({
      where: { userId, isDeleted: false },
      order: { createdAt: 'DESC' },
      take: 5
    });

    // En yüksek 5 post'un ortalaması
    const averagePolitPuan = posts.reduce((sum, post) => sum + post.politPuan, 0) / posts.length;

    // Kullanıcı profilini güncelle
    // ...

    return averagePolitPuan;
  }

  private async getRecentPosts(userId: string, count: number) {
    return this.postRepository.find({
      where: { userId, isDeleted: false },
      order: { createdAt: 'DESC' },
      take: count
    });
  }

  private async getUserProfile(userId: string) {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: ['profile', 'followers', 'partyMemberships']
    });
    // Profile data'yı formatla
    return {
      followerCount: user.followers.length,
      profession: user.profile.profession,
      location: {
        city: user.profile.city,
        type: this.getLocationType(user.profile)
      },
      // ... diğer alanlar
    };
  }

  private getHoursSincePost(createdAt: Date): number {
    return (Date.now() - createdAt.getTime()) / (1000 * 60 * 60);
  }
}
```

### 3. AI Service

```typescript
// services/ai.service.ts
import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class AIService {
  private readonly aiServiceUrl = process.env.AI_SERVICE_URL;

  constructor(private httpService: HttpService) {}

  async analyzeContent(content: string): Promise<AIAnalysis> {
    try {
      const response = await firstValueFrom(
        this.httpService.post(`${this.aiServiceUrl}/analyze`, {
          content,
          includeSentiment: true,
          includeTopic: true,
          includeControversy: true
        })
      );

      return response.data.analysis;
    } catch (error) {
      console.error('AI analysis failed:', error);
      // Fallback: basit analiz
      return this.fallbackAnalysis(content);
    }
  }

  async generateRecommendations(userId: string, type: string): Promise<any[]> {
    const response = await firstValueFrom(
      this.httpService.get(`${this.aiServiceUrl}/recommendations`, {
        params: { userId, type }
      })
    );

    return response.data.recommendations;
  }

  private fallbackAnalysis(content: string): AIAnalysis {
    // Basit keyword-based analiz
    return {
      sentiment: {
        label: 'neutral',
        score: 0.5
      },
      topic: {
        category: 'general',
        confidence: 0.5
      },
      controversy: {
        score: 0.3,
        factors: []
      },
      tension: {
        level: 'low',
        score: 0.3
      }
    };
  }
}
```

---

## AI Model Örnekleri (Python)

### 1. Sentiment Analysis Model

```python
# ai_models/sentiment_analyzer.py
from transformers import AutoTokenizer, AutoModelForSequenceClassification
import torch

class SentimentAnalyzer:
    def __init__(self, model_name='dbmdz/bert-base-turkish-cased'):
        self.tokenizer = AutoTokenizer.from_pretrained(model_name)
        self.model = AutoModelForSequenceClassification.from_pretrained(
            model_name,
            num_labels=4  # positive, neutral, negative, aggressive
        )
        self.model.eval()
        
        self.label_map = {
            0: 'positive',
            1: 'neutral',
            2: 'negative',
            3: 'aggressive'
        }
    
    def analyze(self, text: str) -> dict:
        inputs = self.tokenizer(
            text,
            return_tensors='pt',
            truncation=True,
            max_length=512,
            padding=True
        )
        
        with torch.no_grad():
            outputs = self.model(**inputs)
            logits = outputs.logits
            probabilities = torch.softmax(logits, dim=-1)
        
        predicted_label = torch.argmax(probabilities, dim=-1).item()
        confidence = probabilities[0][predicted_label].item()
        
        return {
            'label': self.label_map[predicted_label],
            'score': confidence,
            'probabilities': {
                label: prob.item()
                for label, prob in zip(self.label_map.values(), probabilities[0])
            }
        }
```

### 2. Topic Classification

```python
# ai_models/topic_classifier.py
from transformers import AutoTokenizer, AutoModelForSequenceClassification

class TopicClassifier:
    def __init__(self):
        self.model_name = 'dbmdz/bert-base-turkish-cased'
        self.tokenizer = AutoTokenizer.from_pretrained(self.model_name)
        self.model = AutoModelForSequenceClassification.from_pretrained(
            self.model_name,
            num_labels=20  # 20 kategori
        )
        
        self.categories = [
            'economy', 'foreign_policy', 'security', 'education',
            'health', 'environment', 'culture', 'sports',
            'technology', 'social', 'justice', 'agriculture',
            'transportation', 'energy', 'tourism', 'defense',
            'religion', 'immigration', 'democracy', 'general'
        ]
    
    def classify(self, text: str) -> dict:
        inputs = self.tokenizer(
            text,
            return_tensors='pt',
            truncation=True,
            max_length=512
        )
        
        with torch.no_grad():
            outputs = self.model(**inputs)
            logits = outputs.logits
            probabilities = torch.softmax(logits, dim=-1)
        
        predicted_idx = torch.argmax(probabilities, dim=-1).item()
        confidence = probabilities[0][predicted_idx].item()
        
        return {
            'category': self.categories[predicted_idx],
            'confidence': confidence,
            'all_probabilities': {
                cat: prob.item()
                for cat, prob in zip(self.categories, probabilities[0])
            }
        }
```

---

## Real-time Örnekleri (Socket.io)

### Server Side

```typescript
// socket/socket.gateway.ts
import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';

@WebSocketGateway({
  namespace: '/feed',
  cors: { origin: '*' }
})
export class FeedGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  constructor(private jwtService: JwtService) {}

  async handleConnection(client: Socket) {
    try {
      const token = client.handshake.auth.token;
      const payload = await this.jwtService.verifyAsync(token);
      client.data.userId = payload.sub;
    } catch (error) {
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    console.log(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage('subscribe:feed')
  handleSubscribeFeed(client: Socket) {
    const userId = client.data.userId;
    client.join(`feed:${userId}`);
  }

  // Yeni post oluşturulduğunda
  notifyNewPost(userId: string, post: Post) {
    this.server.to(`feed:${userId}`).emit('feed:new_post', post);
  }

  // PolitPuan güncellendiğinde
  notifyPolitPuanUpdate(userId: string, update: PolitPuanUpdate) {
    this.server.to(`feed:${userId}`).emit('feed:politpuan_update', update);
  }
}
```

### Client Side

```typescript
// hooks/useSocket.ts
import { useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';

export function useSocket(namespace: string) {
  const [socket, setSocket] = useState<Socket | null>(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const newSocket = io(`https://api.politplatform.com${namespace}`, {
      auth: { token }
    });

    newSocket.on('connect', () => {
      console.log('Connected to socket');
      newSocket.emit('subscribe:feed');
    });

    setSocket(newSocket);

    return () => {
      newSocket.close();
    };
  }, [namespace]);

  return socket;
}

// Usage
function FeedComponent() {
  const socket = useSocket('/feed');

  useEffect(() => {
    if (!socket) return;

    socket.on('feed:new_post', (post) => {
      // Yeni post geldi, feed'i güncelle
      console.log('New post:', post);
    });

    socket.on('feed:politpuan_update', (update) => {
      // PolitPuan güncellendi
      console.log('PolitPuan updated:', update);
    });

    return () => {
      socket.off('feed:new_post');
      socket.off('feed:politpuan_update');
    };
  }, [socket]);

  return <div>Feed content...</div>;
}
```

---

*Bu dokümantasyon, platformun temel implementasyon örneklerini içermektedir. Gerçek implementasyon sırasında bu örnekler referans alınabilir.*
