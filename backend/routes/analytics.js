const express = require('express');
const auth = require('../middleware/auth');
const { db } = require('../config/firebase');

const router = express.Router();

// Get analytics dashboard data
router.get('/', auth, async (req, res) => {
  try {
    const userId = req.userId;

    // Get all user applications
    const appsSnapshot = await db.collection('applications')
      .where('userId', '==', userId)
      .get();

    const applications = appsSnapshot.docs.map(doc => ({ _id: doc.id, ...doc.data() }));

    // Status counts
    const statusCounts = { total: 0, pending: 0, applied: 0, reviewing: 0, interview: 0, accepted: 0, rejected: 0, withdrawn: 0 };
    applications.forEach(app => {
      if (statusCounts[app.status] !== undefined) {
        statusCounts[app.status]++;
      }
      statusCounts.total++;
    });

    // Weekly applications (last 4 weeks)
    const fourWeeksAgo = new Date();
    fourWeeksAgo.setDate(fourWeeksAgo.getDate() - 28);
    const recentApps = applications.filter(a => new Date(a.appliedDate) >= fourWeeksAgo);

    const weeklyMap = {};
    recentApps.forEach(app => {
      const date = new Date(app.appliedDate);
      const weekStart = new Date(date);
      weekStart.setDate(date.getDate() - date.getDay());
      const key = weekStart.toISOString().split('T')[0];
      weeklyMap[key] = (weeklyMap[key] || 0) + 1;
    });
    const weeklyApplications = Object.entries(weeklyMap)
      .map(([week, count]) => ({ week, count }))
      .sort((a, b) => a.week.localeCompare(b.week));

    // Top skills from applied jobs
    const skillCount = {};
    for (const app of applications.slice(0, 100)) {
      if (app.jobId) {
        const jobDoc = await db.collection('jobs').doc(app.jobId).get();
        if (jobDoc.exists) {
          (jobDoc.data().skills || []).forEach(skill => {
            skillCount[skill] = (skillCount[skill] || 0) + 1;
          });
        }
      }
    }
    const topSkillMatches = Object.entries(skillCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([skill, count]) => ({ skill, count }));

    // Recent activity
    const sorted = [...applications].sort((a, b) => (b.updatedAt || b.appliedDate || '').localeCompare(a.updatedAt || a.appliedDate || ''));
    const recentActivity = [];
    for (const app of sorted.slice(0, 10)) {
      let jobTitle = '', company = '';
      if (app.jobId) {
        const jobDoc = await db.collection('jobs').doc(app.jobId).get();
        if (jobDoc.exists) {
          jobTitle = jobDoc.data().title;
          company = jobDoc.data().company;
        }
      }
      recentActivity.push({
        id: app._id,
        jobTitle,
        company,
        status: app.status,
        date: app.updatedAt || app.appliedDate,
        appliedVia: app.appliedVia
      });
    }

    const responseRate = statusCounts.total > 0
      ? Math.round(((statusCounts.interview + statusCounts.accepted) / statusCounts.total) * 100)
      : 0;

    const successRate = statusCounts.total > 0
      ? Math.round((statusCounts.accepted / statusCounts.total) * 100)
      : 0;

    res.json({
      overview: {
        totalApplications: statusCounts.total,
        responseRate,
        successRate,
        pending: statusCounts.pending,
        applied: statusCounts.applied,
        interviewing: statusCounts.interview,
        accepted: statusCounts.accepted,
        rejected: statusCounts.rejected
      },
      weeklyApplications,
      topSkillMatches,
      recentActivity
    });
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch analytics', error: error.message });
  }
});

module.exports = router;
