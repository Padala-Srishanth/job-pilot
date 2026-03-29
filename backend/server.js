const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');

dotenv.config();

// Initialize Firebase (must be before routes)
require('./config/firebase');

const app = express();

const { rateLimit } = require('./middleware/rateLimiter');

// Middleware
const allowedOrigins = [
  'http://localhost:3000',
  'https://job-pilot.netlify.app',
  'https://job-pilots.netlify.app',
  process.env.CLIENT_URL
].filter(Boolean);

app.use(cors({
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(null, true); // Allow all origins in development
    }
  },
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static('uploads'));

// Rate limiting
app.use('/api/auth', rateLimit({ windowMs: 60000, max: 20, message: 'Too many auth requests' }));
app.use('/api/scraper', rateLimit({ windowMs: 60000, max: 5, message: 'Scraping rate limited' }));
app.use('/api/', rateLimit({ windowMs: 60000, max: 200 }));

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/profile', require('./routes/profile'));
app.use('/api/jobs', require('./routes/jobs'));
app.use('/api/applications', require('./routes/applications'));
app.use('/api/referrals', require('./routes/referrals'));
app.use('/api/recruiter', require('./routes/recruiter'));
app.use('/api/analytics', require('./routes/analytics'));
app.use('/api/scraper', require('./routes/scraper'));
app.use('/api/notifications', require('./routes/notifications'));
app.use('/api/saved-jobs', require('./routes/savedJobs'));
app.use('/api/interviews', require('./routes/interviews'));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Scheduled scraping (every 6 hours)
const cron = require('node-cron');
const { scrapeAndSave } = require('./services/scraper');

cron.schedule('0 */6 * * *', async () => {
  console.log('[Cron] Starting scheduled job scrape...');
  try {
    const result = await scrapeAndSave({
      sources: ['internshala', 'naukri'],
      query: 'web development',
      pages: 1
    });
    console.log('[Cron] Scrape complete:', result);
  } catch (error) {
    console.error('[Cron] Scrape failed:', error.message);
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
