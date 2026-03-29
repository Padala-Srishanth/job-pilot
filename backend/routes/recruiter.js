const express = require('express');
const auth = require('../middleware/auth');
const { db } = require('../config/firebase');

const router = express.Router();

// Get recruiter posts
router.get('/', auth, async (req, res) => {
  try {
    const { skills, location, page = 1, limit = 20 } = req.query;

    const snapshot = await db.collection('recruiterPosts')
      .where('isActive', '==', true)
      .get();

    let posts = snapshot.docs.map(doc => ({ _id: doc.id, ...doc.data() }));
    posts.sort((a, b) => (b.postedDate || '').localeCompare(a.postedDate || ''));

    // Client-side filtering
    if (skills) {
      const skillList = skills.split(',').map(s => s.trim().toLowerCase());
      posts = posts.filter(p =>
        (p.skills || []).some(ps => skillList.some(s => ps.toLowerCase().includes(s)))
      );
    }
    if (location) {
      const loc = location.toLowerCase();
      posts = posts.filter(p => p.location?.toLowerCase().includes(loc));
    }

    const total = posts.length;
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const paginated = posts.slice((pageNum - 1) * limitNum, pageNum * limitNum);

    res.json({ posts: paginated, pagination: { page: pageNum, limit: limitNum, total } });
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch posts', error: error.message });
  }
});

// Like a post
router.post('/:id/like', auth, async (req, res) => {
  try {
    const postRef = db.collection('recruiterPosts').doc(req.params.id);
    const postDoc = await postRef.get();
    if (!postDoc.exists) return res.status(404).json({ message: 'Post not found' });

    const currentLikes = postDoc.data().likes || 0;
    await postRef.update({ likes: currentLikes + 1 });

    res.json({ post: { _id: req.params.id, ...postDoc.data(), likes: currentLikes + 1 } });
  } catch (error) {
    res.status(500).json({ message: 'Like failed', error: error.message });
  }
});

// Seed sample recruiter posts
router.post('/seed', async (req, res) => {
  try {
    const snapshot = await db.collection('recruiterPosts').limit(1).get();
    if (!snapshot.empty) return res.json({ message: 'Posts already seeded' });

    const batch = db.batch();
    const posts = [
      {
        recruiter: { name: 'Lisa Chen', company: 'Google', title: 'Technical Recruiter', avatar: '' },
        content: "We're hiring! Looking for passionate frontend developers to join our Cloud team. If you love React and building scalable UIs, let's talk!",
        jobTitle: 'Frontend Developer', jobType: 'full-time', location: 'Mountain View, CA',
        skills: ['react', 'typescript', 'javascript'], applicationLink: '#', likes: 24
      },
      {
        recruiter: { name: 'Raj Patel', company: 'Microsoft', title: 'Senior Recruiter', avatar: '' },
        content: "Exciting internship opportunity at Microsoft! We're looking for CS students who are passionate about AI/ML. Summer 2025 applications now open.",
        jobTitle: 'ML Intern', jobType: 'internship', location: 'Redmond, WA',
        skills: ['python', 'machine learning', 'tensorflow'], applicationLink: '#', likes: 56
      },
      {
        recruiter: { name: 'Emily Brown', company: 'Amazon', title: 'University Recruiter', avatar: '' },
        content: "Amazon is hiring new grads! SDE I positions available across multiple teams. Strong DSA skills required. Apply now!",
        jobTitle: 'SDE I', jobType: 'full-time', location: 'Seattle, WA',
        skills: ['java', 'python', 'aws'], applicationLink: '#', likes: 89
      },
      {
        recruiter: { name: 'Vikram Singh', company: 'Flipkart', title: 'HR Manager', avatar: '' },
        content: "Flipkart is expanding! Multiple backend engineering roles open in Bangalore. Experience with Node.js and microservices preferred.",
        jobTitle: 'Backend Engineer', jobType: 'full-time', location: 'Bangalore, India',
        skills: ['node.js', 'mongodb', 'docker'], applicationLink: '#', likes: 33
      },
      {
        recruiter: { name: 'Maria Garcia', company: 'Stripe', title: 'Talent Acquisition', avatar: '' },
        content: "Join Stripe's infrastructure team! We're looking for engineers who love building reliable systems. Remote-friendly. Competitive comp.",
        jobTitle: 'Infrastructure Engineer', jobType: 'full-time', location: 'Remote',
        skills: ['go', 'ruby', 'aws', 'kubernetes'], applicationLink: '#', likes: 42
      },
      {
        recruiter: { name: 'Tom Harris', company: 'Netflix', title: 'Engineering Recruiter', avatar: '' },
        content: "Netflix is hiring data engineers! Work on petabyte-scale data pipelines. Strong Python and Spark skills needed. Top-of-market compensation.",
        jobTitle: 'Data Engineer', jobType: 'full-time', location: 'Los Gatos, CA',
        skills: ['python', 'sql', 'data analysis'], applicationLink: '#', likes: 67
      }
    ];

    posts.forEach(p => {
      const ref = db.collection('recruiterPosts').doc();
      batch.set(ref, { ...p, isActive: true, postedDate: new Date().toISOString(), createdAt: new Date().toISOString() });
    });

    await batch.commit();
    res.json({ message: `Seeded ${posts.length} recruiter posts` });
  } catch (error) {
    res.status(500).json({ message: 'Seeding failed', error: error.message });
  }
});

module.exports = router;
