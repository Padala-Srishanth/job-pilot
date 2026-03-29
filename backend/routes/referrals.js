const express = require('express');
const auth = require('../middleware/auth');
const { db } = require('../config/firebase');
const { generateReferralMessage } = require('../services/aiService');

const router = express.Router();

// Get referral contacts
router.get('/', auth, async (req, res) => {
  try {
    const { company, industry, page = 1, limit = 20 } = req.query;

    const snapshot = await db.collection('referrals')
      .where('isAvailable', '==', true)
      .get();

    let referrals = snapshot.docs.map(doc => ({ _id: doc.id, ...doc.data() }));

    // Client-side text filtering
    if (company) {
      const c = company.toLowerCase();
      referrals = referrals.filter(r => r.company?.toLowerCase().includes(c));
    }
    if (industry) {
      const ind = industry.toLowerCase();
      referrals = referrals.filter(r => r.industry?.toLowerCase().includes(ind));
    }

    const total = referrals.length;
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const paginated = referrals.slice((pageNum - 1) * limitNum, pageNum * limitNum);

    res.json({ referrals: paginated, pagination: { page: pageNum, limit: limitNum, total } });
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch referrals', error: error.message });
  }
});

// Request a referral
router.post('/request', auth, async (req, res) => {
  try {
    const { referralId, jobId, customMessage } = req.body;

    const refDoc = await db.collection('referrals').doc(referralId).get();
    if (!refDoc.exists) return res.status(404).json({ message: 'Referral contact not found' });
    const referral = { _id: refDoc.id, ...refDoc.data() };

    const message = customMessage || await generateReferralMessage(req.user, referral, jobId ? { title: 'the position' } : null);

    const requestData = {
      userId: req.userId,
      referralId,
      jobId: jobId || null,
      message,
      status: 'pending',
      createdAt: new Date().toISOString()
    };

    const requestRef = await db.collection('referralRequests').add(requestData);

    res.status(201).json({
      request: { _id: requestRef.id, ...requestData, referral }
    });
  } catch (error) {
    res.status(500).json({ message: 'Referral request failed', error: error.message });
  }
});

// Get user's referral requests
router.get('/my-requests', auth, async (req, res) => {
  try {
    const snapshot = await db.collection('referralRequests')
      .where('userId', '==', req.userId)
      .get();

    const requests = [];
    for (const doc of snapshot.docs) {
      const data = { _id: doc.id, ...doc.data() };
      if (data.referralId) {
        const refDoc = await db.collection('referrals').doc(data.referralId).get();
        data.referral = refDoc.exists ? { _id: refDoc.id, ...refDoc.data() } : null;
      }
      requests.push(data);
    }
    requests.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));

    res.json({ requests });
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch requests', error: error.message });
  }
});

// Generate AI referral message
router.post('/generate-message', auth, async (req, res) => {
  try {
    const { referralId } = req.body;
    const refDoc = await db.collection('referrals').doc(referralId).get();
    if (!refDoc.exists) return res.status(404).json({ message: 'Contact not found' });
    const referral = refDoc.data();

    const message = await generateReferralMessage(req.user, referral, { title: req.body.jobTitle || 'a position' });
    res.json({ message });
  } catch (error) {
    res.status(500).json({ message: 'Message generation failed', error: error.message });
  }
});

// Seed sample referrals
router.post('/seed', async (req, res) => {
  try {
    const snapshot = await db.collection('referrals').limit(1).get();
    if (!snapshot.empty) return res.json({ message: 'Referrals already seeded' });

    const batch = db.batch();
    const samples = [
      { name: 'Priya Sharma', company: 'Google', position: 'Senior Engineer', industry: 'Technology', connectionStrength: '2nd', linkedinUrl: '#', isAvailable: true },
      { name: 'Alex Johnson', company: 'Microsoft', position: 'Product Manager', industry: 'Technology', connectionStrength: '2nd', linkedinUrl: '#', isAvailable: true },
      { name: 'Rahul Verma', company: 'Amazon', position: 'SDE II', industry: 'E-commerce', connectionStrength: '3rd', linkedinUrl: '#', isAvailable: true },
      { name: 'Sarah Chen', company: 'Meta', position: 'ML Engineer', industry: 'Social Media', connectionStrength: '2nd', linkedinUrl: '#', isAvailable: true },
      { name: 'David Kim', company: 'Apple', position: 'iOS Developer', industry: 'Technology', connectionStrength: '3rd', linkedinUrl: '#', isAvailable: true },
      { name: 'Ananya Patel', company: 'Flipkart', position: 'Backend Engineer', industry: 'E-commerce', connectionStrength: '1st', linkedinUrl: '#', isAvailable: true },
      { name: 'James Wilson', company: 'Netflix', position: 'Data Scientist', industry: 'Entertainment', connectionStrength: '2nd', linkedinUrl: '#', isAvailable: true },
      { name: 'Meera Nair', company: 'Stripe', position: 'Full Stack Developer', industry: 'Fintech', connectionStrength: '3rd', linkedinUrl: '#', isAvailable: true }
    ];

    samples.forEach(s => {
      const ref = db.collection('referrals').doc();
      batch.set(ref, { ...s, createdAt: new Date().toISOString() });
    });

    await batch.commit();
    res.json({ message: `Seeded ${samples.length} referral contacts` });
  } catch (error) {
    res.status(500).json({ message: 'Seeding failed', error: error.message });
  }
});

module.exports = router;
