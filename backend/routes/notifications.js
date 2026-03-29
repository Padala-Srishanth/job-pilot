const express = require('express');
const auth = require('../middleware/auth');
const { db } = require('../config/firebase');

const router = express.Router();

// Get user notifications
router.get('/', auth, async (req, res) => {
  try {
    const snapshot = await db.collection('notifications')
      .where('userId', '==', req.userId)
      .get();

    let notifications = snapshot.docs.map(doc => ({ _id: doc.id, ...doc.data() }));
    notifications.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));

    const unreadCount = notifications.filter(n => !n.read).length;

    res.json({ notifications: notifications.slice(0, 50), unreadCount });
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch notifications', error: error.message });
  }
});

// Mark notification as read
router.put('/:id/read', auth, async (req, res) => {
  try {
    await db.collection('notifications').doc(req.params.id).update({ read: true });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ message: 'Failed to mark as read', error: error.message });
  }
});

// Mark all as read
router.put('/read-all', auth, async (req, res) => {
  try {
    const snapshot = await db.collection('notifications')
      .where('userId', '==', req.userId)
      .where('read', '==', false)
      .get();

    const batch = db.batch();
    snapshot.docs.forEach(doc => batch.update(doc.ref, { read: true }));
    await batch.commit();

    res.json({ success: true, marked: snapshot.size });
  } catch (error) {
    res.status(500).json({ message: 'Failed', error: error.message });
  }
});

// Delete notification
router.delete('/:id', auth, async (req, res) => {
  try {
    await db.collection('notifications').doc(req.params.id).delete();
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ message: 'Failed', error: error.message });
  }
});

module.exports = router;

// Helper — create a notification (used by other services)
module.exports.createNotification = async function(userId, { type, title, message, link }) {
  await db.collection('notifications').add({
    userId,
    type, // 'application', 'smart-apply', 'interview', 'referral', 'system'
    title,
    message,
    link: link || '',
    read: false,
    createdAt: new Date().toISOString()
  });
};
