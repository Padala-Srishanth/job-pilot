const express = require('express');
const auth = require('../middleware/auth');
const { scrapeAndSave, getScrapingStats } = require('../services/scraper');

const router = express.Router();

// Track active scrape to prevent multiple simultaneous runs
let isScrapingActive = false;
let lastScrapeResult = null;

// Trigger a scrape
router.post('/run', auth, async (req, res) => {
  if (isScrapingActive) {
    return res.status(429).json({ message: 'A scrape is already running. Please wait.' });
  }

  const {
    sources = ['internshala', 'naukri'],
    query = 'web development',
    location = '',
    pages = 1
  } = req.body;

  // Limit pages to prevent abuse
  const safePage = Math.min(Math.max(1, pages), 3);

  isScrapingActive = true;

  // Run scrape (don't await - return immediately)
  res.json({ message: 'Scraping started', query, sources, pages: safePage });

  try {
    lastScrapeResult = await scrapeAndSave({ sources, query, location, pages: safePage });
    lastScrapeResult.completedAt = new Date().toISOString();
  } catch (error) {
    lastScrapeResult = { error: error.message, completedAt: new Date().toISOString() };
  } finally {
    isScrapingActive = false;
  }
});

// Trigger a scrape and WAIT for results
router.post('/run-sync', auth, async (req, res) => {
  if (isScrapingActive) {
    return res.status(429).json({ message: 'A scrape is already running. Please wait.' });
  }

  const {
    sources = ['internshala'],
    query = 'web development',
    location = '',
    pages = 1
  } = req.body;

  const safePage = Math.min(Math.max(1, pages), 3);
  isScrapingActive = true;

  try {
    const result = await scrapeAndSave({ sources, query, location, pages: safePage });
    result.completedAt = new Date().toISOString();
    lastScrapeResult = result;
    res.json(result);
  } catch (error) {
    res.status(500).json({ message: 'Scraping failed', error: error.message });
  } finally {
    isScrapingActive = false;
  }
});

// Get scraping status
router.get('/status', auth, async (req, res) => {
  try {
    const stats = await getScrapingStats();
    res.json({
      isActive: isScrapingActive,
      lastResult: lastScrapeResult,
      stats
    });
  } catch (error) {
    res.status(500).json({ message: 'Failed to get status', error: error.message });
  }
});

module.exports = router;
