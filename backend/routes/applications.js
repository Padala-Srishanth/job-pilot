const express = require('express');
const auth = require('../middleware/auth');
const { db } = require('../config/firebase');
const { calculateRelevanceScore } = require('../services/jobMatcher');
const { generateCoverLetter } = require('../services/aiService');
const { runSmartApply } = require('../services/smartApply');
const { createNotification } = require('./notifications');
const { sendEmail, applicationStatusEmail, smartApplyResultEmail } = require('../services/emailService');

const router = express.Router();

// Get user's applications
router.get('/', auth, async (req, res) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;

    let query = db.collection('applications')
      .where('userId', '==', req.userId);

    const snapshot = await query.get();

    let applications = [];
    for (const doc of snapshot.docs) {
      const appData = { _id: doc.id, ...doc.data() };

      // Populate job data
      if (appData.jobId) {
        const jobDoc = await db.collection('jobs').doc(appData.jobId).get();
        appData.job = jobDoc.exists ? { _id: jobDoc.id, ...jobDoc.data() } : null;
      }
      applications.push(appData);
    }

    // Sort client-side (avoids needing Firestore composite index)
    applications.sort((a, b) => (b.appliedDate || '').localeCompare(a.appliedDate || ''));

    if (status) {
      applications = applications.filter(a => a.status === status);
    }

    const total = applications.length;
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const paginated = applications.slice((pageNum - 1) * limitNum, pageNum * limitNum);

    res.json({
      applications: paginated,
      pagination: { page: pageNum, limit: limitNum, total, pages: Math.ceil(total / limitNum) }
    });
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch applications', error: error.message });
  }
});

// Apply to a job
router.post('/:jobId', auth, async (req, res) => {
  try {
    const jobDoc = await db.collection('jobs').doc(req.params.jobId).get();
    if (!jobDoc.exists) return res.status(404).json({ message: 'Job not found' });
    const job = { _id: jobDoc.id, ...jobDoc.data() };

    // Check if already applied
    const existingSnap = await db.collection('applications')
      .where('userId', '==', req.userId)
      .where('jobId', '==', req.params.jobId)
      .limit(1)
      .get();

    if (!existingSnap.empty) {
      return res.status(400).json({ message: 'Already applied to this job' });
    }

    const relevanceScore = calculateRelevanceScore(req.user, job);
    const coverLetter = req.body.coverLetter || await generateCoverLetter(req.user, job);

    const applicationData = {
      userId: req.userId,
      jobId: req.params.jobId,
      status: 'applied',
      appliedVia: 'manual',
      relevanceScore,
      coverLetter,
      notes: req.body.notes || '',
      statusHistory: [{ status: 'applied', date: new Date().toISOString() }],
      appliedDate: new Date().toISOString(),
      responseDate: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const appRef = await db.collection('applications').add(applicationData);

    // Increment applicant count
    await db.collection('jobs').doc(req.params.jobId).update({
      applicantCount: (job.applicantCount || 0) + 1
    });

    res.status(201).json({
      application: { _id: appRef.id, ...applicationData, job }
    });
  } catch (error) {
    res.status(500).json({ message: 'Application failed', error: error.message });
  }
});

// Update application status
router.put('/:id/status', auth, async (req, res) => {
  try {
    const { status, note } = req.body;
    const appDoc = await db.collection('applications').doc(req.params.id).get();

    if (!appDoc.exists || appDoc.data().userId !== req.userId) {
      return res.status(404).json({ message: 'Application not found' });
    }

    const appData = appDoc.data();
    const statusHistory = appData.statusHistory || [];
    statusHistory.push({ status, date: new Date().toISOString(), note });

    const updates = {
      status,
      statusHistory,
      updatedAt: new Date().toISOString()
    };

    if (['accepted', 'rejected'].includes(status)) {
      updates.responseDate = new Date().toISOString();
    }

    await db.collection('applications').doc(req.params.id).update(updates);

    // Fetch updated app with job
    const updatedApp = { _id: req.params.id, ...appData, ...updates };
    let jobTitle = '', company = '';
    if (appData.jobId) {
      const jobDoc = await db.collection('jobs').doc(appData.jobId).get();
      updatedApp.job = jobDoc.exists ? { _id: jobDoc.id, ...jobDoc.data() } : null;
      jobTitle = updatedApp.job?.title || '';
      company = updatedApp.job?.company || '';
    }

    // Send notification + email
    await createNotification(req.userId, {
      type: 'application',
      title: `Application ${status}`,
      message: `Your application for ${jobTitle} at ${company} is now "${status}"`,
      link: '/applications'
    });

    if (req.user.email && req.user.notifications?.applicationUpdates) {
      const html = applicationStatusEmail(req.user.name, jobTitle, company, status);
      sendEmail(req.user.email, `Application Update: ${jobTitle} — ${status}`, html);
    }

    res.json({ application: updatedApp });
  } catch (error) {
    res.status(500).json({ message: 'Status update failed', error: error.message });
  }
});

// Withdraw application
router.delete('/:id', auth, async (req, res) => {
  try {
    const appDoc = await db.collection('applications').doc(req.params.id).get();

    if (!appDoc.exists || appDoc.data().userId !== req.userId) {
      return res.status(404).json({ message: 'Application not found' });
    }

    const appData = appDoc.data();
    const statusHistory = appData.statusHistory || [];
    statusHistory.push({ status: 'withdrawn', date: new Date().toISOString() });

    await db.collection('applications').doc(req.params.id).update({
      status: 'withdrawn',
      statusHistory,
      updatedAt: new Date().toISOString()
    });

    res.json({ message: 'Application withdrawn', application: { _id: req.params.id, ...appData, status: 'withdrawn' } });
  } catch (error) {
    res.status(500).json({ message: 'Withdrawal failed', error: error.message });
  }
});

// Trigger smart apply
router.post('/smart-apply/run', auth, async (req, res) => {
  try {
    const result = await runSmartApply(req.userId);

    if (result.applied > 0) {
      await createNotification(req.userId, {
        type: 'smart-apply',
        title: `Smart Apply: ${result.applied} jobs`,
        message: `Auto-applied to ${result.applied} matching jobs including ${result.jobs[0]?.title || 'new positions'}`,
        link: '/applications'
      });

      if (req.user.email && req.user.notifications?.email) {
        const html = smartApplyResultEmail(req.user.name, result.applied, result.jobs);
        sendEmail(req.user.email, `Smart Apply: Applied to ${result.applied} jobs`, html);
      }
    }

    res.json(result);
  } catch (error) {
    res.status(500).json({ message: 'Smart apply failed', error: error.message });
  }
});

module.exports = router;
