const { auth, db } = require('../config/firebase');

/**
 * Firebase Auth middleware - verifies Firebase ID token from frontend
 */
const authMiddleware = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    // Verify Firebase ID token
    const decodedToken = await auth.verifyIdToken(token);
    const uid = decodedToken.uid;

    // Get user profile from Firestore
    const userDoc = await db.collection('users').doc(uid).get();

    if (!userDoc.exists) {
      // Auto-create user profile on first API call after Firebase Auth signup
      const firebaseUser = await auth.getUser(uid);
      const newUser = {
        name: firebaseUser.displayName || decodedToken.name || 'User',
        email: firebaseUser.email || decodedToken.email,
        avatar: firebaseUser.photoURL || '',
        resume: null,
        preferences: {
          roles: [],
          locations: [],
          salaryMin: 0,
          salaryMax: 0,
          workType: 'any',
          jobType: 'any',
          industries: []
        },
        smartApply: {
          enabled: false,
          dailyLimit: 10,
          appliedToday: 0,
          lastResetDate: new Date().toISOString()
        },
        notifications: {
          email: true,
          applicationUpdates: true,
          newMatches: true
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      await db.collection('users').doc(uid).set(newUser);
      req.user = { id: uid, ...newUser };
    } else {
      req.user = { id: uid, ...userDoc.data() };
    }

    req.userId = uid;
    next();
  } catch (error) {
    console.error('Auth middleware error:', error.message);
    res.status(401).json({ message: 'Invalid or expired token' });
  }
};

module.exports = authMiddleware;
