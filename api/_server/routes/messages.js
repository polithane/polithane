import express from 'express';
import { sql } from '../index.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Get all conversations
router.get('/conversations', authenticateToken, async (req, res) => {
  try {
    const user_id = req.user.id;
    
    const conversations = await sql`
      SELECT DISTINCT ON (
        CASE 
          WHEN m.sender_id = ${user_id} THEN m.receiver_id
          ELSE m.sender_id
        END
      )
        CASE 
          WHEN m.sender_id = ${user_id} THEN m.receiver_id
          ELSE m.sender_id
        END as other_user_id,
        u.username,
        u.full_name,
        u.avatar_url,
        u.is_verified,
        m.content as last_message,
        m.created_at as last_message_time,
        m.is_read
      FROM messages m
      LEFT JOIN users u ON (
        CASE 
          WHEN m.sender_id = ${user_id} THEN m.receiver_id = u.id
          ELSE m.sender_id = u.id
        END
      )
      WHERE m.sender_id = ${user_id} OR m.receiver_id = ${user_id}
      ORDER BY 
        CASE 
          WHEN m.sender_id = ${user_id} THEN m.receiver_id
          ELSE m.sender_id
        END,
        m.created_at DESC
    `;

    res.json({ success: true, data: conversations });
  } catch (error) {
    console.error('Get conversations error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get messages with specific user
router.get('/:userId', authenticateToken, async (req, res) => {
  try {
    const { userId: other_user_id } = req.params;
    const user_id = req.user.id;

    const messages = await sql`
      SELECT 
        m.*,
        sender.username as sender_username,
        sender.full_name as sender_name,
        sender.avatar_url as sender_avatar,
        receiver.username as receiver_username,
        receiver.full_name as receiver_name
      FROM messages m
      LEFT JOIN users sender ON m.sender_id = sender.id
      LEFT JOIN users receiver ON m.receiver_id = receiver.id
      WHERE 
        (m.sender_id = ${user_id} AND m.receiver_id = ${other_user_id})
        OR (m.sender_id = ${other_user_id} AND m.receiver_id = ${user_id})
      ORDER BY m.created_at ASC
    `;

    // Mark as read
    await sql`
      UPDATE messages 
      SET is_read = true 
      WHERE receiver_id = ${user_id} AND sender_id = ${other_user_id}
    `;

    res.json({ success: true, data: messages });
  } catch (error) {
    console.error('Get messages error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Send message
router.post('/send', authenticateToken, async (req, res) => {
  try {
    const { receiver_id, content } = req.body;
    const sender_id = req.user.id;

    if (!receiver_id || !content) {
      return res.status(400).json({ 
        success: false, 
        error: 'Alıcı ve mesaj içeriği zorunludur' 
      });
    }

    const [message] = await sql`
      INSERT INTO messages (sender_id, receiver_id, content)
      VALUES (${sender_id}, ${receiver_id}, ${content})
      RETURNING *
    `;

    // Create notification
    await sql`
      INSERT INTO notifications (user_id, type, content, related_id)
      VALUES (${receiver_id}, 'message', 'Yeni mesajınız var', ${message.id})
    `.catch(console.error);

    res.status(201).json({ success: true, data: message });
  } catch (error) {
    console.error('Send message error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Delete message
router.delete('/:messageId', authenticateToken, async (req, res) => {
  try {
    const { messageId } = req.params;
    const user_id = req.user.id;

    const [message] = await sql`
      SELECT sender_id FROM messages WHERE id = ${messageId}
    `;

    if (!message) {
      return res.status(404).json({ success: false, error: 'Mesaj bulunamadı' });
    }

    if (message.sender_id !== user_id) {
      return res.status(403).json({ success: false, error: 'Bu mesajı silme yetkiniz yok' });
    }

    await sql`DELETE FROM messages WHERE id = ${messageId}`;

    res.json({ success: true, message: 'Mesaj silindi' });
  } catch (error) {
    console.error('Delete message error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
