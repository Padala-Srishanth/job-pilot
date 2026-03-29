const express = require('express');
const auth = require('../middleware/auth');
const { db } = require('../config/firebase');

const router = express.Router();

// Get saved jobs
router.get('/', auth, async (req, res) => {
  try {
    const snapshot = await db.collection('savedJobs')
      .where('userId', '==', req.userId)
      .get();

    const saved = [];
    for (const doc of snapshot.docs) {
      const data = { _id: doc.id, ...doc.data() };
      if (data.jobId) {
        const jobDoc = await db.collection('jobs').doc(data.jobId).get();
        data.job = jobDoc.exists ? { _id: jobDoc.id, ...jobDoc.data() } : null;
      }
      saved.push(data);
    }

    saved.sort((a, b) => (b.savedAt || '').localeCompare(a.savedAt || ''));
    res.json({ savedJobs: saved });
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch saved jobs', error: error.message });
  }
});

// Save/bookmark a job
router.post('/:jobId', auth, async (req, res) => {
  try {
    // Check if already saved
    const existing = await db.collection('savedJobs')
      .where('userId', '==', req.userId)
      .where('jobId', '==', req.params.jobId)
      .limit(1).get();

    if (!existing.empty) {
      return res.status(400).json({ message: 'Job already saved' });
    }

    const ref = await db.collection('savedJobs').add({
      userId: req.userId,
      jobId: req.params.jobId,
      notes: req.body.notes || '',
      savedAt: new Date().toISOString()
    });

    res.status(201).json({ _id: ref.id, jobId: req.params.jobId });
  } catch (error) {
    res.status(500).json({ message: 'Failed to save job', error: error.message });
  }
});

// Unsave a job
router.delete('/:jobId', auth, async (req, res) => {
  try {
    const snapshot = await db.collection('savedJobs')
      .where('userId', '==', req.userId)
      .where('jobId', '==', req.params.jobId)
      .limit(1).get();

    if (snapshot.empty) return res.status(404).json({ message: 'Not found' });

    await snapshot.docs[0].ref.delete();
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ message: 'Failed to unsave', error: error.message });
  }
});

module.exports = router;
