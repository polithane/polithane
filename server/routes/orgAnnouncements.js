/**
 * Parti Teşkilat - Duyuru & Anket API
 */

import express from 'express';
import { sql } from '../db.js';
import { authenticateToken } from '../middleware/auth.js';
import { 
  getUserPartyRole, 
  canTargetRoles,
  canAccessOrgModule
} from '../utils/orgHierarchy.js';
import { logOrgActivity, OrgActionTypes } from '../utils/orgActivityLog.js';

const router = express.Router();

router.use(authenticateToken);

// ============================================
// DUYURU ENDPOINTS
// ============================================

/**
 * GET /api/organization/announcements
 * Duyuruları listele
 */
router.get('/announcements', async (req, res) => {
  try {
    if (!canAccessOrgModule(req.user)) {
      return res.status(403).json({ 
        success: false, 
        error: 'Teşkilat modülüne erişim yetkiniz yok.' 
      });
    }

    const userRole = getUserPartyRole(req.user);

    const announcements = await sql`
      SELECT 
        oa.*,
        u.full_name as creator_name,
        u.username as creator_username,
        EXISTS(
          SELECT 1 FROM org_announcement_reads 
          WHERE announcement_id = oa.id AND user_id = ${req.user.id}
        ) as is_read
      FROM org_announcements oa
      LEFT JOIN users u ON oa.created_by = u.id
      WHERE oa.party_id = ${req.user.party_id}
        AND oa.is_active = true
        AND (
          ${userRole}::text = ANY(
            SELECT jsonb_array_elements_text(oa.target_roles)
          )
          OR jsonb_array_length(oa.target_roles) = 0
        )
      ORDER BY oa.created_at DESC
    `;

    res.json({ success: true, announcements });
  } catch (error) {
    console.error('Get announcements error:', error);
    res.status(500).json({ success: false, error: 'Duyurular listelenemedi.' });
  }
});

/**
 * POST /api/organization/announcements
 * Yeni duyuru oluştur
 */
router.post('/announcements', async (req, res) => {
  try {
    const { title, content, targetRoles, targetProvince, targetDistrict, priority } = req.body;

    if (!title || !content) {
      return res.status(400).json({ 
        success: false, 
        error: 'Başlık ve içerik zorunludur.' 
      });
    }

    // Hedef rol kontrolü
    if (targetRoles && targetRoles.length > 0) {
      const permission = canTargetRoles(req.user, targetRoles);
      if (!permission.allowed) {
        return res.status(403).json({ success: false, error: permission.reason });
      }
    }

    const [announcement] = await sql`
      INSERT INTO org_announcements (
        party_id, created_by, title, content,
        target_roles, target_province, target_district, priority
      ) VALUES (
        ${req.user.party_id},
        ${req.user.id},
        ${title},
        ${content},
        ${JSON.stringify(targetRoles || [])},
        ${targetProvince || null},
        ${targetDistrict || null},
        ${priority || 'normal'}
      )
      RETURNING *
    `;

    // Hedef kullanıcılara bildirim gönder
    const targetUsers = await sql`
      SELECT DISTINCT u.id
      FROM users u
      WHERE u.party_id = ${req.user.party_id}
        AND u.is_active = true
        AND u.id != ${req.user.id}
        ${targetProvince ? sql`AND u.province = ${targetProvince}` : sql``}
        ${targetDistrict ? sql`AND u.district = ${targetDistrict}` : sql``}
    `;

    for (const user of targetUsers) {
      await sql`
        INSERT INTO notifications (
          user_id, actor_id, type, title, message, related_id, is_read
        ) VALUES (
          ${user.id},
          ${req.user.id},
          'org_announcement',
          'Yeni Duyuru',
          ${title},
          ${announcement.id},
          false
        )
      `;
    }

    // Log
    await logOrgActivity({
      partyId: req.user.party_id,
      userId: req.user.id,
      actionType: OrgActionTypes.ANNOUNCEMENT_CREATED,
      targetType: 'announcement',
      targetId: announcement.id,
      details: { title, targetRoles },
      ipAddress: req.ip,
      userAgent: req.get('user-agent')
    });

    res.json({ success: true, announcement });
  } catch (error) {
    console.error('Create announcement error:', error);
    res.status(500).json({ success: false, error: 'Duyuru oluşturulamadı.' });
  }
});

/**
 * PUT /api/organization/announcements/:id/read
 * Duyuruyu okundu olarak işaretle
 */
router.put('/announcements/:id/read', async (req, res) => {
  try {
    const { id } = req.params;

    await sql`
      INSERT INTO org_announcement_reads (announcement_id, user_id)
      VALUES (${id}, ${req.user.id})
      ON CONFLICT (announcement_id, user_id) DO NOTHING
    `;

    // Log
    await logOrgActivity({
      partyId: req.user.party_id,
      userId: req.user.id,
      actionType: OrgActionTypes.ANNOUNCEMENT_READ,
      targetType: 'announcement',
      targetId: id,
      details: {},
      ipAddress: req.ip,
      userAgent: req.get('user-agent')
    });

    res.json({ success: true, message: 'Duyuru okundu olarak işaretlendi.' });
  } catch (error) {
    console.error('Mark announcement read error:', error);
    res.status(500).json({ success: false, error: 'İşlem başarısız.' });
  }
});

// ============================================
// ANKET ENDPOINTS
// ============================================

/**
 * GET /api/organization/polls
 * Anketleri listele
 */
router.get('/polls', async (req, res) => {
  try {
    if (!canAccessOrgModule(req.user)) {
      return res.status(403).json({ 
        success: false, 
        error: 'Teşkilat modülüne erişim yetkiniz yok.' 
      });
    }

    const userRole = getUserPartyRole(req.user);

    const polls = await sql`
      SELECT 
        op.*,
        u.full_name as creator_name,
        u.username as creator_username,
        EXISTS(
          SELECT 1 FROM org_poll_votes 
          WHERE poll_id = op.id AND user_id = ${req.user.id}
        ) as has_voted,
        (
          SELECT COUNT(DISTINCT user_id) 
          FROM org_poll_votes 
          WHERE poll_id = op.id
        ) as total_votes
      FROM org_polls op
      LEFT JOIN users u ON op.created_by = u.id
      WHERE op.party_id = ${req.user.party_id}
        AND op.is_active = true
        AND (
          ${userRole}::text = ANY(
            SELECT jsonb_array_elements_text(op.target_roles)
          )
          OR jsonb_array_length(op.target_roles) = 0
        )
        AND (op.ends_at IS NULL OR op.ends_at > CURRENT_TIMESTAMP)
      ORDER BY op.created_at DESC
    `;

    res.json({ success: true, polls });
  } catch (error) {
    console.error('Get polls error:', error);
    res.status(500).json({ success: false, error: 'Anketler listelenemedi.' });
  }
});

/**
 * GET /api/organization/polls/:id/results
 * Anket sonuçlarını getir
 */
router.get('/polls/:id/results', async (req, res) => {
  try {
    const { id } = req.params;

    const [poll] = await sql`
      SELECT * FROM org_polls 
      WHERE id = ${id} AND party_id = ${req.user.party_id}
    `;

    if (!poll) {
      return res.status(404).json({ success: false, error: 'Anket bulunamadı.' });
    }

    // Anket sonuçları
    const votes = await sql`
      SELECT 
        option_index,
        COUNT(*) as vote_count
      FROM org_poll_votes
      WHERE poll_id = ${id}
      GROUP BY option_index
      ORDER BY option_index
    `;

    // Anonim değilse oy verenleri de getir
    let voters = [];
    if (!poll.is_anonymous) {
      voters = await sql`
        SELECT 
          opv.option_index,
          u.full_name,
          u.username,
          u.avatar_url,
          opv.voted_at
        FROM org_poll_votes opv
        LEFT JOIN users u ON opv.user_id = u.id
        WHERE opv.poll_id = ${id}
        ORDER BY opv.voted_at DESC
      `;
    }

    // Seçenekleri parse et
    const options = JSON.parse(poll.options);
    const results = options.map((option, index) => {
      const voteData = votes.find(v => v.option_index === index);
      return {
        index,
        option,
        voteCount: voteData ? parseInt(voteData.vote_count) : 0,
        voters: voters.filter(v => v.option_index === index)
      };
    });

    res.json({ success: true, poll, results });
  } catch (error) {
    console.error('Get poll results error:', error);
    res.status(500).json({ success: false, error: 'Anket sonuçları alınamadı.' });
  }
});

/**
 * POST /api/organization/polls
 * Yeni anket oluştur
 */
router.post('/polls', async (req, res) => {
  try {
    const { 
      title, description, options, targetRoles, 
      targetProvince, targetDistrict, isAnonymous, 
      multipleChoice, endsAt 
    } = req.body;

    if (!title || !options || !Array.isArray(options) || options.length < 2) {
      return res.status(400).json({ 
        success: false, 
        error: 'Başlık ve en az 2 seçenek zorunludur.' 
      });
    }

    // Hedef rol kontrolü
    if (targetRoles && targetRoles.length > 0) {
      const permission = canTargetRoles(req.user, targetRoles);
      if (!permission.allowed) {
        return res.status(403).json({ success: false, error: permission.reason });
      }
    }

    const [poll] = await sql`
      INSERT INTO org_polls (
        party_id, created_by, title, description, options,
        target_roles, target_province, target_district,
        is_anonymous, multiple_choice, ends_at
      ) VALUES (
        ${req.user.party_id},
        ${req.user.id},
        ${title},
        ${description || null},
        ${JSON.stringify(options)},
        ${JSON.stringify(targetRoles || [])},
        ${targetProvince || null},
        ${targetDistrict || null},
        ${isAnonymous || false},
        ${multipleChoice || false},
        ${endsAt || null}
      )
      RETURNING *
    `;

    // Hedef kullanıcılara bildirim gönder
    const targetUsers = await sql`
      SELECT DISTINCT u.id
      FROM users u
      WHERE u.party_id = ${req.user.party_id}
        AND u.is_active = true
        AND u.id != ${req.user.id}
        ${targetProvince ? sql`AND u.province = ${targetProvince}` : sql``}
        ${targetDistrict ? sql`AND u.district = ${targetDistrict}` : sql``}
    `;

    for (const user of targetUsers) {
      await sql`
        INSERT INTO notifications (
          user_id, actor_id, type, title, message, related_id, is_read
        ) VALUES (
          ${user.id},
          ${req.user.id},
          'org_poll',
          'Yeni Anket',
          ${title},
          ${poll.id},
          false
        )
      `;
    }

    // Log
    await logOrgActivity({
      partyId: req.user.party_id,
      userId: req.user.id,
      actionType: OrgActionTypes.POLL_CREATED,
      targetType: 'poll',
      targetId: poll.id,
      details: { title, optionsCount: options.length },
      ipAddress: req.ip,
      userAgent: req.get('user-agent')
    });

    res.json({ success: true, poll });
  } catch (error) {
    console.error('Create poll error:', error);
    res.status(500).json({ success: false, error: 'Anket oluşturulamadı.' });
  }
});

/**
 * POST /api/organization/polls/:id/vote
 * Ankete oy ver
 */
router.post('/polls/:id/vote', async (req, res) => {
  try {
    const { id } = req.params;
    const { optionIndex } = req.body;

    if (optionIndex === undefined || optionIndex === null) {
      return res.status(400).json({ 
        success: false, 
        error: 'Seçenek belirtilmelidir.' 
      });
    }

    const [poll] = await sql`
      SELECT * FROM org_polls 
      WHERE id = ${id} AND party_id = ${req.user.party_id}
    `;

    if (!poll) {
      return res.status(404).json({ success: false, error: 'Anket bulunamadı.' });
    }

    // Anket süresi dolmuş mu?
    if (poll.ends_at && new Date(poll.ends_at) < new Date()) {
      return res.status(400).json({ 
        success: false, 
        error: 'Anket süresi dolmuş.' 
      });
    }

    // Daha önce oy verilmiş mi? (multiple_choice değilse)
    if (!poll.multiple_choice) {
      const [existingVote] = await sql`
        SELECT 1 FROM org_poll_votes 
        WHERE poll_id = ${id} AND user_id = ${req.user.id}
      `;

      if (existingVote) {
        return res.status(400).json({ 
          success: false, 
          error: 'Bu ankete zaten oy verdiniz.' 
        });
      }
    }

    // Oyu kaydet
    await sql`
      INSERT INTO org_poll_votes (poll_id, user_id, option_index)
      VALUES (${id}, ${req.user.id}, ${optionIndex})
      ON CONFLICT (poll_id, user_id, option_index) DO NOTHING
    `;

    // Log
    await logOrgActivity({
      partyId: req.user.party_id,
      userId: req.user.id,
      actionType: OrgActionTypes.POLL_VOTED,
      targetType: 'poll',
      targetId: id,
      details: { optionIndex },
      ipAddress: req.ip,
      userAgent: req.get('user-agent')
    });

    res.json({ success: true, message: 'Oyunuz kaydedildi.' });
  } catch (error) {
    console.error('Vote poll error:', error);
    res.status(500).json({ success: false, error: 'Oy kaydedilemedi.' });
  }
});

export default router;
