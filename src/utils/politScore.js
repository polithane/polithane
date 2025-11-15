// Polit Puan hesaplama algoritması

// Görüntülenme puanları
const viewScores = {
  visitor_view: 1,
  unverified_member_view: 2,
  verified_member_view: 3,
  same_party_member_view: 3,
  rival_party_member_to_politician: 6,
  rival_party_member_to_mp: 6,
  rival_mp_to_politician: 10,
  politician_to_citizen: 50,
  mp_to_citizen: 150,
  media_to_citizen: 50,
  mp_to_media: 10,
  politician_to_media: 5
};

// Beğeni puanları
const likeScores = {
  unverified_member_like: 3,
  verified_member_like: 6,
  same_party_like: 4,
  rival_party_like: 15,
  mp_to_citizen_like: 20,
  mp_to_same_politician_like: 15,
  mp_to_mp_like: 5,
  mp_to_rival_politician_like: 40,
  mp_to_rival_mp_like: 30
};

// Yorum puanları
const commentScores = {
  unverified_member_comment: 6,
  verified_member_comment: 24,
  same_party_comment: 8,
  rival_party_comment: 30,
  mp_to_citizen_comment: 50,
  mp_to_same_politician_comment: 30,
  mp_to_mp_comment: 10,
  mp_to_rival_politician_comment: 80,
  mp_to_rival_mp_comment: 60
};

// Geçmiş paylaşım bonus sistemi
const previousPostsBonus = {
  last_post: 0.25,
  second_last: 0.20,
  third_last: 0.15,
  fourth_last: 0.10,
  fifth_last: 0.05
};

// Kullanıcı tipini belirleme helper
const getUserType = (user) => {
  if (!user) return 'visitor';
  if (user.user_type === 'politician' && user.politician_type === 'mp') return 'mp';
  if (user.user_type === 'politician') return 'politician';
  if (user.user_type === 'media') return 'media';
  if (user.user_type === 'party_member') return 'party_member';
  if (user.verification_badge) return 'verified_member';
  return 'unverified_member';
};

// Aynı parti kontrolü
const isSameParty = (user1, user2) => {
  if (!user1 || !user2) return false;
  return user1.party_id && user2.party_id && user1.party_id === user2.party_id;
};

// Rakip parti kontrolü
const isRivalParty = (user1, user2) => {
  if (!user1 || !user2) return false;
  return user1.party_id && user2.party_id && user1.party_id !== user2.party_id;
};

// Görüntülenme puanı hesaplama
const calculateViewScore = (viewer, postOwner) => {
  const viewerType = getUserType(viewer);
  const ownerType = getUserType(postOwner);
  
  if (viewerType === 'visitor') return viewScores.visitor_view;
  if (viewerType === 'unverified_member') return viewScores.unverified_member_view;
  if (viewerType === 'verified_member') return viewScores.verified_member_view;
  
  if (viewerType === 'party_member' && isSameParty(viewer, postOwner)) {
    return viewScores.same_party_member_view;
  }
  
  if (viewerType === 'party_member' && ownerType === 'politician' && isRivalParty(viewer, postOwner)) {
    return viewScores.rival_party_member_to_politician;
  }
  
  if (viewerType === 'party_member' && ownerType === 'mp' && isRivalParty(viewer, postOwner)) {
    return viewScores.rival_party_member_to_mp;
  }
  
  if (viewerType === 'mp' && ownerType === 'politician' && isRivalParty(viewer, postOwner)) {
    return viewScores.rival_mp_to_politician;
  }
  
  if (viewerType === 'politician' && ownerType === 'verified_member') return viewScores.politician_to_citizen;
  if (viewerType === 'mp' && ownerType === 'verified_member') return viewScores.mp_to_citizen;
  if (viewerType === 'media' && ownerType === 'verified_member') return viewScores.media_to_citizen;
  if (viewerType === 'mp' && ownerType === 'media') return viewScores.mp_to_media;
  if (viewerType === 'politician' && ownerType === 'media') return viewScores.politician_to_media;
  
  return viewScores.verified_member_view;
};

// Beğeni puanı hesaplama
const calculateLikeScore = (liker, postOwner) => {
  const likerType = getUserType(liker);
  const ownerType = getUserType(postOwner);
  
  if (likerType === 'unverified_member') return likeScores.unverified_member_like;
  if (likerType === 'verified_member') return likeScores.verified_member_like;
  
  if (isSameParty(liker, postOwner)) return likeScores.same_party_like;
  if (isRivalParty(liker, postOwner) && likerType === 'party_member') return likeScores.rival_party_like;
  
  if (likerType === 'mp' && ownerType === 'verified_member') return likeScores.mp_to_citizen_like;
  if (likerType === 'mp' && ownerType === 'politician' && isSameParty(liker, postOwner)) {
    return likeScores.mp_to_same_politician_like;
  }
  if (likerType === 'mp' && ownerType === 'mp') return likeScores.mp_to_mp_like;
  if (likerType === 'mp' && ownerType === 'politician' && isRivalParty(liker, postOwner)) {
    return likeScores.mp_to_rival_politician_like;
  }
  if (likerType === 'mp' && ownerType === 'mp' && isRivalParty(liker, postOwner)) {
    return likeScores.mp_to_rival_mp_like;
  }
  
  return likeScores.verified_member_like;
};

// Yorum puanı hesaplama
const calculateCommentScore = (commenter, postOwner) => {
  const commenterType = getUserType(commenter);
  const ownerType = getUserType(postOwner);
  
  if (commenterType === 'unverified_member') return commentScores.unverified_member_comment;
  if (commenterType === 'verified_member') return commentScores.verified_member_comment;
  
  if (isSameParty(commenter, postOwner)) return commentScores.same_party_comment;
  if (isRivalParty(commenter, postOwner) && commenterType === 'party_member') {
    return commentScores.rival_party_comment;
  }
  
  if (commenterType === 'mp' && ownerType === 'verified_member') return commentScores.mp_to_citizen_comment;
  if (commenterType === 'mp' && ownerType === 'politician' && isSameParty(commenter, postOwner)) {
    return commentScores.mp_to_same_politician_comment;
  }
  if (commenterType === 'mp' && ownerType === 'mp') return commentScores.mp_to_mp_comment;
  if (commenterType === 'mp' && ownerType === 'politician' && isRivalParty(commenter, postOwner)) {
    return commentScores.mp_to_rival_politician_comment;
  }
  if (commenterType === 'mp' && ownerType === 'mp' && isRivalParty(commenter, postOwner)) {
    return commentScores.mp_to_rival_mp_comment;
  }
  
  return commentScores.verified_member_comment;
};

// Geçmiş paylaşım bonusu hesaplama (mock - gerçekte postOwner'ın son 5 postuna bakılır)
const calculatePreviousPostsBonus = (postOwner, baseScore) => {
  // Mock: Rastgele bir bonus döndür (gerçekte son 5 post kontrol edilir)
  const bonusMultiplier = Math.random() * 0.25; // 0-25% arası
  return Math.floor(baseScore * bonusMultiplier);
};

// Ana Polit Puan hesaplama fonksiyonu
export const calculatePolitScore = (post, interaction) => {
  const { user, targetUser, actionType, targetPost } = interaction;
  
  let baseScore = 0;
  const calculationSteps = [];
  
  // 1. Aksiyon türüne göre temel puan
  if (actionType === 'view') {
    baseScore = calculateViewScore(user, targetUser);
    calculationSteps.push({
      step: 'Görüntülenme',
      score: baseScore,
      description: `${getUserType(user)} → ${getUserType(targetUser)}`
    });
  } else if (actionType === 'like') {
    baseScore = calculateLikeScore(user, targetUser);
    calculationSteps.push({
      step: 'Beğeni',
      score: baseScore,
      description: `${getUserType(user)} → ${getUserType(targetUser)}`
    });
  } else if (actionType === 'comment') {
    baseScore = calculateCommentScore(user, targetUser);
    calculationSteps.push({
      step: 'Yorum',
      score: baseScore,
      description: `${getUserType(user)} → ${getUserType(targetUser)}`
    });
  }
  
  // 2. Geçmiş paylaşımlardan bonus
  const previousBonus = calculatePreviousPostsBonus(targetUser, baseScore);
  if (previousBonus > 0) {
    calculationSteps.push({
      step: 'Geçmiş Paylaşım Bonusu',
      score: previousBonus,
      description: 'Son paylaşımlardan gelen bonus'
    });
  }
  
  // 3. Toplam puan
  const totalScore = baseScore + previousBonus;
  calculationSteps.push({
    step: 'TOPLAM',
    score: totalScore,
    description: 'Polit Puan'
  });
  
  return {
    score: totalScore,
    breakdown: calculationSteps,
    timestamp: new Date()
  };
};

// Basit puan hesaplama (hızlı kullanım için)
export const getSimpleScore = (actionType, viewerType, ownerType) => {
  if (actionType === 'view') {
    return calculateViewScore({ user_type: viewerType }, { user_type: ownerType });
  }
  if (actionType === 'like') {
    return calculateLikeScore({ user_type: viewerType }, { user_type: ownerType });
  }
  if (actionType === 'comment') {
    return calculateCommentScore({ user_type: viewerType }, { user_type: ownerType });
  }
  return 0;
};
