const pool = require('../config/db');

const sendMessage = async (
  senderId,
  receiverId,
  content,
  attachmentData = null,
  attachmentName = null,
  attachmentType = null,
) => {
  const result = await pool.query(
    `INSERT INTO messages
       (sender_id, receiver_id, content, attachment_data, attachment_name, attachment_type)
     VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
    [senderId, receiverId, content, attachmentData, attachmentName, attachmentType]
  );
  return result.rows[0];
};

const getConversation = async (userId1, userId2) => {
  const result = await pool.query(
    `SELECT messages.*,
     sender.email as sender_email,
     receiver.email as receiver_email
     FROM messages
     JOIN users sender ON messages.sender_id = sender.id
     JOIN users receiver ON messages.receiver_id = receiver.id
     WHERE (sender_id = $1 AND receiver_id = $2 AND deleted_by_sender = FALSE)
     OR (sender_id = $2 AND receiver_id = $1 AND deleted_by_receiver = FALSE)
     ORDER BY created_at ASC`,
    [userId1, userId2]
  );
  return result.rows;
};

const getInbox = async (userId) => {
  const result = await pool.query(
    `SELECT DISTINCT ON (
       LEAST(sender_id, receiver_id),
       GREATEST(sender_id, receiver_id)
     )
     messages.*,
     sender.email as sender_email,
     receiver.email as receiver_email,
     sp.full_name as sender_name,
     sp.profile_image as sender_image,
     sp.phone as sender_phone,
     rp.full_name as receiver_name,
     rp.profile_image as receiver_image,
     rp.phone as receiver_phone
     FROM messages
     JOIN users sender ON messages.sender_id = sender.id
     JOIN users receiver ON messages.receiver_id = receiver.id
     LEFT JOIN (
       SELECT user_id, full_name, profile_image, phone FROM clients
       UNION
       SELECT user_id, full_name, profile_image, phone FROM advocates
     ) sp ON sp.user_id = messages.sender_id
     LEFT JOIN (
       SELECT user_id, full_name, profile_image, phone FROM clients
       UNION
       SELECT user_id, full_name, profile_image, phone FROM advocates
     ) rp ON rp.user_id = messages.receiver_id
     WHERE (sender_id = $1 AND deleted_by_sender = FALSE)
     OR (receiver_id = $1 AND deleted_by_receiver = FALSE)
     ORDER BY
       LEAST(sender_id, receiver_id),
       GREATEST(sender_id, receiver_id),
       created_at DESC`,
    [userId]
  );
  return result.rows;
};

const markAsRead = async (senderId, receiverId) => {
  await pool.query(
    `UPDATE messages SET is_read = TRUE
     WHERE sender_id = $1 AND receiver_id = $2`,
    [senderId, receiverId]
  );
};

const getUnreadCount = async (userId) => {
  const result = await pool.query(
    `SELECT COUNT(*) FROM messages
     WHERE receiver_id = $1
     AND is_read = FALSE
     AND deleted_by_receiver = FALSE`,
    [userId]
  );
  return parseInt(result.rows[0].count);
};

const deleteConversation = async (requestingUserId, otherUserId) => {
  await pool.query(
    `UPDATE messages
     SET deleted_by_sender = TRUE
     WHERE sender_id = $1 AND receiver_id = $2`,
    [requestingUserId, otherUserId]
  );

  await pool.query(
    `UPDATE messages
     SET deleted_by_receiver = TRUE
     WHERE sender_id = $2 AND receiver_id = $1`,
    [requestingUserId, otherUserId]
  );
};

const deleteMessage = async (messageId, userId, deleteForEveryone) => {
  const msg = await pool.query(
    `SELECT * FROM messages WHERE id = $1`,
    [messageId]
  );

  if (msg.rows.length === 0) return false;

  const message = msg.rows[0];

  if (deleteForEveryone && message.sender_id === userId) {
    // Delete for everyone — mark as deleted and update content
    await pool.query(
      `UPDATE messages
       SET is_deleted_for_everyone = TRUE,
           content = 'This message was deleted'
       WHERE id = $1`,
      [messageId]
    );
  } else if (message.sender_id === userId) {
    await pool.query(
      `UPDATE messages SET deleted_by_sender = TRUE WHERE id = $1`,
      [messageId]
    );
  } else if (message.receiver_id === userId) {
    await pool.query(
      `UPDATE messages SET deleted_by_receiver = TRUE WHERE id = $1`,
      [messageId]
    );
  }

  return true;
};

module.exports = {
  sendMessage,
  getConversation,
  getInbox,
  markAsRead,
  getUnreadCount,
  deleteConversation,
  deleteMessage,
};
