const puppeteer = require('puppeteer');

/**
 * Scrape jobs from TimesJobs
 */
async function scrapeTimesJobs({ query = 'software developer', pages = 1 } = {}) {
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
      const url = `https://www.timesjobs.com/candidate/job-search.html?searchType=personal498&from=submit&txtKeywords=${encodeURIComponent(query)}&sequence=${p}&startPage=${p}`;
      console.log(`[TimesJobs] Scraping page ${p}: ${url}`);

      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
      await page.waitForSelector('.job-bx, .srp-jobtuple, .clearfix.job-bx-table', { timeout: 10000 }).catch(() => {});
      await new Promise(r => setTimeout(r, 2000));

      const pageJobs = await page.evaluate(() => {
        const listings = [];
        const cards = document.querySelectorAll('.job-bx, .clearfix.job-bx-table');

        cards.forEach(card => {
          try {
            const titleEl = card.querySelector('h2 a, .heading a, header h2 a');
            const companyEl = card.querySelector('.joblist-comp-name, h3.joblist-comp-name, .comp-name');
            const locationEl = card.querySelector('.location-text, span[title], .loc');
            const expEl = card.querySelector('.exp, .experience');
            const salaryEl = card.querySelector('.salary, .sal');
            const skillEls = card.querySelectorAll('.srp-skills span, .more-skills-list li');

            const title = titleEl?.textContent?.trim();
            let company = companyEl?.textContent?.trim();
            if (company) company = company.split('\n')[0].trim();

            if (title && company && title.length > 3) {
              const skills = [];
              skillEls.forEach(el => {
                const s = el.textContent?.trim();
                if (s && s.length < 30) skills.push(s.toLowerCase());
              });

              listings.push({
                title,
                company,
                location: locationEl?.textContent?.trim() || '',
                experience: expEl?.textContent?.trim() || '',
                salary: salaryEl?.textContent?.trim() || '',
                skills,
                link: titleEl?.href || ''
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
          description: `${j.title} at ${j.company}. ${j.experience ? 'Exp: ' + j.experience : ''}`,
          requirements: j.experience ? [j.experience] : [],
          skills: j.skills.length > 0 ? j.skills : extractSkills(j.title),
          location: j.location || 'India',
          workType: guessWorkType(j.location + ' ' + j.title),
          jobType: j.title.toLowerCase().includes('intern') ? 'internship' : 'full-time',
          salaryMin: 0, salaryMax: 0, salaryCurrency: 'INR',
          experienceLevel: guessExpLevel(j.experience || j.title),
          industry: 'Technology',
          source: 'timesjobs',
          applicationUrl: j.link,
          isActive: true, applicantCount: 0,
          postedDate: new Date().toISOString(),
          expiryDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          createdAt: new Date().toISOString(),
          scrapedAt: new Date().toISOString()
        });
      });

      console.log(`[TimesJobs] Page ${p}: Found ${pageJobs.length} jobs`);
      if (p < pages) await new Promise(r => setTimeout(r, 2000));
    }
  } catch (error) {
    console.error('[TimesJobs] Scraping error:', error.message);
  } finally {
    if (browser) await browser.close();
  }

  console.log(`[TimesJobs] Total scraped: ${jobs.length} jobs`);
  return jobs;
}

function extractSkills(title) {
  const t = title.toLowerCase();
  const map = {
    'react': 'react', 'angular': 'angular', 'node': 'node.js', 'python': 'python',
    'java ': 'java', 'javascript': 'javascript', '.net': '.net', 'sql': 'sql',
    'aws': 'aws', 'docker': 'docker', 'android': 'android', 'ios': 'ios',
    'machine learning': 'machine learning', 'full stack': 'javascript'
  };
  const found = [];
  for (const [k, v] of Object.entries(map)) { if (t.includes(k)) found.push(v); }
  return [...new Set(found)].slice(0, 5);
}

function guessWorkType(t) { t = t.toLowerCase(); return t.includes('remote') ? 'remote' : t.includes('hybrid') ? 'hybrid' : 'on-site'; }
function guessExpLevel(t) { t = t.toLowerCase(); const m = t.match(/(\d+)/); if (!m) return 'entry'; const y = parseInt(m[1]); return y <= 1 ? 'entry' : y <= 4 ? 'mid' : 'senior'; }

module.exports = { scrapeTimesJobs };
