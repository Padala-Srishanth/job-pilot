const puppeteer = require('puppeteer');

/**
 * Scrape jobs from Indeed India
 */
async function scrapeIndeed({ query = 'react developer', location = 'India', pages = 1 } = {}) {
  const jobs = [];
  let browser;

  try {
    browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu']
    });

    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

    await page.setRequestInterception(true);
    page.on('request', req => {
      if (['image', 'stylesheet', 'font'].includes(req.resourceType())) req.abort();
      else req.continue();
    });

    for (let p = 0; p < pages; p++) {
      const start = p * 10;
      const url = `https://in.indeed.com/jobs?q=${encodeURIComponent(query)}&l=${encodeURIComponent(location)}&start=${start}`;
      console.log(`[Indeed] Scraping page ${p + 1}: ${url}`);

      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
      await page.waitForSelector('.job_seen_beacon, .jobsearch-ResultsList, .resultContent', { timeout: 10000 }).catch(() => {});
      await new Promise(r => setTimeout(r, 2000));

      const pageJobs = await page.evaluate(() => {
        const listings = [];
        const cards = document.querySelectorAll('.job_seen_beacon, .resultContent, .slider_container .slider_item');

        cards.forEach(card => {
          try {
            const titleEl = card.querySelector('h2.jobTitle a, .jobTitle a, h2 a, a[data-jk]');
            const companyEl = card.querySelector('[data-testid="company-name"], .companyName, .company_location .companyName a, span.css-63koeb');
            const locationEl = card.querySelector('[data-testid="text-location"], .companyLocation, .company_location .companyLocation');
            const salaryEl = card.querySelector('.salary-snippet-container, .metadata .salary-snippet, [data-testid="attribute_snippet_testid"]');
            const descEl = card.querySelector('.job-snippet, .heading6 ul, .underShelfFooter');

            const title = titleEl?.textContent?.trim();
            const company = companyEl?.textContent?.trim();

            if (title && company) {
              listings.push({
                title,
                company,
                location: locationEl?.textContent?.trim() || '',
                salary: salaryEl?.textContent?.trim() || '',
                description: descEl?.textContent?.trim() || '',
                link: titleEl?.href || titleEl?.closest('a')?.href || ''
              });
            }
          } catch (e) {}
        });
        return listings;
      });

      pageJobs.forEach(j => {
        const { salaryMin, salaryMax } = parseSalary(j.salary);
        const appUrl = j.link && j.link.startsWith('http') ? j.link : (j.link ? `https://in.indeed.com${j.link}` : '');

        jobs.push({
          title: j.title,
          company: j.company,
          companyLogo: '',
          description: j.description || `${j.title} at ${j.company}`,
          requirements: [],
          skills: extractSkills(j.title),
          location: j.location || location,
          workType: guessWorkType(j.location + ' ' + j.title),
          jobType: guessJobType(j.title),
          salaryMin, salaryMax, salaryCurrency: 'INR',
          experienceLevel: guessExpLevel(j.title),
          industry: 'Technology',
          source: 'indeed',
          applicationUrl: appUrl,
          isActive: true, applicantCount: 0,
          postedDate: new Date().toISOString(),
          expiryDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          createdAt: new Date().toISOString(),
          scrapedAt: new Date().toISOString()
        });
      });

      console.log(`[Indeed] Page ${p + 1}: Found ${pageJobs.length} jobs`);
      if (p < pages - 1) await new Promise(r => setTimeout(r, 3000));
    }
  } catch (error) {
    console.error('[Indeed] Scraping error:', error.message);
  } finally {
    if (browser) await browser.close();
  }

  console.log(`[Indeed] Total scraped: ${jobs.length} jobs`);
  return jobs;
}

function parseSalary(str) {
  if (!str) return { salaryMin: 0, salaryMax: 0 };
  const lacs = str.match(/([\d,.]+)\s*-\s*([\d,.]+)\s*(?:lakh|lac|lpa|l)/i);
  if (lacs) return { salaryMin: Math.round(parseFloat(lacs[1].replace(/,/g, '')) * 100000), salaryMax: Math.round(parseFloat(lacs[2].replace(/,/g, '')) * 100000) };
  const monthly = str.match(/([\d,]+)\s*-\s*([\d,]+)\s*a?\s*month/i);
  if (monthly) return { salaryMin: parseInt(monthly[1].replace(/,/g, '')), salaryMax: parseInt(monthly[2].replace(/,/g, '')) };
  return { salaryMin: 0, salaryMax: 0 };
}

function extractSkills(title) {
  const t = title.toLowerCase();
  const map = {
    'react': 'react', 'angular': 'angular', 'vue': 'vue', 'node': 'node.js',
    'python': 'python', 'java ': 'java', 'javascript': 'javascript', '.net': '.net',
    'sql': 'sql', 'aws': 'aws', 'docker': 'docker', 'devops': 'devops',
    'android': 'android', 'ios': 'ios', 'flutter': 'flutter', 'django': 'django',
    'machine learning': 'machine learning', 'data': 'data analysis',
    'full stack': 'javascript', 'frontend': 'react', 'backend': 'node.js'
  };
  const found = [];
  for (const [k, v] of Object.entries(map)) { if (t.includes(k)) found.push(v); }
  return [...new Set(found)].slice(0, 5);
}

function guessWorkType(text) {
  const t = text.toLowerCase();
  if (t.includes('remote') || t.includes('work from home')) return 'remote';
  if (t.includes('hybrid')) return 'hybrid';
  return 'on-site';
}

function guessJobType(title) {
  const t = title.toLowerCase();
  if (t.includes('intern')) return 'internship';
  if (t.includes('contract') || t.includes('freelance')) return 'contract';
  return 'full-time';
}

function guessExpLevel(title) {
  const t = title.toLowerCase();
  if (t.includes('senior') || t.includes('lead') || t.includes('principal')) return 'senior';
  if (t.includes('junior') || t.includes('intern') || t.includes('fresher') || t.includes('entry')) return 'entry';
  return 'mid';
}

module.exports = { scrapeIndeed };
