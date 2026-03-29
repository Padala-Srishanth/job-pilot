const express = require('express');
const { db, auth } = require('../config/firebase');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

// Get current user (Firebase Auth token verified by middleware)
router.get('/me', authMiddleware, async (req, res) => {
  res.json({ user: req.user });
});

// Sync user profile after Firebase Auth login/register (called from frontend)
router.post('/sync', authMiddleware, async (req, res) => {
  try {
    const { name } = req.body;

    // Update name if provided (e.g. on register)
    if (name && name !== req.user.name) {
      await db.collection('users').doc(req.userId).update({
        name,
        updatedAt: new Date().toISOString()
      });
      req.user.name = name;
    }

    res.json({ user: req.user });
  } catch (error) {
    res.status(500).json({ message: 'Sync failed', error: error.message });
  }
});

module.exports = router;
