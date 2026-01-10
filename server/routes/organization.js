/**
 * Parti Teşkilat Yönetim API
 * Tüm teşkilat işlemleri burada
 */

import express from 'express';
import { sql } from '../db.js';
import { authenticateToken } from '../middleware/auth.js';
import { 
  getUserPartyRole, 
  canSendMessage, 
  canCreateEvent, 
  canAssignTask,
  canTargetRoles,
  canAccessOrgModule,
  PartyRole,
  getRoleDisplayName,
  getSubordinateRoles
} from '../utils/orgHierarchy.js';
import { logOrgActivity, OrgActionTypes } from '../utils/orgActivityLog.js';

const router = express.Router();

// Tüm route'lar authenticate edilmiş olmalı
router.use(authenticateToken);

// ============================================
// MESAJLAŞMA ENDPOINTS
// ============================================

/**
 * GET /api/organization/messages/threads
 * Kullanıcının mesaj thread'lerini listele
 */
router.get('/messages/threads', async (req, res) => {
  try {
    const userId = req.user.id;
    
    if (!canAccessOrgModule(req.user)) {
      return res.status(403).json({ 
        success: false, 
        error: 'Teşkilat modülüne erişim yetkiniz yok.' 
      });
    }

    // Thread'leri grupla ve son mesajı getir
    const threads = await sql`
      WITH latest_messages AS (
        SELECT DISTINCT ON (thread_id)
          thread_id,
          id,
          sender_id,
          receiver_id,
          subject,
          message,
          is_read,
          created_at,
          party_id
        FROM org_messages
        WHERE 
          (sender_id = ${userId} OR receiver_id = ${userId})
          AND party_id = ${req.user.party_id}
        ORDER BY thread_id, created_at DESC
      )
      SELECT 
        lm.*,
        u1.full_name as sender_name,
        u1.username as sender_username,
        u1.avatar_url as sender_avatar,
        u2.full_name as receiver_name,
        u2.username as receiver_username,
        u2.avatar_url as receiver_avatar,
        (SELECT COUNT(*) FROM org_messages 
         WHERE thread_id = lm.thread_id AND receiver_id = ${userId} AND is_read = false) as unread_count
      FROM latest_messages lm
      LEFT JOIN users u1 ON lm.sender_id = u1.id
      LEFT JOIN users u2 ON lm.receiver_id = u2.id
      ORDER BY lm.created_at DESC
    `;

    res.json({ success: true, threads });
  } catch (error) {
    console.error('Get threads error:', error);
    res.status(500).json({ success: false, error: 'Thread listesi alınamadı.' });
  }
});

/**
 * GET /api/organization/messages/:threadId
 * Bir thread'in tüm mesajlarını getir
 */
router.get('/messages/:threadId', async (req, res) => {
  try {
    const { threadId } = req.params;
    const userId = req.user.id;

    const messages = await sql`
      SELECT 
        om.*,
        u.full_name,
        u.username,
        u.avatar_url,
        u.politician_type
      FROM org_messages om
      LEFT JOIN users u ON om.sender_id = u.id
      WHERE om.thread_id = ${threadId}
        AND (om.sender_id = ${userId} OR om.receiver_id = ${userId})
        AND om.party_id = ${req.user.party_id}
      ORDER BY om.created_at ASC
    `;

    // Okunmamış mesajları oku olarak işaretle
    await sql`
      UPDATE org_messages 
      SET is_read = true, read_at = CURRENT_TIMESTAMP
      WHERE thread_id = ${threadId} 
        AND receiver_id = ${userId} 
        AND is_read = false
    `;

    res.json({ success: true, messages });
  } catch (error) {
    console.error('Get messages error:', error);
    res.status(500).json({ success: false, error: 'Mesajlar alınamadı.' });
  }
});

/**
 * POST /api/organization/messages/send
 * Yeni mesaj gönder veya thread'e cevap ver
 */
router.post('/messages/send', async (req, res) => {
  try {
    const { receiverId, subject, message, threadId, isReply } = req.body;
    const senderId = req.user.id;

    if (!message || !message.trim()) {
      return res.status(400).json({ success: false, error: 'Mesaj boş olamaz.' });
    }

    // Alıcı bilgilerini al
    const [receiver] = await sql`
      SELECT id, party_id, user_type, politician_type 
      FROM users 
      WHERE id = ${receiverId}
    `;

    if (!receiver) {
      return res.status(404).json({ success: false, error: 'Alıcı bulunamadı.' });
    }

    // Takip kontrolü
    const [follow] = await sql`
      SELECT 1 FROM follows 
      WHERE follower_id = ${receiverId} AND followed_id = ${senderId}
    `;
    const isFollowing = !!follow;

    // Yetki kontrolü
    const permission = canSendMessage(req.user, receiver, isFollowing, isReply);
    if (!permission.allowed) {
      return res.status(403).json({ success: false, error: permission.reason });
    }

    // Thread ID oluştur veya kullan
    const finalThreadId = threadId || `thread_${senderId}_${receiverId}_${Date.now()}`;

    // Mesajı kaydet
    const [newMessage] = await sql`
      INSERT INTO org_messages (
        thread_id, sender_id, receiver_id, party_id, 
        type, subject, message, metadata
      ) VALUES (
        ${finalThreadId},
        ${senderId},
        ${receiverId},
        ${req.user.party_id},
        'direct',
        ${subject || null},
        ${message},
        ${JSON.stringify({ isReply: isReply || false })}
      )
      RETURNING *
    `;

    // Bildirim gönder
    await sql`
      INSERT INTO notifications (
        user_id, actor_id, type, title, message, related_id, is_read
      ) VALUES (
        ${receiverId},
        ${senderId},
        'org_message',
        'Yeni Teşkilat Mesajı',
        ${`${req.user.full_name}: ${message.substring(0, 100)}...`},
        ${newMessage.id},
        false
      )
    `;

    // Log
    await logOrgActivity({
      partyId: req.user.party_id,
      userId: senderId,
      actionType: OrgActionTypes.MESSAGE_SENT,
      targetType: 'user',
      targetId: receiverId,
      details: { threadId: finalThreadId, subject },
      ipAddress: req.ip,
      userAgent: req.get('user-agent')
    });

    res.json({ success: true, message: newMessage });
  } catch (error) {
    console.error('Send message error:', error);
    res.status(500).json({ success: false, error: 'Mesaj gönderilemedi.' });
  }
});

/**
 * GET /api/organization/contacts
 * Mesaj gönderilebilecek kişileri listele
 */
router.get('/contacts', async (req, res) => {
  try {
    const userId = req.user.id;
    const userRole = getUserPartyRole(req.user);

    // Alt kademeleri al
    const subordinateRoles = getSubordinateRoles(userRole);

    // Mesaj gönderilebilecek kullanıcıları getir
    const contacts = await sql`
      SELECT 
        u.id,
        u.full_name,
        u.username,
        u.avatar_url,
        u.politician_type,
        u.user_type,
        u.province,
        u.district,
        EXISTS(SELECT 1 FROM follows WHERE follower_id = u.id AND followed_id = ${userId}) as is_following_me
      FROM users u
      WHERE u.party_id = ${req.user.party_id}
        AND u.id != ${userId}
        AND u.is_active = true
      ORDER BY u.full_name
    `;

    // Yetki filtresi uygula
    const allowedContacts = contacts.filter(contact => {
      const permission = canSendMessage(
        req.user, 
        contact, 
        contact.is_following_me,
        false
      );
      return permission.allowed;
    });

    res.json({ success: true, contacts: allowedContacts });
  } catch (error) {
    console.error('Get contacts error:', error);
    res.status(500).json({ success: false, error: 'Kişiler listelenemedi.' });
  }
});

// ============================================
// ETKİNLİK ENDPOINTS
// ============================================

/**
 * GET /api/organization/events
 * Etkinlikleri listele
 */
router.get('/events', async (req, res) => {
  try {
    const userId = req.user.id;
    const userRole = getUserPartyRole(req.user);

    const events = await sql`
      SELECT 
        oe.*,
        u.full_name as creator_name,
        u.username as creator_username,
        (
          SELECT COUNT(*) FROM org_tasks 
          WHERE event_id = oe.id
        ) as task_count,
        (
          SELECT COUNT(*) FROM org_tasks 
          WHERE event_id = oe.id AND assigned_user_id = ${userId}
        ) as my_task_count
      FROM org_events oe
      LEFT JOIN users u ON oe.created_by = u.id
      WHERE oe.party_id = ${req.user.party_id}
        AND oe.is_active = true
        AND (
          ${userRole}::text = ANY(
            SELECT jsonb_array_elements_text(oe.allowed_roles)
          )
          OR ${userId}::text = ANY(
            SELECT jsonb_array_elements_text(oe.allowed_users)
          )
        )
      ORDER BY oe.event_date DESC
    `;

    res.json({ success: true, events });
  } catch (error) {
    console.error('Get events error:', error);
    res.status(500).json({ success: false, error: 'Etkinlikler listelenemedi.' });
  }
});

/**
 * GET /api/organization/events/:id
 * Etkinlik detayı
 */
router.get('/events/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const [event] = await sql`
      SELECT 
        oe.*,
        u.full_name as creator_name,
        u.username as creator_username,
        u.avatar_url as creator_avatar
      FROM org_events oe
      LEFT JOIN users u ON oe.created_by = u.id
      WHERE oe.id = ${id} AND oe.party_id = ${req.user.party_id}
    `;

    if (!event) {
      return res.status(404).json({ success: false, error: 'Etkinlik bulunamadı.' });
    }

    // Görevleri getir
    const tasks = await sql`
      SELECT 
        ot.*,
        u1.full_name as assigned_user_name,
        u1.username as assigned_user_username,
        u2.full_name as assigned_by_name,
        (
          SELECT COUNT(*) FROM task_excuses 
          WHERE task_id = ot.id
        ) as excuse_count
      FROM org_tasks ot
      LEFT JOIN users u1 ON ot.assigned_user_id = u1.id
      LEFT JOIN users u2 ON ot.assigned_by = u2.id
      WHERE ot.event_id = ${id}
      ORDER BY ot.created_at DESC
    `;

    res.json({ success: true, event, tasks });
  } catch (error) {
    console.error('Get event detail error:', error);
    res.status(500).json({ success: false, error: 'Etkinlik detayı alınamadı.' });
  }
});

/**
 * POST /api/organization/events
 * Yeni etkinlik oluştur
 */
router.post('/events', async (req, res) => {
  try {
    const { 
      title, description, eventDate, location, address,
      allowedRoles, allowedUsers, province, district 
    } = req.body;

    if (!canCreateEvent(req.user)) {
      return res.status(403).json({ 
        success: false, 
        error: 'Etkinlik oluşturma yetkiniz yok. Sadece yöneticiler etkinlik oluşturabilir.' 
      });
    }

    if (!title || !eventDate) {
      return res.status(400).json({ 
        success: false, 
        error: 'Başlık ve tarih zorunludur.' 
      });
    }

    const [event] = await sql`
      INSERT INTO org_events (
        party_id, title, description, event_date, location, address,
        created_by, allowed_roles, allowed_users, province, district
      ) VALUES (
        ${req.user.party_id},
        ${title},
        ${description || null},
        ${eventDate},
        ${location || null},
        ${address || null},
        ${req.user.id},
        ${JSON.stringify(allowedRoles || [])},
        ${JSON.stringify(allowedUsers || [])},
        ${province || null},
        ${district || null}
      )
      RETURNING *
    `;

    // Log
    await logOrgActivity({
      partyId: req.user.party_id,
      userId: req.user.id,
      actionType: OrgActionTypes.EVENT_CREATED,
      targetType: 'event',
      targetId: event.id,
      details: { title, eventDate },
      ipAddress: req.ip,
      userAgent: req.get('user-agent')
    });

    // Hedef kullanıcılara bildirim gönder
    if (allowedUsers && allowedUsers.length > 0) {
      for (const targetUserId of allowedUsers) {
        await sql`
          INSERT INTO notifications (
            user_id, actor_id, type, title, message, related_id, is_read
          ) VALUES (
            ${targetUserId},
            ${req.user.id},
            'org_event',
            'Yeni Etkinlik',
            ${`${title} - ${new Date(eventDate).toLocaleDateString('tr-TR')}`},
            ${event.id},
            false
          )
        `;
      }
    }

    res.json({ success: true, event });
  } catch (error) {
    console.error('Create event error:', error);
    res.status(500).json({ success: false, error: 'Etkinlik oluşturulamadı.' });
  }
});

/**
 * PUT /api/organization/events/:id
 * Etkinlik güncelle
 */
router.put('/events/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, eventDate, location, address } = req.body;

    // Etkinlik sahibi mi kontrol et
    const [event] = await sql`
      SELECT * FROM org_events 
      WHERE id = ${id} AND party_id = ${req.user.party_id}
    `;

    if (!event) {
      return res.status(404).json({ success: false, error: 'Etkinlik bulunamadı.' });
    }

    if (event.created_by !== req.user.id && !req.user.is_admin) {
      return res.status(403).json({ 
        success: false, 
        error: 'Bu etkinliği güncelleme yetkiniz yok.' 
      });
    }

    const [updated] = await sql`
      UPDATE org_events SET
        title = ${title || event.title},
        description = ${description !== undefined ? description : event.description},
        event_date = ${eventDate || event.event_date},
        location = ${location !== undefined ? location : event.location},
        address = ${address !== undefined ? address : event.address},
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ${id}
      RETURNING *
    `;

    // Log
    await logOrgActivity({
      partyId: req.user.party_id,
      userId: req.user.id,
      actionType: OrgActionTypes.EVENT_UPDATED,
      targetType: 'event',
      targetId: id,
      details: { title: updated.title },
      ipAddress: req.ip,
      userAgent: req.get('user-agent')
    });

    res.json({ success: true, event: updated });
  } catch (error) {
    console.error('Update event error:', error);
    res.status(500).json({ success: false, error: 'Etkinlik güncellenemedi.' });
  }
});

/**
 * DELETE /api/organization/events/:id
 * Etkinlik sil (soft delete)
 */
router.delete('/events/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const [event] = await sql`
      SELECT * FROM org_events 
      WHERE id = ${id} AND party_id = ${req.user.party_id}
    `;

    if (!event) {
      return res.status(404).json({ success: false, error: 'Etkinlik bulunamadı.' });
    }

    if (event.created_by !== req.user.id && !req.user.is_admin) {
      return res.status(403).json({ 
        success: false, 
        error: 'Bu etkinliği silme yetkiniz yok.' 
      });
    }

    await sql`
      UPDATE org_events SET is_active = false
      WHERE id = ${id}
    `;

    // Log
    await logOrgActivity({
      partyId: req.user.party_id,
      userId: req.user.id,
      actionType: OrgActionTypes.EVENT_DELETED,
      targetType: 'event',
      targetId: id,
      details: { title: event.title },
      ipAddress: req.ip,
      userAgent: req.get('user-agent')
    });

    res.json({ success: true, message: 'Etkinlik silindi.' });
  } catch (error) {
    console.error('Delete event error:', error);
    res.status(500).json({ success: false, error: 'Etkinlik silinemedi.' });
  }
});

// ============================================
// GÖREV & MAZERET ENDPOINTS
// ============================================

/**
 * GET /api/organization/tasks/my
 * Kullanıcının görevlerini listele
 */
router.get('/tasks/my', async (req, res) => {
  try {
    const userId = req.user.id;
    const { status } = req.query; // pending, accepted, excused, rejected, completed

    let query = sql`
      SELECT 
        ot.*,
        oe.title as event_title,
        oe.event_date,
        oe.location,
        u.full_name as assigned_by_name,
        u.username as assigned_by_username
      FROM org_tasks ot
      LEFT JOIN org_events oe ON ot.event_id = oe.id
      LEFT JOIN users u ON ot.assigned_by = u.id
      WHERE ot.assigned_user_id = ${userId}
    `;

    if (status) {
      query = sql`${query} AND ot.status = ${status}`;
    }

    query = sql`${query} ORDER BY ot.created_at DESC`;

    const tasks = await query;

    res.json({ success: true, tasks });
  } catch (error) {
    console.error('Get my tasks error:', error);
    res.status(500).json({ success: false, error: 'Görevler listelenemedi.' });
  }
});

/**
 * POST /api/organization/tasks/assign
 * Görev ata
 */
router.post('/tasks/assign', async (req, res) => {
  try {
    const { eventId, assignedUserId, title, description, deadline } = req.body;

    if (!eventId || !assignedUserId || !title) {
      return res.status(400).json({ 
        success: false, 
        error: 'Etkinlik, kullanıcı ve başlık zorunludur.' 
      });
    }

    // Etkinliği kontrol et
    const [event] = await sql`
      SELECT * FROM org_events 
      WHERE id = ${eventId} AND party_id = ${req.user.party_id}
    `;

    if (!event) {
      return res.status(404).json({ success: false, error: 'Etkinlik bulunamadı.' });
    }

    // Görevi alacak kullanıcıyı getir
    const [assignee] = await sql`
      SELECT * FROM users WHERE id = ${assignedUserId}
    `;

    if (!assignee) {
      return res.status(404).json({ success: false, error: 'Kullanıcı bulunamadı.' });
    }

    // Yetki kontrolü
    const permission = canAssignTask(req.user, assignee);
    if (!permission.allowed) {
      return res.status(403).json({ success: false, error: permission.reason });
    }

    const [task] = await sql`
      INSERT INTO org_tasks (
        event_id, assigned_user_id, assigned_by, 
        title, description, deadline, status
      ) VALUES (
        ${eventId},
        ${assignedUserId},
        ${req.user.id},
        ${title},
        ${description || null},
        ${deadline || null},
        'pending'
      )
      RETURNING *
    `;

    // Bildirim gönder
    await sql`
      INSERT INTO notifications (
        user_id, actor_id, type, title, message, related_id, is_read
      ) VALUES (
        ${assignedUserId},
        ${req.user.id},
        'org_task',
        'Yeni Görev Atandı',
        ${`${event.title} - ${title}`},
        ${task.id},
        false
      )
    `;

    // Log
    await logOrgActivity({
      partyId: req.user.party_id,
      userId: req.user.id,
      actionType: OrgActionTypes.TASK_ASSIGNED,
      targetType: 'task',
      targetId: task.id,
      details: { eventId, assignedUserId, title },
      ipAddress: req.ip,
      userAgent: req.get('user-agent')
    });

    res.json({ success: true, task });
  } catch (error) {
    console.error('Assign task error:', error);
    res.status(500).json({ success: false, error: 'Görev atanamadı.' });
  }
});

/**
 * PUT /api/organization/tasks/:id/accept
 * Görevi kabul et
 */
router.put('/tasks/:id/accept', async (req, res) => {
  try {
    const { id } = req.params;

    const [task] = await sql`
      SELECT * FROM org_tasks 
      WHERE id = ${id} AND assigned_user_id = ${req.user.id}
    `;

    if (!task) {
      return res.status(404).json({ success: false, error: 'Görev bulunamadı.' });
    }

    if (task.status !== 'pending') {
      return res.status(400).json({ 
        success: false, 
        error: 'Bu görev zaten işleme alınmış.' 
      });
    }

    const [updated] = await sql`
      UPDATE org_tasks 
      SET status = 'accepted', updated_at = CURRENT_TIMESTAMP
      WHERE id = ${id}
      RETURNING *
    `;

    // Görevi atayan kişiye bildirim gönder
    await sql`
      INSERT INTO notifications (
        user_id, actor_id, type, title, message, related_id, is_read
      ) VALUES (
        ${task.assigned_by},
        ${req.user.id},
        'org_task',
        'Görev Kabul Edildi',
        ${`${req.user.full_name} görevi kabul etti: ${task.title}`},
        ${task.id},
        false
      )
    `;

    // Log
    await logOrgActivity({
      partyId: req.user.party_id,
      userId: req.user.id,
      actionType: OrgActionTypes.TASK_ACCEPTED,
      targetType: 'task',
      targetId: id,
      details: { title: task.title },
      ipAddress: req.ip,
      userAgent: req.get('user-agent')
    });

    res.json({ success: true, task: updated });
  } catch (error) {
    console.error('Accept task error:', error);
    res.status(500).json({ success: false, error: 'Görev kabul edilemedi.' });
  }
});

/**
 * POST /api/organization/tasks/:id/excuse
 * Mazeret bildir
 */
router.post('/tasks/:id/excuse', async (req, res) => {
  try {
    const { id } = req.params;
    const { excuseText } = req.body;

    if (!excuseText || !excuseText.trim()) {
      return res.status(400).json({ 
        success: false, 
        error: 'Mazeret metni zorunludur.' 
      });
    }

    const [task] = await sql`
      SELECT * FROM org_tasks 
      WHERE id = ${id} AND assigned_user_id = ${req.user.id}
    `;

    if (!task) {
      return res.status(404).json({ success: false, error: 'Görev bulunamadı.' });
    }

    // Mazeret kaydı oluştur
    const [excuse] = await sql`
      INSERT INTO task_excuses (
        task_id, user_id, excuse_text, decision
      ) VALUES (
        ${id},
        ${req.user.id},
        ${excuseText},
        'pending'
      )
      RETURNING *
    `;

    // Görev durumunu güncelle
    await sql`
      UPDATE org_tasks 
      SET status = 'excused', updated_at = CURRENT_TIMESTAMP
      WHERE id = ${id}
    `;

    // Görevi atayan kişiye bildirim gönder
    await sql`
      INSERT INTO notifications (
        user_id, actor_id, type, title, message, related_id, is_read
      ) VALUES (
        ${task.assigned_by},
        ${req.user.id},
        'org_excuse',
        'Mazeret Bildirimi',
        ${`${req.user.full_name} mazeret bildirdi: ${task.title}`},
        ${excuse.id},
        false
      )
    `;

    // Log
    await logOrgActivity({
      partyId: req.user.party_id,
      userId: req.user.id,
      actionType: OrgActionTypes.EXCUSE_SUBMITTED,
      targetType: 'task',
      targetId: id,
      details: { excuseText },
      ipAddress: req.ip,
      userAgent: req.get('user-agent')
    });

    res.json({ success: true, excuse });
  } catch (error) {
    console.error('Submit excuse error:', error);
    res.status(500).json({ success: false, error: 'Mazeret bildirilemedi.' });
  }
});

/**
 * GET /api/organization/excuses/pending
 * Bekleyen mazeretleri listele (yönetici için)
 */
router.get('/excuses/pending', async (req, res) => {
  try {
    const excuses = await sql`
      SELECT 
        te.*,
        ot.title as task_title,
        ot.event_id,
        oe.title as event_title,
        u.full_name as user_name,
        u.username as user_username,
        u.avatar_url as user_avatar
      FROM task_excuses te
      LEFT JOIN org_tasks ot ON te.task_id = ot.id
      LEFT JOIN org_events oe ON ot.event_id = oe.id
      LEFT JOIN users u ON te.user_id = u.id
      WHERE te.decision = 'pending'
        AND ot.assigned_by = ${req.user.id}
      ORDER BY te.created_at DESC
    `;

    res.json({ success: true, excuses });
  } catch (error) {
    console.error('Get pending excuses error:', error);
    res.status(500).json({ success: false, error: 'Mazeretler listelenemedi.' });
  }
});

/**
 * PUT /api/organization/excuses/:id/decide
 * Mazeret kararı ver (kabul/red)
 */
router.put('/excuses/:id/decide', async (req, res) => {
  try {
    const { id } = req.params;
    const { decision, decisionNote, newAssigneeId } = req.body;

    if (!['accepted', 'rejected'].includes(decision)) {
      return res.status(400).json({ 
        success: false, 
        error: 'Geçersiz karar. accepted veya rejected olmalıdır.' 
      });
    }

    const [excuse] = await sql`
      SELECT 
        te.*,
        ot.assigned_by,
        ot.event_id,
        ot.title as task_title,
        ot.description as task_description,
        ot.deadline as task_deadline
      FROM task_excuses te
      LEFT JOIN org_tasks ot ON te.task_id = ot.id
      WHERE te.id = ${id}
    `;

    if (!excuse) {
      return res.status(404).json({ success: false, error: 'Mazeret bulunamadı.' });
    }

    if (excuse.assigned_by !== req.user.id) {
      return res.status(403).json({ 
        success: false, 
        error: 'Bu mazeret üzerinde karar verme yetkiniz yok.' 
      });
    }

    // Mazeret kararını güncelle
    await sql`
      UPDATE task_excuses 
      SET 
        decision = ${decision},
        decided_by = ${req.user.id},
        decision_note = ${decisionNote || null},
        decided_at = CURRENT_TIMESTAMP
      WHERE id = ${id}
    `;

    // Eğer kabul edildiyse ve yeni görevli atanacaksa
    if (decision === 'accepted' && newAssigneeId) {
      await sql`
        INSERT INTO org_tasks (
          event_id, assigned_user_id, assigned_by,
          title, description, deadline, status
        ) VALUES (
          ${excuse.event_id},
          ${newAssigneeId},
          ${req.user.id},
          ${excuse.task_title},
          ${excuse.task_description},
          ${excuse.task_deadline},
          'pending'
        )
      `;

      // Yeni görevliye bildirim
      await sql`
        INSERT INTO notifications (
          user_id, actor_id, type, title, message, related_id, is_read
        ) VALUES (
          ${newAssigneeId},
          ${req.user.id},
          'org_task',
          'Yeni Görev Atandı',
          ${`${excuse.task_title}`},
          ${excuse.task_id},
          false
        )
      `;
    }

    // Eğer reddedildiyse görev durumunu geri al
    if (decision === 'rejected') {
      await sql`
        UPDATE org_tasks 
        SET status = 'pending', updated_at = CURRENT_TIMESTAMP
        WHERE id = ${excuse.task_id}
      `;
    }

    // Mazeret bildiren kişiye bildirim gönder
    await sql`
      INSERT INTO notifications (
        user_id, actor_id, type, title, message, related_id, is_read
      ) VALUES (
        ${excuse.user_id},
        ${req.user.id},
        'org_excuse',
        ${decision === 'accepted' ? 'Mazeretiniz Kabul Edildi' : 'Mazeretiniz Reddedildi'},
        ${decisionNote || `Mazeret kararı: ${decision === 'accepted' ? 'Kabul' : 'Red'}`},
        ${excuse.id},
        false
      )
    `;

    // Log
    await logOrgActivity({
      partyId: req.user.party_id,
      userId: req.user.id,
      actionType: decision === 'accepted' ? OrgActionTypes.EXCUSE_ACCEPTED : OrgActionTypes.EXCUSE_REJECTED,
      targetType: 'excuse',
      targetId: id,
      details: { decision, newAssigneeId },
      ipAddress: req.ip,
      userAgent: req.get('user-agent')
    });

    res.json({ success: true, message: 'Karar kaydedildi.' });
  } catch (error) {
    console.error('Decide excuse error:', error);
    res.status(500).json({ success: false, error: 'Karar kaydedilemedi.' });
  }
});

export default router;
