/**
 * Parti Teşkilat Hiyerarşi Kontrol Sistemi
 * 
 * Hiyerarşi Sıralaması (ÜSTTEN ALTA):
 * 1. METROPOLITAN_MAYOR (Büyükşehir Belediye Başkanı)
 * 2. PROVINCIAL_CHAIR (İl Başkanı)
 * 3. DISTRICT_MAYOR (İlçe Belediye Başkanı)
 * 4. DISTRICT_CHAIR (İlçe Başkanı)
 * 5. ORG_STAFF (Teşkilat Görevlisi)
 * 6. PARTY_MEMBER (Parti Üyesi)
 */

export const PartyRole = {
  METROPOLITAN_MAYOR: 'metropolitan_mayor',
  PROVINCIAL_CHAIR: 'provincial_chair',
  DISTRICT_MAYOR: 'district_mayor',
  DISTRICT_CHAIR: 'district_chair',
  ORG_STAFF: 'party_official', // Mevcut sistemdeki karşılığı
  PARTY_MEMBER: 'party_member'
};

// Hiyerarşi seviyesi (sayı ne kadar düşükse o kadar üst)
const HIERARCHY_LEVELS = {
  [PartyRole.METROPOLITAN_MAYOR]: 1,
  [PartyRole.PROVINCIAL_CHAIR]: 2,
  [PartyRole.DISTRICT_MAYOR]: 3,
  [PartyRole.DISTRICT_CHAIR]: 4,
  [PartyRole.ORG_STAFF]: 5,
  [PartyRole.PARTY_MEMBER]: 6
};

/**
 * Kullanıcının parti rolünü al
 */
export function getUserPartyRole(user) {
  if (!user) return null;
  
  // politician_type alanından rol belirle
  const politicianType = user.politician_type || user.role_type;
  
  if (politicianType === 'metropolitan_mayor') return PartyRole.METROPOLITAN_MAYOR;
  if (politicianType === 'provincial_chair') return PartyRole.PROVINCIAL_CHAIR;
  if (politicianType === 'district_mayor') return PartyRole.DISTRICT_MAYOR;
  if (politicianType === 'district_chair') return PartyRole.DISTRICT_CHAIR;
  if (politicianType === 'party_official') return PartyRole.ORG_STAFF;
  
  // user_type'dan kontrol
  if (user.user_type === 'party_member') return PartyRole.PARTY_MEMBER;
  if (user.user_type === 'party_official') return PartyRole.ORG_STAFF;
  
  return PartyRole.PARTY_MEMBER; // Default
}

/**
 * Hiyerarşi seviyesini al
 */
export function getHierarchyLevel(role) {
  return HIERARCHY_LEVELS[role] || 999; // Tanımsız roller en alta
}

/**
 * Üst rol mü kontrol et
 */
export function isHigherRole(role1, role2) {
  const level1 = getHierarchyLevel(role1);
  const level2 = getHierarchyLevel(role2);
  return level1 < level2;
}

/**
 * Aynı seviye mi kontrol et
 */
export function isSameLevel(role1, role2) {
  return getHierarchyLevel(role1) === getHierarchyLevel(role2);
}

/**
 * Bir üst kademe mi kontrol et (direkt üst)
 */
export function isDirectSuperior(superiorRole, subordinateRole) {
  const diff = getHierarchyLevel(subordinateRole) - getHierarchyLevel(superiorRole);
  return diff === 1;
}

/**
 * Alt kademeleri al
 */
export function getSubordinateRoles(role) {
  const level = getHierarchyLevel(role);
  return Object.keys(HIERARCHY_LEVELS).filter(r => getHierarchyLevel(r) > level);
}

/**
 * Üst kademeleri al
 */
export function getSuperiorRoles(role) {
  const level = getHierarchyLevel(role);
  return Object.keys(HIERARCHY_LEVELS).filter(r => getHierarchyLevel(r) < level);
}

/**
 * Direkt üst rolü al (bir üstü)
 */
export function getDirectSuperiorRole(role) {
  const level = getHierarchyLevel(role);
  const superiors = Object.entries(HIERARCHY_LEVELS)
    .filter(([_, lvl]) => lvl === level - 1);
  return superiors.length > 0 ? superiors[0][0] : null;
}

/**
 * Mesaj gönderme yetkisi kontrol et
 * @param {Object} sender - Gönderici kullanıcı
 * @param {Object} receiver - Alıcı kullanıcı
 * @param {Boolean} isFollowing - Alıcı, göndericiden takip ediyor mu?
 * @param {Boolean} isReply - Bu bir yanıt mı (thread içinde)?
 * @returns {Object} { allowed: Boolean, reason: String }
 */
export function canSendMessage(sender, receiver, isFollowing = false, isReply = false) {
  // Aynı parti kontrolü
  if (sender.party_id !== receiver.party_id) {
    return { allowed: false, reason: 'Farklı partiden kullanıcıya mesaj gönderilemez.' };
  }
  
  // Thread içinde yanıt ise serbest
  if (isReply) {
    return { allowed: true, reason: 'Thread içinde yanıt serbesttir.' };
  }
  
  // Takip varsa serbest (takip istisnası)
  if (isFollowing) {
    return { allowed: true, reason: 'Alıcı göndericiden takip ediyor, izin verildi.' };
  }
  
  const senderRole = getUserPartyRole(sender);
  const receiverRole = getUserPartyRole(receiver);
  
  // Üst → Alt: Her zaman izinli
  if (isHigherRole(senderRole, receiverRole)) {
    return { allowed: true, reason: 'Üst kademe alta mesaj gönderebilir.' };
  }
  
  // Alt → Direkt Üst: İzinli
  if (isDirectSuperior(receiverRole, senderRole)) {
    return { allowed: true, reason: 'Ast, direkt üstüne mesaj gönderebilir.' };
  }
  
  // Alt → Daha Üst Kademe: İzinsiz
  if (isHigherRole(receiverRole, senderRole)) {
    return { allowed: false, reason: 'Sadece bir üst kademeye yeni mesaj başlatabilirsiniz.' };
  }
  
  // Aynı seviye: İzinli
  if (isSameLevel(senderRole, receiverRole)) {
    return { allowed: true, reason: 'Aynı seviyedeki kullanıcılar mesajlaşabilir.' };
  }
  
  return { allowed: false, reason: 'Mesaj gönderme yetkisi yok.' };
}

/**
 * Etkinlik oluşturma yetkisi kontrol et
 * @param {Object} user - Kullanıcı
 * @returns {Boolean}
 */
export function canCreateEvent(user) {
  const role = getUserPartyRole(user);
  // Sadece yöneticiler etkinlik oluşturabilir
  const managerRoles = [
    PartyRole.METROPOLITAN_MAYOR,
    PartyRole.PROVINCIAL_CHAIR,
    PartyRole.DISTRICT_MAYOR,
    PartyRole.DISTRICT_CHAIR
  ];
  return managerRoles.includes(role);
}

/**
 * Görev atama yetkisi kontrol et
 * @param {Object} assigner - Görev atayan
 * @param {Object} assignee - Görevi alan
 * @returns {Object}
 */
export function canAssignTask(assigner, assignee) {
  if (assigner.party_id !== assignee.party_id) {
    return { allowed: false, reason: 'Farklı partiden kullanıcıya görev atanamaz.' };
  }
  
  const assignerRole = getUserPartyRole(assigner);
  const assigneeRole = getUserPartyRole(assignee);
  
  // Sadece üst kademe görev atayabilir
  if (isHigherRole(assignerRole, assigneeRole) || isSameLevel(assignerRole, assigneeRole)) {
    return { allowed: true, reason: 'Görev atama yetkisi var.' };
  }
  
  return { allowed: false, reason: 'Sadece üst kademe görev atayabilir.' };
}

/**
 * Duyuru hedefleme kontrolü
 * @param {Object} creator - Duyuru oluşturan
 * @param {Array} targetRoles - Hedef roller
 * @returns {Object}
 */
export function canTargetRoles(creator, targetRoles) {
  const creatorRole = getUserPartyRole(creator);
  const subordinates = getSubordinateRoles(creatorRole);
  
  // Hedef roller, oluşturucunun altındaki roller olmalı
  const invalidTargets = targetRoles.filter(r => !subordinates.includes(r) && r !== creatorRole);
  
  if (invalidTargets.length > 0) {
    return { 
      allowed: false, 
      reason: 'Sadece kendi seviyeniz ve altındaki kademelere duyuru yapabilirsiniz.',
      invalidTargets 
    };
  }
  
  return { allowed: true, reason: 'Hedef roller uygun.' };
}

/**
 * Rol görünen adını al
 */
export function getRoleDisplayName(role) {
  const names = {
    [PartyRole.METROPOLITAN_MAYOR]: 'Büyükşehir Belediye Başkanı',
    [PartyRole.PROVINCIAL_CHAIR]: 'İl Başkanı',
    [PartyRole.DISTRICT_MAYOR]: 'İlçe Belediye Başkanı',
    [PartyRole.DISTRICT_CHAIR]: 'İlçe Başkanı',
    [PartyRole.ORG_STAFF]: 'Teşkilat Görevlisi',
    [PartyRole.PARTY_MEMBER]: 'Parti Üyesi'
  };
  return names[role] || 'Bilinmeyen Rol';
}

/**
 * Kullanıcının teşkilat modülünü kullanma yetkisi var mı?
 */
export function canAccessOrgModule(user) {
  if (!user) return false;
  
  // Parti üyesi veya üstü olmalı
  const allowedUserTypes = ['party_member', 'party_official', 'mp'];
  if (!allowedUserTypes.includes(user.user_type)) return false;
  
  // Parti ID'si olmalı
  if (!user.party_id) return false;
  
  return true;
}

export default {
  PartyRole,
  getUserPartyRole,
  getHierarchyLevel,
  isHigherRole,
  isSameLevel,
  isDirectSuperior,
  getSubordinateRoles,
  getSuperiorRoles,
  getDirectSuperiorRole,
  canSendMessage,
  canCreateEvent,
  canAssignTask,
  canTargetRoles,
  getRoleDisplayName,
  canAccessOrgModule
};
