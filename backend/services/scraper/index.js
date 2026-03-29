const { scrapeInternshala } = require('./internshala');
const { scrapeNaukri } = require('./naukri');
const { scrapeLinkedIn } = require('./linkedin');
const { scrapeIndeed } = require('./indeed');
const { scrapeGlassdoor } = require('./glassdoor');
const { scrapeFoundit } = require('./foundit');
const { scrapeTimesJobs } = require('./timesjobs');
const { db } = require('../../config/firebase');

const SCRAPERS = {
  internshala: scrapeInternshala,
  naukri: scrapeNaukri,
  linkedin: scrapeLinkedIn,
  indeed: scrapeIndeed,
  glassdoor: scrapeGlassdoor,
  foundit: scrapeFoundit,
  timesjobs: scrapeTimesJobs
};

/**
 * Scrape jobs from selected sources and save to Firestore
 */
async function scrapeAndSave({ sources = ['internshala'], query = 'web development', location = 'India', pages = 1, getCancelled = () => false } = {}) {
  const results = { total: 0, new: 0, duplicates: 0, errors: [], bySource: {} };

  for (const source of sources) {
    // Check if cancelled
    if (getCancelled()) {
      console.log(`[Scraper] Cancelled — stopping before ${source}`);
      break;
    }

    const scraperFn = SCRAPERS[source];
    if (!scraperFn) {
      results.errors.push({ source, error: `Unknown source: ${source}` });
      continue;
    }

    let scraped = [];

    try {
      console.log(`\n[Scraper] Starting ${source} scrape for "${query}"...`);
      scraped = await scraperFn({ query, location, pages });

      let newCount = 0;
      let dupCount = 0;

      // Batch writes for performance (Firestore max 500 per batch)
      const batchSize = 400;
      for (let i = 0; i < scraped.length; i += batchSize) {
        const chunk = scraped.slice(i, i + batchSize);
        const batch = db.batch();
        let batchNew = 0;

        for (const job of chunk) {
          const isDuplicate = await checkDuplicate(job.title, job.company, source);
          if (isDuplicate) {
            dupCount++;
            continue;
          }
          const ref = db.collection('jobs').doc();
          batch.set(ref, job);
          batchNew++;
        }

        if (batchNew > 0) await batch.commit();
        newCount += batchNew;
      }

      results.bySource[source] = { scraped: scraped.length, new: newCount, duplicates: dupCount };
      results.total += scraped.length;
      results.new += newCount;
      results.duplicates += dupCount;

      console.log(`[Scraper] ${source}: ${scraped.length} scraped, ${newCount} new, ${dupCount} duplicates`);
    } catch (error) {
      console.error(`[Scraper] ${source} failed:`, error.message);
      results.errors.push({ source, error: error.message });
    }
  }

  console.log(`\n[Scraper] Done! Total: ${results.total}, New: ${results.new}, Duplicates: ${results.duplicates}`);
  return results;
}

async function checkDuplicate(title, company, source) {
  const snapshot = await db.collection('jobs')
    .where('title', '==', title)
    .where('company', '==', company)
    .where('source', '==', source)
    .limit(1)
    .get();
  return !snapshot.empty;
}

async function getScrapingStats() {
  const snapshot = await db.collection('jobs').get();
  const jobs = snapshot.docs.map(d => d.data());

  const bySource = {};
  jobs.forEach(j => {
    const src = j.source || 'manual';
    bySource[src] = (bySource[src] || 0) + 1;
  });

  const scraped = jobs.filter(j => j.scrapedAt);
  const lastScraped = scraped.length > 0
    ? scraped.sort((a, b) => (b.scrapedAt || '').localeCompare(a.scrapedAt || ''))[0].scrapedAt
    : null;

  return {
    totalJobs: jobs.length,
    bySource,
    availableSources: Object.keys(SCRAPERS),
    lastScrapedAt: lastScraped,
    scrapedJobs: scraped.length
  };
}

module.exports = { scrapeAndSave, getScrapingStats, SCRAPERS };
