import { UserRole, User, Post } from '../types'

// Rol bazlı görüntüleme yetkileri
export interface ViewPermissions {
  canViewAllPosts: boolean
  canViewPartyPosts: boolean
  canViewLocalPosts: boolean
  canViewCompetitorPosts: boolean
  canViewAnalytics: boolean
  analyticsDepth: 'none' | 'basic' | 'intermediate' | 'advanced' | 'full'
  canViewOrganizationMap: boolean
  canViewMediaCenter: boolean
  canViewAgenda: boolean
  canViewAIRecommendations: boolean
}

// Rol bazlı içerik paylaşma hakları
export interface ContentPermissions {
  canPost: boolean
  canPostMedia: boolean
  canPostLive: boolean
  canCreatePoll: boolean
  canRepost: boolean
  canComment: boolean
  maxPostLength: number
  canSchedulePost: boolean
}

// PolitPuan çarpanları
export const POLITPUAN_CARPANLARI: Record<UserRole, number> = {
  [UserRole.VATANDAS_DOGRULANMAMIS]: 0.5,
  [UserRole.VATANDAS_DOGRULANMIS]: 1.0,
  [UserRole.PARTI_UYESI]: 1.2,
  [UserRole.SİYASETCI_ILCE]: 1.5,
  [UserRole.SİYASETCI_IL]: 1.8,
  [UserRole.SİYASETCI_GENEL_MERKEZ]: 2.0,
  [UserRole.MILLETVEKILI]: 2.5,
  [UserRole.GAZETECI]: 1.8,
  [UserRole.TESKILAT_IL_BASKANI]: 1.6,
  [UserRole.TESKILAT_ILCE_BASKANI]: 1.4,
  [UserRole.TESKILAT_KADIN_KOLLARI]: 1.3,
  [UserRole.TESKILAT_GENC_KOLLARI]: 1.3,
  [UserRole.PARTI_GENEL_MERKEZ_ADMIN]: 2.2,
  [UserRole.SISTEM_ADMIN]: 3.0,
}

// Rol bazlı yetkileri getir
export function getViewPermissions(role: UserRole): ViewPermissions {
  switch (role) {
    case UserRole.VATANDAS_DOGRULANMAMIS:
      return {
        canViewAllPosts: true,
        canViewPartyPosts: false,
        canViewLocalPosts: true,
        canViewCompetitorPosts: true,
        canViewAnalytics: false,
        analyticsDepth: 'none',
        canViewOrganizationMap: false,
        canViewMediaCenter: true,
        canViewAgenda: true,
        canViewAIRecommendations: false,
      }

    case UserRole.VATANDAS_DOGRULANMIS:
      return {
        canViewAllPosts: true,
        canViewPartyPosts: false,
        canViewLocalPosts: true,
        canViewCompetitorPosts: true,
        canViewAnalytics: true,
        analyticsDepth: 'basic',
        canViewOrganizationMap: true,
        canViewMediaCenter: true,
        canViewAgenda: true,
        canViewAIRecommendations: true,
      }

    case UserRole.PARTI_UYESI:
      return {
        canViewAllPosts: true,
        canViewPartyPosts: true,
        canViewLocalPosts: true,
        canViewCompetitorPosts: false, // Rakip içerik sınırlı görünürlük
        canViewAnalytics: true,
        analyticsDepth: 'intermediate',
        canViewOrganizationMap: true,
        canViewMediaCenter: true,
        canViewAgenda: true,
        canViewAIRecommendations: true,
      }

    case UserRole.SİYASETCI_ILCE:
    case UserRole.SİYASETCI_IL:
    case UserRole.SİYASETCI_GENEL_MERKEZ:
      return {
        canViewAllPosts: true,
        canViewPartyPosts: true,
        canViewLocalPosts: true,
        canViewCompetitorPosts: true,
        canViewAnalytics: true,
        analyticsDepth: 'advanced',
        canViewOrganizationMap: true,
        canViewMediaCenter: true,
        canViewAgenda: true,
        canViewAIRecommendations: true,
      }

    case UserRole.MILLETVEKILI:
      return {
        canViewAllPosts: true,
        canViewPartyPosts: true,
        canViewLocalPosts: true,
        canViewCompetitorPosts: true,
        canViewAnalytics: true,
        analyticsDepth: 'full',
        canViewOrganizationMap: true,
        canViewMediaCenter: true,
        canViewAgenda: true,
        canViewAIRecommendations: true,
      }

    case UserRole.GAZETECI:
      return {
        canViewAllPosts: true,
        canViewPartyPosts: true,
        canViewLocalPosts: true,
        canViewCompetitorPosts: true,
        canViewAnalytics: true,
        analyticsDepth: 'advanced',
        canViewOrganizationMap: true,
        canViewMediaCenter: true,
        canViewAgenda: true,
        canViewAIRecommendations: true,
      }

    case UserRole.TESKILAT_IL_BASKANI:
    case UserRole.TESKILAT_ILCE_BASKANI:
    case UserRole.TESKILAT_KADIN_KOLLARI:
    case UserRole.TESKILAT_GENC_KOLLARI:
      return {
        canViewAllPosts: true,
        canViewPartyPosts: true,
        canViewLocalPosts: true,
        canViewCompetitorPosts: false,
        canViewAnalytics: true,
        analyticsDepth: 'advanced',
        canViewOrganizationMap: true,
        canViewMediaCenter: true,
        canViewAgenda: true,
        canViewAIRecommendations: true,
      }

    case UserRole.PARTI_GENEL_MERKEZ_ADMIN:
    case UserRole.SISTEM_ADMIN:
      return {
        canViewAllPosts: true,
        canViewPartyPosts: true,
        canViewLocalPosts: true,
        canViewCompetitorPosts: true,
        canViewAnalytics: true,
        analyticsDepth: 'full',
        canViewOrganizationMap: true,
        canViewMediaCenter: true,
        canViewAgenda: true,
        canViewAIRecommendations: true,
      }

    default:
      return {
        canViewAllPosts: false,
        canViewPartyPosts: false,
        canViewLocalPosts: false,
        canViewCompetitorPosts: false,
        canViewAnalytics: false,
        analyticsDepth: 'none',
        canViewOrganizationMap: false,
        canViewMediaCenter: false,
        canViewAgenda: false,
        canViewAIRecommendations: false,
      }
  }
}

// İçerik paylaşma yetkileri
export function getContentPermissions(role: UserRole): ContentPermissions {
  switch (role) {
    case UserRole.VATANDAS_DOGRULANMAMIS:
      return {
        canPost: true,
        canPostMedia: false,
        canPostLive: false,
        canCreatePoll: false,
        canRepost: true,
        canComment: true,
        maxPostLength: 280,
        canSchedulePost: false,
      }

    case UserRole.VATANDAS_DOGRULANMIS:
      return {
        canPost: true,
        canPostMedia: true,
        canPostLive: false,
        canCreatePoll: true,
        canRepost: true,
        canComment: true,
        maxPostLength: 500,
        canSchedulePost: true,
      }

    case UserRole.PARTI_UYESI:
      return {
        canPost: true,
        canPostMedia: true,
        canPostLive: false,
        canCreatePoll: true,
        canRepost: true,
        canComment: true,
        maxPostLength: 1000,
        canSchedulePost: true,
      }

    case UserRole.SİYASETCI_ILCE:
    case UserRole.SİYASETCI_IL:
    case UserRole.SİYASETCI_GENEL_MERKEZ:
      return {
        canPost: true,
        canPostMedia: true,
        canPostLive: true,
        canCreatePoll: true,
        canRepost: true,
        canComment: true,
        maxPostLength: 2000,
        canSchedulePost: true,
      }

    case UserRole.MILLETVEKILI:
      return {
        canPost: true,
        canPostMedia: true,
        canPostLive: true,
        canCreatePoll: true,
        canRepost: true,
        canComment: true,
        maxPostLength: 5000,
        canSchedulePost: true,
      }

    case UserRole.GAZETECI:
      return {
        canPost: true,
        canPostMedia: true,
        canPostLive: true,
        canCreatePoll: true,
        canRepost: true,
        canComment: true,
        maxPostLength: 3000,
        canSchedulePost: true,
      }

    case UserRole.TESKILAT_IL_BASKANI:
    case UserRole.TESKILAT_ILCE_BASKANI:
    case UserRole.TESKILAT_KADIN_KOLLARI:
    case UserRole.TESKILAT_GENC_KOLLARI:
      return {
        canPost: true,
        canPostMedia: true,
        canPostLive: true,
        canCreatePoll: true,
        canRepost: true,
        canComment: true,
        maxPostLength: 2000,
        canSchedulePost: true,
      }

    case UserRole.PARTI_GENEL_MERKEZ_ADMIN:
    case UserRole.SISTEM_ADMIN:
      return {
        canPost: true,
        canPostMedia: true,
        canPostLive: true,
        canCreatePoll: true,
        canRepost: true,
        canComment: true,
        maxPostLength: 10000,
        canSchedulePost: true,
      }

    default:
      return {
        canPost: false,
        canPostMedia: false,
        canPostLive: false,
        canCreatePoll: false,
        canRepost: false,
        canComment: false,
        maxPostLength: 0,
        canSchedulePost: false,
      }
  }
}

// Post görünürlük kontrolü
export function canUserViewPost(user: User, post: Post): boolean {
  const permissions = getViewPermissions(user.role)

  // Kendi postunu her zaman görebilir
  if (post.authorId === user.id) return true

  // Rakip parti kontrolü
  if (user.party && post.author.party && user.party !== post.author.party) {
    if (!permissions.canViewCompetitorPosts) return false
  }

  // Parti içi post kontrolü
  if (post.author.party && !permissions.canViewPartyPosts) {
    return false
  }

  return true
}

// Rol adını Türkçe'ye çevir
export function getRoleDisplayName(role: UserRole): string {
  const roleNames: Record<UserRole, string> = {
    [UserRole.VATANDAS_DOGRULANMAMIS]: 'Vatandaş (Doğrulanmamış)',
    [UserRole.VATANDAS_DOGRULANMIS]: 'Doğrulanmış Vatandaş',
    [UserRole.PARTI_UYESI]: 'Parti Üyesi',
    [UserRole.SİYASETCI_ILCE]: 'İlçe Siyasetçisi',
    [UserRole.SİYASETCI_IL]: 'İl Siyasetçisi',
    [UserRole.SİYASETCI_GENEL_MERKEZ]: 'Genel Merkez Siyasetçisi',
    [UserRole.MILLETVEKILI]: 'Milletvekili',
    [UserRole.GAZETECI]: 'Gazeteci',
    [UserRole.TESKILAT_IL_BASKANI]: 'İl Başkanı',
    [UserRole.TESKILAT_ILCE_BASKANI]: 'İlçe Başkanı',
    [UserRole.TESKILAT_KADIN_KOLLARI]: 'Kadın Kolları',
    [UserRole.TESKILAT_GENC_KOLLARI]: 'Gençlik Kolları',
    [UserRole.PARTI_GENEL_MERKEZ_ADMIN]: 'Parti Genel Merkez Admin',
    [UserRole.SISTEM_ADMIN]: 'Sistem Yöneticisi',
  }
  return roleNames[role] || 'Bilinmeyen Rol'
}
