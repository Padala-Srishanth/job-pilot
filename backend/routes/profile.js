const express = require('express');
const auth = require('../middleware/auth');
const upload = require('../middleware/upload');
const { db } = require('../config/firebase');
const { parseResume } = require('../services/resumeParser');
const { suggestResumeImprovements } = require('../services/aiService');
const fs = require('fs');

const router = express.Router();

// Get profile
router.get('/', auth, async (req, res) => {
  res.json({ profile: req.user });
});

// Update profile
router.put('/', auth, async (req, res) => {
  try {
    const { name, preferences, notifications } = req.body;
    const updates = { updatedAt: new Date().toISOString() };

    if (name) updates.name = name;
    if (preferences) updates.preferences = { ...(req.user.preferences || {}), ...preferences };
    if (notifications) updates.notifications = { ...(req.user.notifications || {}), ...notifications };

    await db.collection('users').doc(req.userId).update(updates);

    const updatedDoc = await db.collection('users').doc(req.userId).get();
    res.json({ profile: { id: req.userId, ...updatedDoc.data() } });
  } catch (error) {
    res.status(500).json({ message: 'Profile update failed', error: error.message });
  }
});

// Upload and parse resume
router.post('/resume', auth, upload.single('resume'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    if (!fs.existsSync('uploads')) fs.mkdirSync('uploads');

    const parsedData = await parseResume(req.file.path);

    const resume = {
      originalName: req.file.originalname,
      filePath: req.file.path,
      parsedData
    };

    await db.collection('users').doc(req.userId).update({
      resume,
      updatedAt: new Date().toISOString()
    });

    res.json({ message: 'Resume uploaded and parsed successfully', resume });
  } catch (error) {
    res.status(500).json({ message: 'Resume upload failed', error: error.message });
  }
});

// Manually update parsed skills
router.put('/skills', auth, async (req, res) => {
  try {
    const { skills } = req.body;

    const userDoc = await db.collection('users').doc(req.userId).get();
    const userData = userDoc.data();
    const resume = userData.resume || { parsedData: {} };
    resume.parsedData = resume.parsedData || {};
    resume.parsedData.skills = skills;

    await db.collection('users').doc(req.userId).update({
      resume,
      updatedAt: new Date().toISOString()
    });

    res.json({ skills });
  } catch (error) {
    res.status(500).json({ message: 'Skills update failed', error: error.message });
  }
});

// Get resume improvement suggestions (AI-enhanced)
router.get('/resume/suggestions', auth, async (req, res) => {
  try {
    const parsedData = req.user.resume?.parsedData || {};
    const suggestions = await suggestResumeImprovements(parsedData);
    const aiAnalysis = parsedData.aiAnalysis || null;

    res.json({
      suggestions,
      aiAnalysis: aiAnalysis ? {
        domain: aiAnalysis.domain,
        experienceLevel: aiAnalysis.experienceLevel,
        years: aiAnalysis.totalYearsExperience,
        strengths: aiAnalysis.strengths,
        missingSkills: aiAnalysis.missingSkills,
        method: aiAnalysis.method
      } : null
    });
  } catch (error) {
    res.status(500).json({ message: 'Failed to get suggestions', error: error.message });
  }
});

// Toggle smart apply
router.put('/smart-apply', auth, async (req, res) => {
  try {
    const { enabled, dailyLimit } = req.body;
    const smartApply = { ...(req.user.smartApply || {}) };

    if (typeof enabled === 'boolean') smartApply.enabled = enabled;
    if (dailyLimit) smartApply.dailyLimit = Math.min(50, Math.max(1, dailyLimit));

    await db.collection('users').doc(req.userId).update({
      smartApply,
      updatedAt: new Date().toISOString()
    });

    res.json({ smartApply });
  } catch (error) {
    res.status(500).json({ message: 'Smart apply update failed', error: error.message });
  }
});

module.exports = router;
