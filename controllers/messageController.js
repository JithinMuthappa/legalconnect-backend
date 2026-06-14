const {
  sendMessage,
  getConversation,
  getInbox,
  markAsRead,
  getUnreadCount,
} = require('../models/messageModel');

const send = async (req, res) => {
  try {
    const { receiver_id, content } = req.body;
    const sender_id = req.user.id;

    if (!receiver_id || !content)
      return res.status(400).json({ success: false, message: 'Receiver and content are required' });

    const message = await sendMessage(sender_id, receiver_id, content);
    res.status(201).json({ success: true, message });

  } catch (error) {
    console.error('Send message error:', error.message);
    res.status(500).json({ success: false, message: 'Failed to send message' });
  }
};

const conversation = async (req, res) => {
  try {
    const userId1 = req.user.id;
    const userId2 = parseInt(req.params.userId);
    await markAsRead(userId2, userId1);
    const messages = await getConversation(userId1, userId2);
    res.json({ success: true, messages });

  } catch (error) {
    console.error('Get conversation error:', error.message);
    res.status(500).json({ success: false, message: 'Failed to get conversation' });
  }
};

const inbox = async (req, res) => {
  try {
    const userId = req.user.id;
    const messages = await getInbox(userId);
    res.json({ success: true, messages });

  } catch (error) {
    console.error('Get inbox error:', error.message);
    res.status(500).json({ success: false, message: 'Failed to get inbox' });
  }
};

const unreadCount = async (req, res) => {
  try {
    const count = await getUnreadCount(req.user.id);
    res.json({ success: true, count });

  } catch (error) {
    console.error('Unread count error:', error.message);
    res.status(500).json({ success: false, message: 'Failed to get unread count' });
  }
};

module.exports = { send, conversation, inbox, unreadCount };