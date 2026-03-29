const puppeteer = require('puppeteer');

/**
 * Scrape jobs from Foundit (formerly Monster India)
 */
async function scrapeFoundit({ query = 'software developer', location = '', pages = 1 } = {}) {
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
      if (['image', 'font'].includes(req.resourceType())) req.abort();
      else req.continue();
    });

    for (let p = 1; p <= pages; p++) {
      const locParam = location ? `&locations=${encodeURIComponent(location)}` : '';
      const url = `https://www.foundit.in/srp/results?query=${encodeURIComponent(query)}${locParam}&page=${p}`;
      console.log(`[Foundit] Scraping page ${p}: ${url}`);

      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
      await page.waitForSelector('.srpResultCardContainer, .card-apply-content, .jobTuple', { timeout: 10000 }).catch(() => {});
      await new Promise(r => setTimeout(r, 2000));

      const pageJobs = await page.evaluate(() => {
        const listings = [];
        const cards = document.querySelectorAll('.srpResultCardContainer, .card-apply-content, .jobTuple, [class*="jobTuple"]');

        cards.forEach(card => {
          try {
            const titleEl = card.querySelector('.jobTitle, .card-title a, h3 a, [class*="jobTitle"]');
            const companyEl = card.querySelector('.companyName, .card-company a, [class*="companyName"]');
            const locationEl = card.querySelector('.location, .card-location, [class*="location"]');
            const expEl = card.querySelector('.experience, [class*="experience"]');
            const salaryEl = card.querySelector('.salary, [class*="salary"]');
            const linkEl = card.querySelector('a[href*="/job/"], .jobTitle a, h3 a');

            const title = titleEl?.textContent?.trim();
            const company = companyEl?.textContent?.trim();

            if (title && company) {
              listings.push({
                title,
                company,
                location: locationEl?.textContent?.trim() || '',
                experience: expEl?.textContent?.trim() || '',
                salary: salaryEl?.textContent?.trim() || '',
                link: linkEl?.href || ''
              });
            }
          } catch (e) {}
        });
        return listings;
      });

      pageJobs.forEach(j => {
        const { salaryMin, salaryMax } = parseSalary(j.salary);
        jobs.push({
          title: j.title,
          company: j.company,
          companyLogo: '',
          description: `${j.title} at ${j.company}. ${j.experience ? 'Exp: ' + j.experience : ''}`,
          requirements: j.experience ? [j.experience] : [],
          skills: extractSkills(j.title),
          location: j.location || 'India',
          workType: guessWorkType(j.location + ' ' + j.title),
          jobType: j.title.toLowerCase().includes('intern') ? 'internship' : 'full-time',
          salaryMin, salaryMax, salaryCurrency: 'INR',
          experienceLevel: guessExpLevel(j.experience || j.title),
          industry: 'Technology',
          source: 'foundit',
          applicationUrl: j.link,
          isActive: true, applicantCount: 0,
          postedDate: new Date().toISOString(),
          expiryDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          createdAt: new Date().toISOString(),
          scrapedAt: new Date().toISOString()
        });
      });

      console.log(`[Foundit] Page ${p}: Found ${pageJobs.length} jobs`);
      if (p < pages) await new Promise(r => setTimeout(r, 3000));
    }
  } catch (error) {
    console.error('[Foundit] Scraping error:', error.message);
  } finally {
    if (browser) await browser.close();
  }

  console.log(`[Foundit] Total scraped: ${jobs.length} jobs`);
  return jobs;
}

function parseSalary(str) {
  if (!str) return { salaryMin: 0, salaryMax: 0 };
  const lacs = str.match(/([\d.]+)\s*-\s*([\d.]+)\s*(?:Lacs|LPA|L)/i);
  if (lacs) return { salaryMin: Math.round(parseFloat(lacs[1]) * 100000), salaryMax: Math.round(parseFloat(lacs[2]) * 100000) };
  return { salaryMin: 0, salaryMax: 0 };
}

function extractSkills(title) {
  const t = title.toLowerCase();
  const map = {
    'react': 'react', 'angular': 'angular', 'node': 'node.js', 'python': 'python',
    'java ': 'java', 'javascript': 'javascript', '.net': '.net', 'sql': 'sql',
    'aws': 'aws', 'docker': 'docker', 'android': 'android', 'ios': 'ios',
    'machine learning': 'machine learning', 'data': 'data analysis',
    'full stack': 'javascript', 'frontend': 'react', 'backend': 'node.js'
  };
  const found = [];
  for (const [k, v] of Object.entries(map)) { if (t.includes(k)) found.push(v); }
  return [...new Set(found)].slice(0, 5);
}

function guessWorkType(t) { t = t.toLowerCase(); return t.includes('remote') ? 'remote' : t.includes('hybrid') ? 'hybrid' : 'on-site'; }
function guessExpLevel(t) { t = t.toLowerCase(); const m = t.match(/(\d+)/); if (!m) return 'entry'; const y = parseInt(m[1]); return y <= 1 ? 'entry' : y <= 4 ? 'mid' : 'senior'; }

module.exports = { scrapeFoundit };
