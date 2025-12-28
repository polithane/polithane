import { useState, useEffect, useMemo, useRef } from 'react';
import { Link } from 'react-router-dom';
import { HeroSlider } from '../components/home/HeroSlider';
import { IntroSlider } from '../components/home/IntroSlider';
import { ParliamentBar } from '../components/home/ParliamentBar';
import { StoriesBar } from '../components/home/StoriesBar';
import { AgendaBar } from '../components/home/AgendaBar';
import { PostCardHorizontal } from '../components/post/PostCardHorizontal';
import { HorizontalScroll } from '../components/common/HorizontalScroll';
import { MediaSidebar } from '../components/media/MediaSidebar';
import { Avatar } from '../components/common/Avatar';
// NOTE: No mock fallbacks in production. Everything should come from DB.
import { currentParliamentDistribution, totalSeats } from '../data/parliamentDistribution';
import { filterConsecutiveTextAudio } from '../utils/postFilters';
import api from '../utils/api';
import { apiCall } from '../utils/api';
import { useAuth } from '../contexts/AuthContext';

export const HomePage = () => {
  const { user, isAuthenticated } = useAuth();
  const [posts, setPosts] = useState([]);
  const [parties, setParties] = useState([]);
  const [parliamentDistribution, setParliamentDistribution] = useState(currentParliamentDistribution);
  const [agendas, setAgendas] = useState([]);
  const [users, setUsers] = useState([]);
  const [polifest, setPolifest] = useState([]);
  const [activeCategory, setActiveCategory] = useState('all'); // Mobil için aktif kategori - Default 'Tüm'
  const [homePostsPerRow, setHomePostsPerRow] = useState(2);
  const [mobileVisibleCount, setMobileVisibleCount] = useState(5);
  const [desktopVisible, setDesktopVisible] = useState({ hit: 10, mp: 10, org: 10, citizen: 10 });
  const [loading, setLoading] = useState(true);
  const [loadingMorePosts, setLoadingMorePosts] = useState(false);
  const [hasMorePosts, setHasMorePosts] = useState(true);
  const [postsOffset, setPostsOffset] = useState(0);
  const postsSentinelRef = useRef(null);
  const postsObserverRef = useRef(null);
  const hasUserScrolledRef = useRef(false);
  const [hasUserScrolled, setHasUserScrolled] = useState(false);
  const mobileSentinelRef = useRef(null);
  const mobileObserverRef = useRef(null);

  // Keep initial payload small for mobile performance.
  // Social-style batching: small pages, no background loading until user scrolls.
  const POSTS_PAGE_SIZE = 20;
  const FAST_MAX_AGE_MS = 24 * 60 * 60 * 1000;

  const filterActiveFastUsers = (list) => {
    const now = Date.now();
    return (Array.isArray(list) ? list : []).filter((x) => {
      const t = new Date(x?.latest_created_at || 0).getTime();
      if (!Number.isFinite(t) || t <= 0) return false;
      return now - t < FAST_MAX_AGE_MS;
    });
  };

  useEffect(() => {
    const onScroll = () => {
      if (hasUserScrolledRef.current) return;
      hasUserScrolledRef.current = true;
      setHasUserScrolled(true);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Mobile: render posts in small batches (5 by 5)
  useEffect(() => {
    setMobileVisibleCount(5);
    const t = setTimeout(() => setMobileVisibleCount(10), 800);
    return () => clearTimeout(t);
  }, [activeCategory]);

  // Desktop: initial 10 per category; then reveal progressively as carousel advances.

  useEffect(() => {
    // IMPORTANT:
    // HomePage renders a loading screen first, so the sentinel ref is null on initial mount.
    // We must re-attach the observer after loading finishes (otherwise mobile infinite load never triggers).
    if (loading) return undefined;
    const el = mobileSentinelRef.current;
    if (!el) return undefined;

    if (mobileObserverRef.current) mobileObserverRef.current.disconnect();
    mobileObserverRef.current = new IntersectionObserver(
      (entries) => {
        const e = entries?.[0];
        if (!e?.isIntersecting) return;
        if (!hasUserScrolledRef.current) return;
        setMobileVisibleCount((prev) => Math.min(prev + 5, 500));
      },
      { root: null, rootMargin: '180px', threshold: 0.01 }
    );
    mobileObserverRef.current.observe(el);
    return () => {
      mobileObserverRef.current?.disconnect();
    };
  }, [loading, activeCategory]);

  const computeHitPosts = (input = [], limit = 30) => {
    const now = Date.now();
    const candidates = (Array.isArray(input) ? input : [])
      .filter((p) => p && (p.post_id ?? p.id))
      .map((p) => {
        const createdAt = new Date(p.created_at || 0).getTime();
        const hours = Math.max(0, (now - (Number.isFinite(createdAt) ? createdAt : now)) / 36e5);
        const recency = 1 / (1 + hours / 12); // 12h half-ish decay
        const engagement =
          (Number(p.like_count || 0) || 0) +
          (Number(p.comment_count || 0) || 0) * 2 +
          (Number(p.share_count || 0) || 0) * 5 +
          (Number(p.view_count || 0) || 0) * 0.05;
        const engagementBoost = Math.log1p(Math.max(0, engagement));
        const base = Number(p.polit_score || 0) || 0;
        const score = base * (0.75 + 0.25 * recency) + engagementBoost * 12;
        return { p, score, recency };
      })
      .sort((a, b) => (b.score - a.score) || (b.recency - a.recency));

    const out = [];
    const perUser = new Map();
    const perUserType = new Map();
    let lastType = '';
    const maxPerUser = 2;

    for (const c of candidates) {
      if (out.length >= limit) break;
      const p = c.p;
      const postType = String(p.content_type || 'text');
      const userType = String(p?.user?.user_type || '');
      const uid = String(p.user_id ?? p?.user?.user_id ?? p?.user?.id ?? '');

      if (uid) {
        const n = perUser.get(uid) || 0;
        if (n >= maxPerUser) continue;
      }
      if (userType) {
        const n = perUserType.get(userType) || 0;
        // keep a mix: avoid overfilling by a single role in hit
        if (n >= Math.ceil(limit * 0.45)) continue;
      }
      // Avoid consecutive text/audio in hit itself (extra safety)
      if ((postType === 'text' || postType === 'audio') && postType === lastType) continue;

      out.push(p);
      lastType = postType;
      if (uid) perUser.set(uid, (perUser.get(uid) || 0) + 1);
      if (userType) perUserType.set(userType, (perUserType.get(userType) || 0) + 1);
    }

    return filterConsecutiveTextAudio(out, true).slice(0, limit);
  };

  const hitPosts = useMemo(() => computeHitPosts(posts, 30), [posts]);

  // Merge static parliament distribution with DB parties (for correct slug/logo on click & popup)
  const parliamentParties = useMemo(() => {
    const dist = Array.isArray(parliamentDistribution) ? parliamentDistribution : [];
    const db = Array.isArray(parties) ? parties : [];
    const keyOf = (s) => String(s || '').trim().toUpperCase('tr-TR');
    const dbByShort = new Map(db.map((p) => [keyOf(p?.short_name), p]).filter(([k]) => k));
    return dist.map((p) => {
      const match = dbByShort.get(keyOf(p?.shortName)) || null;
      return {
        ...p,
        // Prefer DB slug/id when available (ParliamentBar will use this for navigation)
        slug: match?.slug || null,
        party_id: match?.id || null,
        logo_url: match?.logo_url || null,
        // Prefer DB color if set (but keep distribution as fallback)
        color: match?.color || p?.color,
      };
    });
  }, [parties]);
  
  useEffect(() => {
    // Load data from Supabase
    const loadData = async () => {
      setLoading(true);
      try {
        // Partiler + postlar (paged) (tamamı DB - Vercel /api üzerinden)
        const [partiesData, postsData, parliamentRes, publicSiteRes] = await Promise.all([
          api.parties.getAll().catch(() => []),
          api.posts.getAll({ limit: POSTS_PAGE_SIZE, offset: 0, order: 'created_at.desc' }).catch(() => []),
          apiCall('/api/public/parliament', { method: 'GET' }).catch(() => null),
          apiCall('/api/public/site', { method: 'GET' }).catch(() => null),
        ]);

        // Partiler (DB)
        setParties(Array.isArray(partiesData) ? partiesData : []);

        // Parliament distribution (admin-managed; fallback to bundled data)
        const dist = parliamentRes?.data?.distribution;
        if (Array.isArray(dist) && dist.length > 0) {
          setParliamentDistribution(
            dist.map((p) => ({
              name: p?.name,
              shortName: p?.shortName,
              seats: p?.seats,
              color: p?.color,
              slug: p?.slug,
              logo_url: p?.logo_url,
            }))
          );
        } else {
          setParliamentDistribution(currentParliamentDistribution);
        }

        // Home layout settings
        const hpr = publicSiteRes?.data?.homePostsPerRow;
        if (hpr !== undefined && hpr !== null) {
          const n = Math.max(1, Math.min(3, parseInt(String(hpr), 10) || 2));
          setHomePostsPerRow(n);
        } else {
          setHomePostsPerRow(2);
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
                // Verified badge is admin-approval only; do not auto-mark users as verified here.
                verification_badge: false,
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

        let initialPosts = (postsData || []).map(mapDbPostToUi);

        // Ensure each category has at least 5 posts (best-effort, capped).
        const needPer = 5;
        const maxExtraPages = 5; // 5*20 = 100 extra max
        let extraPage = 0;
        let offset = initialPosts.length;
        const countByType = (list) => {
          const arr = Array.isArray(list) ? list : [];
          return {
            mp: arr.filter((p) => p?.user?.user_type === 'mp').length,
            org: arr.filter((p) => p?.user?.user_type === 'party_official').length,
            media: arr.filter((p) => p?.user?.user_type === 'media').length,
            citizen: arr.filter((p) => p?.user?.user_type === 'party_member' || p?.user?.user_type === 'citizen').length,
          };
        };
        const isEnough = (c) => c.mp >= needPer && c.org >= needPer && c.media >= needPer && c.citizen >= needPer;

        while (!isEnough(countByType(initialPosts)) && extraPage < maxExtraPages) {
          // eslint-disable-next-line no-await-in-loop
          const more = await api.posts.getAll({ limit: POSTS_PAGE_SIZE, offset, order: 'created_at.desc' }).catch(() => []);
          const nextBatch = (more || []).map(mapDbPostToUi);
          if (nextBatch.length === 0) break;
          const seen = new Set(initialPosts.map((p) => String(p?.post_id ?? p?.id ?? '')));
          for (const p of nextBatch) {
            const id = String(p?.post_id ?? p?.id ?? '');
            if (!id || seen.has(id)) continue;
            seen.add(id);
            initialPosts.push(p);
          }
          offset += nextBatch.length;
          extraPage += 1;
          if (nextBatch.length < POSTS_PAGE_SIZE) break;
        }

        setPosts(initialPosts);
        setPostsOffset(initialPosts.length);
        setHasMorePosts(initialPosts.length >= POSTS_PAGE_SIZE);

        // Agendas: load from admin-managed list (no mock fallback in production)
        try {
          const agendaRes = await apiCall('/api/agendas?limit=80').catch(() => null);
          const list = agendaRes?.data || [];
          const normalized = (Array.isArray(list) ? list : [])
            .filter((a) => a?.is_active !== false)
            .slice(0, 80);
          setAgendas(normalized);
        } catch {
          setAgendas([]);
        }

        // Fast: If logged in -> followings (plus self) with global fallback.
        // If not logged in -> global public fast (polit_score / popularity).
        try {
          const endpoint = isAuthenticated ? '/api/fast?limit=24' : '/api/fast/public?limit=24';
          const r = await apiCall(endpoint).catch(() => null);
          const list = r?.data || [];
          setPolifest(filterActiveFastUsers(list));
        } catch {
          setPolifest([]);
        }

      } catch (error) {
        console.error('Error loading data:', error);
        setPosts([]);
        setParties([]);
        setParliamentDistribution(currentParliamentDistribution);
        setAgendas([]);
        setPolifest([]);
        setPostsOffset(0);
        setHasMorePosts(false);
      } finally {
        setLoading(false);
      }
    };

    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Refresh Fast list when auth state changes (without reloading whole HomePage)
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const endpoint = isAuthenticated ? '/api/fast?limit=24' : '/api/fast/public?limit=24';
        const r = await apiCall(endpoint).catch(() => null);
        const list = r?.data || [];
        if (!cancelled) setPolifest(filterActiveFastUsers(list));
      } catch {
        if (!cancelled) setPolifest([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated]);

  // Keep Fast list fresh so 24h expiry is reflected without a full refresh.
  useEffect(() => {
    let cancelled = false;
    const tick = async () => {
      try {
        if (document?.hidden) return;
        const endpoint = isAuthenticated ? '/api/fast?limit=24' : '/api/fast/public?limit=24';
        const r = await apiCall(endpoint).catch(() => null);
        const list = r?.data || [];
        if (!cancelled) setPolifest(filterActiveFastUsers(list));
      } catch {
        // ignore
      }
    };
    // refresh fairly often (cheap endpoint; keeps 24h expiry accurate)
    tick();
    const t = setInterval(tick, 60_000);
    return () => {
      cancelled = true;
      clearInterval(t);
    };
  }, [isAuthenticated]);

  const fetchMorePosts = async () => {
    if (loadingMorePosts || !hasMorePosts) return;
    setLoadingMorePosts(true);
    try {
      const partyMap = new Map((parties || []).map((p) => [p.id, p]));
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
              verification_badge: false,
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

      const postsData = await api.posts.getAll({ limit: POSTS_PAGE_SIZE, offset: postsOffset, order: 'created_at.desc' }).catch(() => []);
      const nextBatch = (postsData || []).map(mapDbPostToUi);
      setPosts((prev) => {
        const seen = new Set((prev || []).map((p) => String(p?.post_id ?? p?.id ?? '')));
        const merged = prev ? prev.slice() : [];
        for (const p of nextBatch) {
          const id = String(p?.post_id ?? p?.id ?? '');
          if (!id || seen.has(id)) continue;
          seen.add(id);
          merged.push(p);
        }
        return merged;
      });
      setPostsOffset((prev) => prev + nextBatch.length);
      if (nextBatch.length < POSTS_PAGE_SIZE) setHasMorePosts(false);
    } catch {
      setHasMorePosts(false);
    } finally {
      setLoadingMorePosts(false);
    }
  };

  useEffect(() => {
    if (loading) return;
    if (!postsSentinelRef.current) return;
    if (postsObserverRef.current) postsObserverRef.current.disconnect();
    postsObserverRef.current = new IntersectionObserver(
      (entries) => {
        const e = entries[0];
        // Don't waste bandwidth unless user scrolls.
        if (!hasUserScrolledRef.current) return;
        if (e?.isIntersecting) fetchMorePosts();
      },
      { root: null, rootMargin: '120px', threshold: 0.01 }
    );
    postsObserverRef.current.observe(postsSentinelRef.current);
    return () => {
      postsObserverRef.current?.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, hasMorePosts, postsOffset, parties, hasUserScrolled]);
  
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
        .sort((a, b) => (Number(b.polit_score || 0) - Number(a.polit_score || 0)))
        .slice(0, need)
        .forEach((p) => {
          used.add(p.post_id);
          selected.push(p);
        });
    }
    if (selected.length < 10) {
      list
        .filter((p) => !used.has(p.post_id))
        .sort((a, b) => (Number(b.polit_score || 0) - Number(a.polit_score || 0)))
        .slice(0, 10 - selected.length)
        .forEach((p) => {
          used.add(p.post_id);
          selected.push(p);
        });
    }
    return selected;
  };

  const { mpPosts, organizationPosts, citizenPosts, mediaPosts, featuredPosts } = useMemo(() => {
    const byScoreDesc = (a, b) => (Number(b?.polit_score || 0) - Number(a?.polit_score || 0));
    const list = Array.isArray(posts) ? posts : [];
    const mp = list.filter((p) => p?.user?.user_type === 'mp').slice().sort(byScoreDesc);
    const org = list.filter((p) => p?.user?.user_type === 'party_official').slice().sort(byScoreDesc);
    const citizens = list
      .filter((p) => p?.user?.user_type === 'party_member' || p?.user?.user_type === 'citizen')
      .slice()
      .sort(byScoreDesc);
    const media = list.filter((p) => p?.user?.user_type === 'media').slice().sort(byScoreDesc);
    const featured =
      list.length > 0 ? list.filter((p) => p?.is_featured).slice().sort(byScoreDesc).slice(0, 5) : [];
    return {
      mpPosts: pickFixedMix(mp),
      organizationPosts: pickFixedMix(org),
      citizenPosts: pickFixedMix(citizens),
      mediaPosts: pickFixedMix(media),
      featuredPosts: featured,
    };
  }, [posts]);

  const mpPostsDesktop = useMemo(() => filterConsecutiveTextAudio(mpPosts, true), [mpPosts]);
  const organizationPostsDesktop = useMemo(() => filterConsecutiveTextAudio(organizationPosts, true), [organizationPosts]);
  const citizenPostsDesktop = useMemo(() => filterConsecutiveTextAudio(citizenPosts, true), [citizenPosts]);
  
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
        {/* Üst Tanıtım Slaytı */}
        <IntroSlider />

        <div className="mt-2">
          {/* Parti Bayrakları - Meclis Dağılımı */}
          <ParliamentBar parliamentData={parliamentParties} totalSeats={totalSeats} />
        </div>

        {/* Stories/Reels Bar */}
        <div className="-mt-2">
          <StoriesBar stories={polifest} mode="fast" />
        </div>

        {/* Gündem Bar */}
        <div className="-mt-2">
          {agendas.length > 0 && <AgendaBar agendas={agendas} />}
        </div>
        
        {/* MOBİL: Tab Navigation - Sticky (full-width, no right gap) */}
        <div className="md:hidden sticky top-[72px] z-10 bg-gray-50 -mx-4 px-4 pb-3 mb-4 border-b border-gray-200">
          <div className="flex items-center gap-2">
            {categories.map((cat) => {
              const isActive = activeCategory === cat.id;
              const base =
                cat.id === 'mps'
                  ? 'border-sky-300 text-sky-800 bg-sky-50'
                  : cat.id === 'organization'
                    ? 'border-lime-300 text-lime-800 bg-lime-50'
                    : cat.id === 'citizens'
                      ? 'border-gray-300 text-gray-800 bg-white'
                      : cat.id === 'media'
                        ? 'border-amber-300 text-amber-900 bg-amber-50'
                        : 'border-blue-200 text-blue-900 bg-blue-50';
              const active =
                cat.id === 'mps'
                  ? 'bg-sky-600 text-white border-sky-600'
                  : cat.id === 'organization'
                    ? 'bg-lime-600 text-white border-lime-600'
                    : cat.id === 'citizens'
                      ? 'bg-gray-900 text-white border-gray-900'
                      : cat.id === 'media'
                        ? 'bg-amber-500 text-white border-amber-500'
                        : 'bg-primary-blue text-white border-primary-blue';
              return (
                <button
                  key={cat.id}
                  onClick={() => setActiveCategory(cat.id)}
                  className={[
                    'flex-1 min-w-0 px-2 py-2 rounded-full font-black text-xs tracking-tight transition-all border text-center truncate',
                    isActive ? `${active} shadow-sm` : `${base} hover:shadow-sm`,
                  ].join(' ')}
                >
                  {cat.name}
                </button>
              );
            })}
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
                  {/* Mobil grid (admin ayarlı): satır başına Polit sayısı */}
                  <div
                    className={[
                      'grid gap-3',
                      homePostsPerRow >= 3 ? 'grid-cols-3' : homePostsPerRow === 2 ? 'grid-cols-2' : 'grid-cols-1',
                    ].join(' ')}
                  >
                    {activeTab.posts.slice(0, mobileVisibleCount).map(post => (
                      <PostCardHorizontal 
                        key={post.post_id ?? post.id} 
                        post={post}
                        showCity={activeTab.id === 'mps' || activeTab.id === 'all'}
                        showPartyLogo={activeTab.id !== 'citizens'}
                        fullWidth={true}
                      />
                    ))}
                  </div>
                  <div ref={mobileSentinelRef} className="h-8" />
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
                  <Link to="/hit" className="text-primary-blue hover:underline text-sm">
                    Tümünü Gör
                  </Link>
                </div>
                <HorizontalScroll 
                  autoScroll={true} 
                  scrollInterval={4000}
                  itemsPerView={{ desktop: 5, tablet: 3, mobile: 2 }}
                  manualScrollItems={{ desktop: 5, tablet: 3, mobile: 2 }}
                  onAdvance={({ screenSize, by }) => {
                    if (screenSize !== 'desktop') return;
                    const inc = Number(by || 0) || 0;
                    if (inc <= 0) return;
                    setDesktopVisible((p) => ({
                      ...p,
                      hit: Math.min((p.hit || 10) + inc, hitPosts.length),
                    }));
                  }}
                >
                  {hitPosts.slice(0, Math.max(10, desktopVisible.hit)).map(post => (
                    <PostCardHorizontal 
                      key={post.post_id ?? post.id} 
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
                <Link to="/category/mps" className="text-primary-blue hover:underline text-sm">
                  Tümünü Gör
                </Link>
              </div>
              <HorizontalScroll 
                autoScroll={true} 
                scrollInterval={5000}
                itemsPerView={{ desktop: 5, tablet: 3, mobile: 2 }}
                manualScrollItems={{ desktop: 5, tablet: 3, mobile: 2 }}
                onAdvance={({ screenSize, by }) => {
                  if (screenSize !== 'desktop') return;
                  const inc = Number(by || 0) || 0;
                  if (inc <= 0) return;
                  setDesktopVisible((p) => ({
                    ...p,
                    mp: Math.min((p.mp || 10) + inc, mpPostsDesktop.length),
                  }));
                }}
              >
                {mpPostsDesktop.slice(0, Math.max(10, desktopVisible.mp)).map(post => (
                  <PostCardHorizontal 
                    key={post.post_id ?? post.id} 
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
                <Link to="/category/organization" className="text-primary-blue hover:underline text-sm">
                  Tümünü Gör
                </Link>
              </div>
              <HorizontalScroll 
                autoScroll={true} 
                scrollInterval={5000}
                itemsPerView={{ desktop: 5, tablet: 3, mobile: 2 }}
                manualScrollItems={{ desktop: 5, tablet: 3, mobile: 2 }}
                onAdvance={({ screenSize, by }) => {
                  if (screenSize !== 'desktop') return;
                  const inc = Number(by || 0) || 0;
                  if (inc <= 0) return;
                  setDesktopVisible((p) => ({
                    ...p,
                    org: Math.min((p.org || 10) + inc, organizationPostsDesktop.length),
                  }));
                }}
              >
                {organizationPostsDesktop.slice(0, Math.max(10, desktopVisible.org)).map(post => (
                  <PostCardHorizontal 
                    key={post.post_id ?? post.id} 
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
                <Link to="/category/citizens" className="text-primary-blue hover:underline text-sm">
                  Tümünü Gör
                </Link>
              </div>
              <HorizontalScroll 
                autoScroll={true} 
                scrollInterval={5000}
                itemsPerView={{ desktop: 5, tablet: 3, mobile: 2 }}
                manualScrollItems={{ desktop: 5, tablet: 3, mobile: 2 }}
                onAdvance={({ screenSize, by }) => {
                  if (screenSize !== 'desktop') return;
                  const inc = Number(by || 0) || 0;
                  if (inc <= 0) return;
                  setDesktopVisible((p) => ({
                    ...p,
                    citizen: Math.min((p.citizen || 10) + inc, citizenPostsDesktop.length),
                  }));
                }}
              >
                {citizenPostsDesktop.slice(0, Math.max(10, desktopVisible.citizen)).map(post => (
                  <PostCardHorizontal 
                    key={post.post_id ?? post.id} 
                    post={post}
                  />
                ))}
              </HorizontalScroll>
            </section>
            
            </div>
          </div>
          
          {/* Sağ Medya Sidebar */}
          <aside className="hidden lg:block lg:mr-0 min-w-0">
            <div className="sticky top-20">
              <div className="bg-slate-800/80 backdrop-blur-sm rounded-lg p-4 shadow-lg">
                <h2 className="text-sm font-bold text-white mb-4 whitespace-nowrap">MEDYA GÜNDEMİ</h2>
                <div className="-mx-4 -mb-4 px-4 pb-4">
                  <MediaSidebar posts={posts} />
                </div>
              </div>
            </div>
          </aside>
        </div>
        {/* Infinite feed loader (best-effort) */}
        <div ref={postsSentinelRef} className="h-10" />
        {loadingMorePosts && (
          <div className="text-center text-sm text-gray-600 py-4">Daha fazla içerik yükleniyor…</div>
        )}
      </div>
    </div>
  );
};
