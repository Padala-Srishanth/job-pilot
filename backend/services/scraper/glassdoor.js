const puppeteer = require('puppeteer');

/**
 * Scrape jobs from Glassdoor
 */
async function scrapeGlassdoor({ query = 'software engineer', location = 'India', pages = 1 } = {}) {
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

    for (let p = 0; p < pages; p++) {
      const url = `https://www.glassdoor.co.in/Job/india-${query.replace(/\s+/g, '-')}-jobs-SRCH_IL.0,5_IN115_KO6,${6 + query.length}.htm?fromAge=7${p > 0 ? `&p=${p + 1}` : ''}`;
      console.log(`[Glassdoor] Scraping page ${p + 1}: ${url}`);

      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
      await page.waitForSelector('[data-test="jobListing"], .JobsList_wrapper, .react-job-listing', { timeout: 10000 }).catch(() => {});
      await new Promise(r => setTimeout(r, 2000));

      const pageJobs = await page.evaluate(() => {
        const listings = [];
        const cards = document.querySelectorAll('[data-test="jobListing"], .react-job-listing, li[data-id], .JobsList_jobListItem__wjTHv');

        cards.forEach(card => {
          try {
            const titleEl = card.querySelector('[data-test="job-title"], .jobTitle, .job-title a, a[data-test="job-link"]');
            const companyEl = card.querySelector('[data-test="emp-name"], .EmployerProfile_compactEmployerName__9MGcV, .employerName');
            const locationEl = card.querySelector('[data-test="emp-location"], .location, .EmployerProfile_employerLocation__JyhhR');
            const salaryEl = card.querySelector('[data-test="detailSalary"], .salary-estimate, .SalaryEstimate_salaryRange__brHFy');
            const linkEl = card.querySelector('a[data-test="job-link"], a.jobTitle, a.JobCard_trackingLink__GrRYn');

            const title = titleEl?.textContent?.trim();
            const company = companyEl?.textContent?.trim();

            if (title && company) {
              listings.push({
                title,
                company: company.replace(/[\d.]+$/, '').trim(), // Remove rating number
                location: locationEl?.textContent?.trim() || '',
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
          description: `${j.title} at ${j.company}. Location: ${j.location}`,
          requirements: [],
          skills: extractSkills(j.title),
          location: j.location || 'India',
          workType: guessWorkType(j.location + ' ' + j.title),
          jobType: j.title.toLowerCase().includes('intern') ? 'internship' : 'full-time',
          salaryMin, salaryMax, salaryCurrency: 'INR',
          experienceLevel: guessExpLevel(j.title),
          industry: 'Technology',
          source: 'glassdoor',
          applicationUrl: j.link,
          isActive: true, applicantCount: 0,
          postedDate: new Date().toISOString(),
          expiryDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          createdAt: new Date().toISOString(),
          scrapedAt: new Date().toISOString()
        });
      });

      console.log(`[Glassdoor] Page ${p + 1}: Found ${pageJobs.length} jobs`);
      if (p < pages - 1) await new Promise(r => setTimeout(r, 3000));
    }
  } catch (error) {
    console.error('[Glassdoor] Scraping error:', error.message);
  } finally {
    if (browser) await browser.close();
  }

  console.log(`[Glassdoor] Total scraped: ${jobs.length} jobs`);
  return jobs;
}

function parseSalary(str) {
  if (!str) return { salaryMin: 0, salaryMax: 0 };
  const lacs = str.match(/([\d.]+)\s*L?\s*-\s*([\d.]+)\s*L/i);
  if (lacs) return { salaryMin: Math.round(parseFloat(lacs[1]) * 100000), salaryMax: Math.round(parseFloat(lacs[2]) * 100000) };
  const k = str.match(/([\d]+)K?\s*-\s*([\d]+)K/i);
  if (k) return { salaryMin: parseInt(k[1]) * 1000, salaryMax: parseInt(k[2]) * 1000 };
  return { salaryMin: 0, salaryMax: 0 };
}

function extractSkills(title) {
  const t = title.toLowerCase();
  const map = {
    'react': 'react', 'angular': 'angular', 'vue': 'vue', 'node': 'node.js',
    'python': 'python', 'java ': 'java', 'javascript': 'javascript', '.net': '.net',
    'sql': 'sql', 'aws': 'aws', 'docker': 'docker', 'kubernetes': 'kubernetes',
    'android': 'android', 'ios': 'ios', 'flutter': 'flutter',
    'machine learning': 'machine learning', 'data': 'data analysis',
    'full stack': 'javascript', 'frontend': 'react', 'backend': 'node.js'
  };
  const found = [];
  for (const [k, v] of Object.entries(map)) { if (t.includes(k)) found.push(v); }
  return [...new Set(found)].slice(0, 5);
}

function guessWorkType(t) {
  t = t.toLowerCase();
  if (t.includes('remote')) return 'remote';
  if (t.includes('hybrid')) return 'hybrid';
  return 'on-site';
}

function guessExpLevel(title) {
  const t = title.toLowerCase();
  if (t.includes('senior') || t.includes('lead')) return 'senior';
  if (t.includes('junior') || t.includes('intern') || t.includes('fresher')) return 'entry';
  return 'mid';
}

module.exports = { scrapeGlassdoor };
