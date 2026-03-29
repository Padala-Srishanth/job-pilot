const { db } = require('../config/firebase');
const { rankJobs } = require('./jobMatcher');
const { generateCoverLetter } = require('./aiService');

/**
 * Smart Apply Agent - Automatically finds and applies to relevant jobs
 */
async function runSmartApply(userId) {
  const userDoc = await db.collection('users').doc(userId).get();
  if (!userDoc.exists) return { applied: 0, jobs: [] };

  const user = { id: userId, ...userDoc.data() };
  if (!user.smartApply?.enabled) return { applied: 0, jobs: [] };

  // Reset daily counter if new day
  const today = new Date().toDateString();
  const lastReset = user.smartApply.lastResetDate ? new Date(user.smartApply.lastResetDate).toDateString() : '';
  if (lastReset !== today) {
    user.smartApply.appliedToday = 0;
    user.smartApply.lastResetDate = new Date().toISOString();
    await db.collection('users').doc(userId).update({ smartApply: user.smartApply });
  }

  const remaining = user.smartApply.dailyLimit - (user.smartApply.appliedToday || 0);
  if (remaining <= 0) return { applied: 0, jobs: [], message: 'Daily limit reached' };

  // Get jobs user has already applied to
  const appliedSnap = await db.collection('applications')
    .where('userId', '==', userId)
    .get();
  const appliedJobIds = new Set(appliedSnap.docs.map(d => d.data().jobId));

  // Get active jobs
  const jobsSnap = await db.collection('jobs')
    .where('isActive', '==', true)
    .limit(50)
    .get();

  const availableJobs = jobsSnap.docs
    .map(doc => ({ _id: doc.id, ...doc.data() }))
    .filter(job => !appliedJobIds.has(job._id));

  if (!availableJobs.length) return { applied: 0, jobs: [], message: 'No new jobs found' };

  // Rank jobs by relevance
  const rankedJobs = rankJobs(user, availableJobs);
  const qualifiedJobs = rankedJobs.filter(j => j.relevanceScore >= 60).slice(0, remaining);
  const appliedJobs = [];

  for (const job of qualifiedJobs) {
    try {
      const coverLetter = await generateCoverLetter(user, job);

      const applicationData = {
        userId,
        jobId: job._id,
        status: 'applied',
        appliedVia: 'smart-apply',
        relevanceScore: job.relevanceScore,
        coverLetter,
        statusHistory: [{ status: 'applied', date: new Date().toISOString(), note: 'Auto-applied via Smart Apply' }],
        appliedDate: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      await db.collection('applications').add(applicationData);

      // Update applicant count
      const currentCount = job.applicantCount || 0;
      await db.collection('jobs').doc(job._id).update({ applicantCount: currentCount + 1 });

      appliedJobs.push({
        jobId: job._id,
        title: job.title,
        company: job.company,
        relevanceScore: job.relevanceScore
      });
    } catch (error) {
      console.error(`Smart apply error for job ${job._id}:`, error);
    }
  }

  // Update daily counter
  user.smartApply.appliedToday = (user.smartApply.appliedToday || 0) + appliedJobs.length;
  await db.collection('users').doc(userId).update({ smartApply: user.smartApply });

  return { applied: appliedJobs.length, jobs: appliedJobs };
}

module.exports = { runSmartApply };
