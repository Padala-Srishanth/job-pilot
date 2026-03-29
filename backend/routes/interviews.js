const express = require('express');
const auth = require('../middleware/auth');
const { db } = require('../config/firebase');
const { createNotification } = require('./notifications');
const { sendEmail, interviewReminderEmail } = require('../services/emailService');

const router = express.Router();

// Get all interviews
router.get('/', auth, async (req, res) => {
  try {
    const snapshot = await db.collection('interviews')
      .where('userId', '==', req.userId)
      .get();

    let interviews = [];
    for (const doc of snapshot.docs) {
      const data = { _id: doc.id, ...doc.data() };
      if (data.jobId) {
        const jobDoc = await db.collection('jobs').doc(data.jobId).get();
        data.job = jobDoc.exists ? { _id: jobDoc.id, ...jobDoc.data() } : null;
      }
      interviews.push(data);
    }

    interviews.sort((a, b) => (a.date || '').localeCompare(b.date || ''));
    res.json({ interviews });
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch interviews', error: error.message });
  }
});

// Schedule an interview
router.post('/', auth, async (req, res) => {
  try {
    const { jobId, applicationId, date, time, type, link, location, notes, company, jobTitle } = req.body;

    const interview = {
      userId: req.userId,
      jobId: jobId || null,
      applicationId: applicationId || null,
      jobTitle: jobTitle || '',
      company: company || '',
      date, // ISO string
      time: time || '',
      type: type || 'video', // video, phone, onsite, take-home
      meetingLink: link || '',
      location: location || '',
      notes: notes || '',
      status: 'scheduled', // scheduled, completed, cancelled, rescheduled
      prepNotes: '',
      feedback: '',
      createdAt: new Date().toISOString()
    };

    const ref = await db.collection('interviews').add(interview);

    // Update application status to interview
    if (applicationId) {
      const appDoc = await db.collection('applications').doc(applicationId).get();
      if (appDoc.exists) {
        const appData = appDoc.data();
        const history = appData.statusHistory || [];
        history.push({ status: 'interview', date: new Date().toISOString(), note: `Interview scheduled: ${date}` });
        await db.collection('applications').doc(applicationId).update({
          status: 'interview',
          statusHistory: history,
          updatedAt: new Date().toISOString()
        });
      }
    }

    // Create notification
    await createNotification(req.userId, {
      type: 'interview',
      title: 'Interview Scheduled',
      message: `Interview for ${jobTitle || 'a position'} at ${company} on ${new Date(date).toLocaleDateString()}`,
      link: '/interviews'
    });

    // Send email reminder
    if (req.user.email && req.user.notifications?.email) {
      const html = interviewReminderEmail(req.user.name, jobTitle || 'Position', company || 'Company', date, notes);
      sendEmail(req.user.email, `Interview Scheduled: ${jobTitle} at ${company}`, html);
    }

    res.status(201).json({ interview: { _id: ref.id, ...interview } });
  } catch (error) {
    res.status(500).json({ message: 'Failed to schedule interview', error: error.message });
  }
});

// Update interview
router.put('/:id', auth, async (req, res) => {
  try {
    const { date, time, type, link, location, notes, status, prepNotes, feedback } = req.body;
    const updates = { updatedAt: new Date().toISOString() };

    if (date) updates.date = date;
    if (time) updates.time = time;
    if (type) updates.type = type;
    if (link !== undefined) updates.meetingLink = link;
    if (location !== undefined) updates.location = location;
    if (notes !== undefined) updates.notes = notes;
    if (status) updates.status = status;
    if (prepNotes !== undefined) updates.prepNotes = prepNotes;
    if (feedback !== undefined) updates.feedback = feedback;

    await db.collection('interviews').doc(req.params.id).update(updates);

    const doc = await db.collection('interviews').doc(req.params.id).get();
    res.json({ interview: { _id: doc.id, ...doc.data() } });
  } catch (error) {
    res.status(500).json({ message: 'Failed to update interview', error: error.message });
  }
});

// Delete interview
router.delete('/:id', auth, async (req, res) => {
  try {
    await db.collection('interviews').doc(req.params.id).delete();
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ message: 'Failed to delete interview', error: error.message });
  }
});

module.exports = router;
