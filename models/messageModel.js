const pool = require('../config/db');

const sendMessage = async (senderId, receiverId, content) => {
  const result = await pool.query(
    `INSERT INTO messages (sender_id, receiver_id, content)
     VALUES ($1, $2, $3) RETURNING *`,
    [senderId, receiverId, content]
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
     WHERE (sender_id = $1 AND receiver_id = $2)
     OR (sender_id = $2 AND receiver_id = $1)
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
     rp.full_name as receiver_name,
     rp.profile_image as receiver_image
     FROM messages
     JOIN users sender ON messages.sender_id = sender.id
     JOIN users receiver ON messages.receiver_id = receiver.id
     LEFT JOIN (
       SELECT user_id, full_name, profile_image FROM clients
       UNION
       SELECT user_id, full_name, profile_image FROM advocates
     ) sp ON sp.user_id = messages.sender_id
     LEFT JOIN (
       SELECT user_id, full_name, profile_image FROM clients
       UNION
       SELECT user_id, full_name, profile_image FROM advocates
     ) rp ON rp.user_id = messages.receiver_id
     WHERE sender_id = $1 OR receiver_id = $1
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
     WHERE receiver_id = $1 AND is_read = FALSE`,
    [userId]
  );
  return parseInt(result.rows[0].count);
};

const deleteConversation = async (userId1, userId2) => {
  await pool.query(
    `DELETE FROM messages
     WHERE (sender_id = $1 AND receiver_id = $2)
     OR (sender_id = $2 AND receiver_id = $1)`,
    [userId1, userId2]
  );
};

module.exports = {
  sendMessage,
  getConversation,
  getInbox,
  markAsRead,
  getUnreadCount,
  deleteConversation,
};