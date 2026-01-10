/**
 * Teşkilat Activity Log Utility
 * Tüm teşkilat işlemlerini loglar
 */

import { sql } from '../db.js';

/**
 * Activity log ekle
 * @param {Object} params
 * @param {Number} params.partyId
 * @param {Number} params.userId
 * @param {String} params.actionType
 * @param {String} params.targetType
 * @param {Number} params.targetId
 * @param {Object} params.details
 * @param {String} params.ipAddress
 * @param {String} params.userAgent
 */
export async function logOrgActivity({
  partyId,
  userId,
  actionType,
  targetType = null,
  targetId = null,
  details = {},
  ipAddress = null,
  userAgent = null
}) {
  try {
    await sql`
      INSERT INTO org_activity_log (
        party_id,
        user_id,
        action_type,
        target_type,
        target_id,
        details,
        ip_address,
        user_agent
      ) VALUES (
        ${partyId},
        ${userId},
        ${actionType},
        ${targetType},
        ${targetId},
        ${JSON.stringify(details)},
        ${ipAddress},
        ${userAgent}
      )
    `;
  } catch (error) {
    console.error('Org activity log error:', error);
    // Log hatası işlemi engellemez
  }
}

/**
 * Activity log'ları getir
 */
export async function getOrgActivityLogs({
  partyId,
  userId = null,
  actionType = null,
  limit = 100,
  offset = 0
}) {
  let query = sql`
    SELECT 
      oal.*,
      u.full_name as user_name,
      u.username as user_username
    FROM org_activity_log oal
    LEFT JOIN users u ON oal.user_id = u.id
    WHERE oal.party_id = ${partyId}
  `;
  
  if (userId) {
    query = sql`${query} AND oal.user_id = ${userId}`;
  }
  
  if (actionType) {
    query = sql`${query} AND oal.action_type = ${actionType}`;
  }
  
  query = sql`
    ${query}
    ORDER BY oal.created_at DESC
    LIMIT ${limit}
    OFFSET ${offset}
  `;
  
  return await query;
}

// Action type constants
export const OrgActionTypes = {
  // Mesajlaşma
  MESSAGE_SENT: 'message_sent',
  MESSAGE_READ: 'message_read',
  
  // Etkinlik
  EVENT_CREATED: 'event_created',
  EVENT_UPDATED: 'event_updated',
  EVENT_DELETED: 'event_deleted',
  
  // Görev
  TASK_ASSIGNED: 'task_assigned',
  TASK_ACCEPTED: 'task_accepted',
  TASK_EXCUSED: 'task_excused',
  TASK_REJECTED: 'task_rejected',
  TASK_COMPLETED: 'task_completed',
  
  // Mazeret
  EXCUSE_SUBMITTED: 'excuse_submitted',
  EXCUSE_ACCEPTED: 'excuse_accepted',
  EXCUSE_REJECTED: 'excuse_rejected',
  
  // Duyuru
  ANNOUNCEMENT_CREATED: 'announcement_created',
  ANNOUNCEMENT_READ: 'announcement_read',
  
  // Anket
  POLL_CREATED: 'poll_created',
  POLL_VOTED: 'poll_voted'
};

export default {
  logOrgActivity,
  getOrgActivityLogs,
  OrgActionTypes
};
