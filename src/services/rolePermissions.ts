import { UserRole } from '../types';

/**
 * Rol bazlı yetki ve görünürlük yönetimi
 */

export interface RolePermissions {
  // Görünürlük
  canViewAllParties: boolean;
  canViewRivalParties: boolean;
  rivalPartyVisibilityPercentage: number; // 0-100
  
  // Paylaşım
  canPost: boolean;
  dailyPostLimit: number;
  canPostLive: boolean;
  canPostAllFormats: boolean;
  
  // Etkileşim
  canLike: boolean;
  canComment: boolean;
  canShare: boolean;
  dailyInteractionLimit: number;
  
  // Analitik
  canViewAnalytics: boolean;
  analyticsDepth: 'none' | 'basic' | 'advanced' | 'full';
  
  // PolitPuan
  politPuanMultiplier: number;
  
  // Özel Modüller
  modules: string[];
}

const ROLE_PERMISSIONS: Record<UserRole, RolePermissions> = {
  [UserRole.CITIZEN]: {
    canViewAllParties: true,
    canViewRivalParties: true,
    rivalPartyVisibilityPercentage: 100,
    canPost: true,
    dailyPostLimit: 5,
    canPostLive: false,
    canPostAllFormats: false,
    canLike: true,
    canComment: true,
    canShare: true,
    dailyInteractionLimit: 20,
    canViewAnalytics: false,
    analyticsDepth: 'none',
    politPuanMultiplier: 0.5,
    modules: []
  },

  [UserRole.VERIFIED_CITIZEN]: {
    canViewAllParties: true,
    canViewRivalParties: true,
    rivalPartyVisibilityPercentage: 100,
    canPost: true,
    dailyPostLimit: 15,
    canPostLive: false,
    canPostAllFormats: true,
    canLike: true,
    canComment: true,
    canShare: true,
    dailyInteractionLimit: Infinity,
    canViewAnalytics: true,
    analyticsDepth: 'basic',
    politPuanMultiplier: 1.0,
    modules: ['complaint_center', 'neighborhood_representative', 'gamification']
  },

  [UserRole.PARTY_MEMBER]: {
    canViewAllParties: true,
    canViewRivalParties: true,
    rivalPartyVisibilityPercentage: 70,
    canPost: true,
    dailyPostLimit: 25,
    canPostLive: false,
    canPostAllFormats: true,
    canLike: true,
    canComment: true,
    canShare: true,
    dailyInteractionLimit: Infinity,
    canViewAnalytics: true,
    analyticsDepth: 'advanced',
    politPuanMultiplier: 1.2,
    modules: ['party_feed', 'task_management', 'organization_connections']
  },

  [UserRole.POLITICIAN_DISTRICT]: {
    canViewAllParties: true,
    canViewRivalParties: true,
    rivalPartyVisibilityPercentage: 100,
    canPost: true,
    dailyPostLimit: 50,
    canPostLive: true,
    canPostAllFormats: true,
    canLike: true,
    canComment: true,
    canShare: true,
    dailyInteractionLimit: Infinity,
    canViewAnalytics: true,
    analyticsDepth: 'advanced',
    politPuanMultiplier: 1.5,
    modules: ['speech_suggestions', 'crisis_communication', 'visit_calendar']
  },

  [UserRole.POLITICIAN_CITY]: {
    canViewAllParties: true,
    canViewRivalParties: true,
    rivalPartyVisibilityPercentage: 100,
    canPost: true,
    dailyPostLimit: 50,
    canPostLive: true,
    canPostAllFormats: true,
    canLike: true,
    canComment: true,
    canShare: true,
    dailyInteractionLimit: Infinity,
    canViewAnalytics: true,
    analyticsDepth: 'advanced',
    politPuanMultiplier: 2.0,
    modules: ['speech_suggestions', 'crisis_communication', 'visit_calendar']
  },

  [UserRole.POLITICIAN_NATIONAL]: {
    canViewAllParties: true,
    canViewRivalParties: true,
    rivalPartyVisibilityPercentage: 100,
    canPost: true,
    dailyPostLimit: 50,
    canPostLive: true,
    canPostAllFormats: true,
    canLike: true,
    canComment: true,
    canShare: true,
    dailyInteractionLimit: Infinity,
    canViewAnalytics: true,
    analyticsDepth: 'full',
    politPuanMultiplier: 2.5,
    modules: ['speech_suggestions', 'crisis_communication', 'visit_calendar']
  },

  [UserRole.MP]: {
    canViewAllParties: true,
    canViewRivalParties: true,
    rivalPartyVisibilityPercentage: 100,
    canPost: true,
    dailyPostLimit: Infinity,
    canPostLive: true,
    canPostAllFormats: true,
    canLike: true,
    canComment: true,
    canShare: true,
    dailyInteractionLimit: Infinity,
    canViewAnalytics: true,
    analyticsDepth: 'full',
    politPuanMultiplier: 3.0,
    modules: [
      'motion_history',
      'press_releases',
      'stk_tracking',
      'visit_calendar',
      'media_news',
      'election_district_analysis'
    ]
  },

  [UserRole.JOURNALIST]: {
    canViewAllParties: true,
    canViewRivalParties: true,
    rivalPartyVisibilityPercentage: 100,
    canPost: true,
    dailyPostLimit: Infinity,
    canPostLive: true,
    canPostAllFormats: true,
    canLike: true,
    canComment: true,
    canShare: true,
    dailyInteractionLimit: Infinity,
    canViewAnalytics: true,
    analyticsDepth: 'advanced',
    politPuanMultiplier: 1.8,
    modules: ['fact_check', 'media_center']
  },

  [UserRole.DISTRICT_CHAIRMAN]: {
    canViewAllParties: true,
    canViewRivalParties: true,
    rivalPartyVisibilityPercentage: 100,
    canPost: true,
    dailyPostLimit: Infinity,
    canPostLive: true,
    canPostAllFormats: true,
    canLike: true,
    canComment: true,
    canShare: true,
    dailyInteractionLimit: Infinity,
    canViewAnalytics: true,
    analyticsDepth: 'full',
    politPuanMultiplier: 2.0,
    modules: ['organization_management', 'member_management', 'region_analytics']
  },

  [UserRole.CITY_CHAIRMAN]: {
    canViewAllParties: true,
    canViewRivalParties: true,
    rivalPartyVisibilityPercentage: 100,
    canPost: true,
    dailyPostLimit: Infinity,
    canPostLive: true,
    canPostAllFormats: true,
    canLike: true,
    canComment: true,
    canShare: true,
    dailyInteractionLimit: Infinity,
    canViewAnalytics: true,
    analyticsDepth: 'full',
    politPuanMultiplier: 2.5,
    modules: ['organization_management', 'member_management', 'region_analytics']
  },

  [UserRole.WOMEN_BRANCH]: {
    canViewAllParties: true,
    canViewRivalParties: true,
    rivalPartyVisibilityPercentage: 100,
    canPost: true,
    dailyPostLimit: Infinity,
    canPostLive: true,
    canPostAllFormats: true,
    canLike: true,
    canComment: true,
    canShare: true,
    dailyInteractionLimit: Infinity,
    canViewAnalytics: true,
    analyticsDepth: 'advanced',
    politPuanMultiplier: 1.8,
    modules: ['branch_management', 'branch_events']
  },

  [UserRole.YOUTH_BRANCH]: {
    canViewAllParties: true,
    canViewRivalParties: true,
    rivalPartyVisibilityPercentage: 100,
    canPost: true,
    dailyPostLimit: Infinity,
    canPostLive: true,
    canPostAllFormats: true,
    canLike: true,
    canComment: true,
    canShare: true,
    dailyInteractionLimit: Infinity,
    canViewAnalytics: true,
    analyticsDepth: 'advanced',
    politPuanMultiplier: 1.8,
    modules: ['branch_management', 'branch_events']
  },

  [UserRole.PARTY_ADMIN]: {
    canViewAllParties: true,
    canViewRivalParties: true,
    rivalPartyVisibilityPercentage: 100,
    canPost: true,
    dailyPostLimit: Infinity,
    canPostLive: true,
    canPostAllFormats: true,
    canLike: true,
    canComment: true,
    canShare: true,
    dailyInteractionLimit: Infinity,
    canViewAnalytics: true,
    analyticsDepth: 'full',
    politPuanMultiplier: 3.5,
    modules: [
      'party_management',
      'all_organization_management',
      'party_secret_voting'
    ]
  },

  [UserRole.SYSTEM_ADMIN]: {
    canViewAllParties: true,
    canViewRivalParties: true,
    rivalPartyVisibilityPercentage: 100,
    canPost: true,
    dailyPostLimit: Infinity,
    canPostLive: true,
    canPostAllFormats: true,
    canLike: true,
    canComment: true,
    canShare: true,
    dailyInteractionLimit: Infinity,
    canViewAnalytics: true,
    analyticsDepth: 'full',
    politPuanMultiplier: 0, // Sistem dışı
    modules: ['system_management', 'platform_management', 'security']
  }
};

export class RolePermissionService {
  /**
   * Rol için yetkileri getir
   */
  static getPermissions(role: UserRole): RolePermissions {
    return ROLE_PERMISSIONS[role];
  }

  /**
   * Kullanıcı belirli bir modüle erişebilir mi?
   */
  static canAccessModule(role: UserRole, module: string): boolean {
    const permissions = ROLE_PERMISSIONS[role];
    return permissions.modules.includes(module);
  }

  /**
   * Kullanıcı belirli bir içeriği görebilir mi?
   */
  static canViewContent(
    userRole: UserRole,
    contentPartyId: string | undefined,
    userPartyId: string | undefined
  ): boolean {
    const permissions = ROLE_PERMISSIONS[userRole];

    // İçerik partiye ait değilse herkes görebilir
    if (!contentPartyId) return true;

    // Kendi partisi ise görebilir
    if (contentPartyId === userPartyId) return true;

    // Rakip parti görünürlüğü kontrolü
    if (!permissions.canViewRivalParties) return false;

    // Görünürlük yüzdesi kontrolü (basitleştirilmiş)
    // Gerçek implementasyonda daha karmaşık olacak
    return Math.random() * 100 < permissions.rivalPartyVisibilityPercentage;
  }

  /**
   * Günlük post limiti kontrolü
   */
  static canPost(userRole: UserRole, todayPostCount: number): boolean {
    const permissions = ROLE_PERMISSIONS[userRole];
    if (!permissions.canPost) return false;
    if (permissions.dailyPostLimit === Infinity) return true;
    return todayPostCount < permissions.dailyPostLimit;
  }

  /**
   * Günlük etkileşim limiti kontrolü
   */
  static canInteract(
    userRole: UserRole,
    todayInteractionCount: number
  ): boolean {
    const permissions = ROLE_PERMISSIONS[userRole];
    if (permissions.dailyInteractionLimit === Infinity) return true;
    return todayInteractionCount < permissions.dailyInteractionLimit;
  }
}
