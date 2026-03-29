const express = require('express');
const auth = require('../middleware/auth');
const { db } = require('../config/firebase');
const { rankJobs } = require('../services/jobMatcher');

const router = express.Router();

// Get all jobs with filters
router.get('/', auth, async (req, res) => {
  try {
    const {
      search, location, workType, jobType, experienceLevel,
      page = 1, limit = 20, sort = 'relevance'
    } = req.query;

    const snapshot = await db.collection('jobs').where('isActive', '==', true).get();

    let jobs = snapshot.docs.map(doc => ({ _id: doc.id, ...doc.data() }));

    // Client-side filtering (avoids Firestore composite indexes)
    if (workType && workType !== 'any') jobs = jobs.filter(j => j.workType === workType);
    if (jobType && jobType !== 'any') jobs = jobs.filter(j => j.jobType === jobType);
    if (experienceLevel) jobs = jobs.filter(j => j.experienceLevel === experienceLevel);

    // Sort by date
    jobs.sort((a, b) => (b.postedDate || '').localeCompare(a.postedDate || ''));

    // Client-side filtering for text search and location (Firestore doesn't support regex)
    if (search) {
      const s = search.toLowerCase();
      jobs = jobs.filter(j =>
        j.title?.toLowerCase().includes(s) ||
        j.company?.toLowerCase().includes(s) ||
        j.description?.toLowerCase().includes(s) ||
        (j.skills || []).some(sk => sk.toLowerCase().includes(s))
      );
    }
    if (location) {
      const loc = location.toLowerCase();
      jobs = jobs.filter(j => j.location?.toLowerCase().includes(loc));
    }

    const total = jobs.length;
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);

    if (sort === 'relevance') {
      jobs = rankJobs(req.user, jobs);
    }

    const paginated = jobs.slice((pageNum - 1) * limitNum, pageNum * limitNum);

    res.json({
      jobs: paginated,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum)
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch jobs', error: error.message });
  }
});

// Get single job
router.get('/:id', auth, async (req, res) => {
  try {
    const doc = await db.collection('jobs').doc(req.params.id).get();
    if (!doc.exists) return res.status(404).json({ message: 'Job not found' });
    res.json({ job: { _id: doc.id, ...doc.data() } });
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch job', error: error.message });
  }
});

// Get recommended jobs for user
router.get('/recommended/me', auth, async (req, res) => {
  try {
    const snapshot = await db.collection('jobs')
      .where('isActive', '==', true)
      .get();

    let jobs = snapshot.docs.map(doc => ({ _id: doc.id, ...doc.data() }));
    jobs.sort((a, b) => (b.postedDate || '').localeCompare(a.postedDate || ''));
    jobs = jobs.slice(0, 50);
    const ranked = rankJobs(req.user, jobs);
    res.json({ jobs: ranked.slice(0, 20) });
  } catch (error) {
    res.status(500).json({ message: 'Failed to get recommendations', error: error.message });
  }
});

// Create job from external source (Chrome Extension)
router.post('/external', auth, async (req, res) => {
  try {
    const { title, company, location, description, source, applicationUrl, workType, jobType, skills } = req.body;
    if (!title) return res.status(400).json({ message: 'Title is required' });

    // Check duplicate
    const existing = await db.collection('jobs')
      .where('title', '==', title)
      .where('company', '==', company || '')
      .where('source', '==', source || 'extension')
      .limit(1).get();

    if (!existing.empty) {
      return res.json({ jobId: existing.docs[0].id, message: 'Job already exists' });
    }

    const jobData = {
      title, company: company || '', companyLogo: '', location: location || '',
      description: description || '', requirements: [], skills: skills || [],
      workType: workType || 'on-site', jobType: jobType || 'full-time',
      salaryMin: 0, salaryMax: 0, salaryCurrency: 'INR',
      experienceLevel: 'mid', industry: 'Technology',
      source: source || 'extension', applicationUrl: applicationUrl || '',
      isActive: true, applicantCount: 0,
      postedDate: new Date().toISOString(),
      expiryDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      createdAt: new Date().toISOString()
    };

    const ref = await db.collection('jobs').add(jobData);
    res.status(201).json({ jobId: ref.id, message: 'Job created' });
  } catch (error) {
    res.status(500).json({ message: 'Failed to create job', error: error.message });
  }
});

// Seed sample jobs
router.post('/seed', async (req, res) => {
  try {
    const snapshot = await db.collection('jobs').limit(1).get();
    if (!snapshot.empty) return res.json({ message: 'Jobs already seeded', count: snapshot.size });

    const batch = db.batch();
    const sampleJobs = getSampleJobs();

    sampleJobs.forEach(job => {
      const ref = db.collection('jobs').doc();
      batch.set(ref, {
        ...job,
        postedDate: new Date().toISOString(),
        expiryDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        isActive: true,
        applicantCount: 0,
        createdAt: new Date().toISOString()
      });
    });

    await batch.commit();
    res.json({ message: `Seeded ${sampleJobs.length} sample jobs` });
  } catch (error) {
    res.status(500).json({ message: 'Seeding failed', error: error.message });
  }
});

function getSampleJobs() {
  return [
    {
      title: 'Frontend Developer', company: 'TechCorp', companyLogo: '',
      description: 'Build modern web applications using React and TypeScript. Work with a team of designers and backend engineers.',
      requirements: ['2+ years React experience', 'TypeScript proficiency', 'CSS/Tailwind', 'Git'],
      skills: ['react', 'typescript', 'tailwind', 'javascript', 'git'],
      location: 'San Francisco, CA', workType: 'hybrid', jobType: 'full-time',
      salaryMin: 90000, salaryMax: 130000, salaryCurrency: 'USD',
      experienceLevel: 'mid', industry: 'Technology', source: 'linkedin'
    },
    {
      title: 'Backend Engineer', company: 'DataFlow Inc', companyLogo: '',
      description: 'Design and implement scalable APIs and microservices. Experience with Node.js and databases required.',
      requirements: ['Node.js expertise', 'MongoDB/PostgreSQL', 'REST API design', 'Docker'],
      skills: ['node.js', 'express', 'mongodb', 'docker', 'rest api'],
      location: 'New York, NY', workType: 'remote', jobType: 'full-time',
      salaryMin: 100000, salaryMax: 150000, salaryCurrency: 'USD',
      experienceLevel: 'mid', industry: 'Technology', source: 'indeed'
    },
    {
      title: 'Full Stack Developer Intern', company: 'StartupXYZ', companyLogo: '',
      description: 'Join our fast-paced startup and work on both frontend and backend features. Great learning opportunity.',
      requirements: ['Basic JavaScript knowledge', 'Familiarity with React or Vue', 'Eagerness to learn'],
      skills: ['javascript', 'react', 'node.js', 'html', 'css'],
      location: 'Bangalore, India', workType: 'on-site', jobType: 'internship',
      salaryMin: 15000, salaryMax: 25000, salaryCurrency: 'INR',
      experienceLevel: 'entry', industry: 'Technology', source: 'internshala'
    },
    {
      title: 'Machine Learning Engineer', company: 'AI Solutions', companyLogo: '',
      description: 'Develop and deploy ML models for production. Work on NLP and computer vision projects.',
      requirements: ['Python expertise', 'TensorFlow/PyTorch', 'ML fundamentals', 'Data pipelines'],
      skills: ['python', 'machine learning', 'tensorflow', 'pytorch', 'nlp', 'deep learning'],
      location: 'Remote', workType: 'remote', jobType: 'full-time',
      salaryMin: 120000, salaryMax: 180000, salaryCurrency: 'USD',
      experienceLevel: 'mid', industry: 'Artificial Intelligence', source: 'linkedin'
    },
    {
      title: 'Data Analyst Intern', company: 'FinTech Corp', companyLogo: '',
      description: 'Analyze financial data and create dashboards. SQL and Python experience preferred.',
      requirements: ['SQL proficiency', 'Python basics', 'Data visualization', 'Excel'],
      skills: ['sql', 'python', 'data analysis', 'tableau', 'pandas'],
      location: 'Mumbai, India', workType: 'hybrid', jobType: 'internship',
      salaryMin: 20000, salaryMax: 35000, salaryCurrency: 'INR',
      experienceLevel: 'entry', industry: 'Finance', source: 'internshala'
    },
    {
      title: 'DevOps Engineer', company: 'CloudNine', companyLogo: '',
      description: 'Manage CI/CD pipelines, cloud infrastructure, and deployment automation.',
      requirements: ['AWS/GCP experience', 'Docker & Kubernetes', 'CI/CD tools', 'Linux administration'],
      skills: ['aws', 'docker', 'kubernetes', 'ci/cd', 'linux', 'terraform'],
      location: 'Austin, TX', workType: 'remote', jobType: 'full-time',
      salaryMin: 110000, salaryMax: 160000, salaryCurrency: 'USD',
      experienceLevel: 'senior', industry: 'Cloud Computing', source: 'glassdoor'
    },
    {
      title: 'UI/UX Designer', company: 'DesignHub', companyLogo: '',
      description: 'Create beautiful and intuitive user interfaces. Work closely with product and engineering teams.',
      requirements: ['Figma expertise', 'UI design portfolio', 'User research', 'Prototyping'],
      skills: ['figma', 'adobe xd', 'css', 'html', 'photoshop'],
      location: 'London, UK', workType: 'hybrid', jobType: 'full-time',
      salaryMin: 55000, salaryMax: 80000, salaryCurrency: 'GBP',
      experienceLevel: 'mid', industry: 'Design', source: 'linkedin'
    },
    {
      title: 'React Native Developer', company: 'MobileFirst', companyLogo: '',
      description: 'Build cross-platform mobile apps using React Native. Strong JavaScript skills required.',
      requirements: ['React Native experience', 'JavaScript/TypeScript', 'Mobile app deployment', 'REST APIs'],
      skills: ['react', 'javascript', 'typescript', 'rest api', 'git'],
      location: 'Delhi, India', workType: 'on-site', jobType: 'full-time',
      salaryMin: 800000, salaryMax: 1500000, salaryCurrency: 'INR',
      experienceLevel: 'mid', industry: 'Mobile', source: 'indeed'
    },
    {
      title: 'Python Developer', company: 'AutomatePro', companyLogo: '',
      description: 'Develop automation scripts and backend services using Python. Django/Flask experience is a plus.',
      requirements: ['Python expertise', 'Django or Flask', 'Database management', 'API development'],
      skills: ['python', 'django', 'flask', 'postgresql', 'rest api'],
      location: 'Berlin, Germany', workType: 'remote', jobType: 'contract',
      salaryMin: 70000, salaryMax: 100000, salaryCurrency: 'EUR',
      experienceLevel: 'mid', industry: 'Automation', source: 'glassdoor'
    },
    {
      title: 'Software Engineering Intern', company: 'Google', companyLogo: '',
      description: 'Work on real products used by billions. Gain mentorship from world-class engineers.',
      requirements: ['Strong CS fundamentals', 'Proficiency in one language', 'Problem-solving skills'],
      skills: ['python', 'java', 'c++', 'git', 'linux'],
      location: 'Mountain View, CA', workType: 'on-site', jobType: 'internship',
      salaryMin: 8000, salaryMax: 10000, salaryCurrency: 'USD',
      experienceLevel: 'entry', industry: 'Technology', source: 'linkedin'
    }
  ];
}

module.exports = router;
