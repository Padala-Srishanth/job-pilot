const puppeteer = require('puppeteer');

/**
 * Scrape jobs from LinkedIn (public job listings - no login required)
 * Uses LinkedIn's public job search page
 */
async function scrapeLinkedIn({ query = 'react developer', location = 'India', pages = 1 } = {}) {
  const jobs = [];
  let browser;

  try {
    browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu']
    });

    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

    for (let p = 0; p < pages; p++) {
      const start = p * 25;
      const url = `https://www.linkedin.com/jobs/search?keywords=${encodeURIComponent(query)}&location=${encodeURIComponent(location)}&start=${start}`;
      console.log(`[LinkedIn] Scraping page ${p + 1}: ${url}`);

      await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
      await page.waitForSelector('.jobs-search__results-list, .base-search-card', { timeout: 10000 }).catch(() => {});
      await autoScroll(page);

      const pageJobs = await page.evaluate(() => {
        const listings = [];
        const cards = document.querySelectorAll('.base-search-card, .job-search-card, .base-card');

        cards.forEach(card => {
          try {
            const titleEl = card.querySelector('.base-search-card__title, .sr-only, h3');
            const companyEl = card.querySelector('.base-search-card__subtitle, .hidden-nested-link, h4 a');
            const locationEl = card.querySelector('.job-search-card__location, .base-search-card__metadata span');
            const linkEl = card.querySelector('a.base-card__full-link, a.base-search-card__full-link, a');
            const timeEl = card.querySelector('time, .job-search-card__listdate');
            const salaryEl = card.querySelector('.job-search-card__salary-info');

            const title = titleEl?.textContent?.trim();
            const company = companyEl?.textContent?.trim();

            if (title && company && title.length > 2) {
              listings.push({
                title,
                company,
                location: locationEl?.textContent?.trim() || '',
                link: linkEl?.href || '',
                date: timeEl?.getAttribute('datetime') || timeEl?.textContent?.trim() || '',
                salary: salaryEl?.textContent?.trim() || ''
              });
            }
          } catch (e) {}
        });
        return listings;
      });

      pageJobs.forEach(j => {
        jobs.push({
          title: j.title,
          company: j.company,
          companyLogo: '',
          description: `${j.title} at ${j.company}. Location: ${j.location}`,
          requirements: [],
          skills: extractSkills(j.title),
          location: j.location || location,
          workType: guessWorkType(j.location, j.title),
          jobType: guessJobType(j.title),
          salaryMin: 0, salaryMax: 0, salaryCurrency: 'INR',
          experienceLevel: guessExpLevel(j.title),
          industry: guessIndustry(j.title),
          source: 'linkedin',
          applicationUrl: j.link,
          isActive: true, applicantCount: 0,
          postedDate: j.date || new Date().toISOString(),
          expiryDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          createdAt: new Date().toISOString(),
          scrapedAt: new Date().toISOString()
        });
      });

      console.log(`[LinkedIn] Page ${p + 1}: Found ${pageJobs.length} jobs`);
      if (p < pages - 1) await new Promise(r => setTimeout(r, 3000));
    }
  } catch (error) {
    console.error('[LinkedIn] Scraping error:', error.message);
  } finally {
    if (browser) await browser.close();
  }

  console.log(`[LinkedIn] Total scraped: ${jobs.length} jobs`);
  return jobs;
}

async function autoScroll(page) {
  await page.evaluate(async () => {
    await new Promise(resolve => {
      let totalHeight = 0;
      const distance = 400;
      const timer = setInterval(() => {
        window.scrollBy(0, distance);
        totalHeight += distance;
        if (totalHeight >= document.body.scrollHeight || totalHeight > 5000) {
          clearInterval(timer);
          resolve();
        }
      }, 200);
    });
  });
}

function extractSkills(title) {
  const t = title.toLowerCase();
  const map = {
    'react': 'react', 'angular': 'angular', 'vue': 'vue', 'node': 'node.js',
    'python': 'python', 'java ': 'java', 'javascript': 'javascript', 'typescript': 'typescript',
    'django': 'django', 'flask': 'flask', '.net': '.net', 'c#': 'c#', 'c++': 'c++',
    'golang': 'go', 'rust': 'rust', 'ruby': 'ruby', 'php': 'php', 'swift': 'swift',
    'kotlin': 'kotlin', 'flutter': 'flutter', 'sql': 'sql', 'mongodb': 'mongodb',
    'aws': 'aws', 'azure': 'azure', 'gcp': 'gcp', 'docker': 'docker', 'kubernetes': 'kubernetes',
    'machine learning': 'machine learning', 'data scien': 'data analysis',
    'devops': 'devops', 'fullstack': 'javascript', 'full stack': 'javascript',
    'frontend': 'react', 'backend': 'node.js', 'android': 'android', 'ios': 'ios'
  };
  const found = [];
  for (const [k, v] of Object.entries(map)) { if (t.includes(k)) found.push(v); }
  return [...new Set(found)].slice(0, 5);
}

function guessWorkType(loc, title) {
  const t = (loc + ' ' + title).toLowerCase();
  if (t.includes('remote')) return 'remote';
  if (t.includes('hybrid')) return 'hybrid';
  return 'on-site';
}

function guessJobType(title) {
  const t = title.toLowerCase();
  if (t.includes('intern')) return 'internship';
  if (t.includes('contract') || t.includes('freelance')) return 'contract';
  if (t.includes('part time') || t.includes('part-time')) return 'part-time';
  return 'full-time';
}

function guessExpLevel(title) {
  const t = title.toLowerCase();
  if (t.includes('senior') || t.includes('sr.') || t.includes('lead') || t.includes('principal')) return 'senior';
  if (t.includes('junior') || t.includes('jr.') || t.includes('entry') || t.includes('intern') || t.includes('fresher')) return 'entry';
  return 'mid';
}

function guessIndustry(title) {
  const t = title.toLowerCase();
  if (t.includes('data') || t.includes('ml') || t.includes('ai')) return 'Data Science';
  if (t.includes('design') || t.includes('ui')) return 'Design';
  if (t.includes('devops') || t.includes('cloud') || t.includes('sre')) return 'Cloud Computing';
  if (t.includes('mobile') || t.includes('android') || t.includes('ios')) return 'Mobile';
  if (t.includes('security') || t.includes('cyber')) return 'Cybersecurity';
  return 'Technology';
}

module.exports = { scrapeLinkedIn };
