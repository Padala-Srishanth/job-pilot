const puppeteer = require('puppeteer');

/**
 * Scrape jobs from Naukri.com
 * @param {Object} options - Search options
 * @param {string} options.query - Search keyword (e.g. "react developer", "python")
 * @param {string} options.location - Location filter (e.g. "bangalore", "delhi")
 * @param {number} options.pages - Number of pages to scrape (default 1)
 * @returns {Array} Array of job objects
 */
async function scrapeNaukri({ query = 'react developer', location = '', pages = 1 } = {}) {
  const jobs = [];
  let browser;

  try {
    browser = await puppeteer.launch({
      headless: 'new',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--window-size=1920,1080'
      ]
    });

    const page = await browser.newPage();

    await page.setUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    );

    // Block images and CSS for faster loading
    await page.setRequestInterception(true);
    page.on('request', req => {
      if (['image', 'stylesheet', 'font'].includes(req.resourceType())) {
        req.abort();
      } else {
        req.continue();
      }
    });

    for (let p = 1; p <= pages; p++) {
      // Naukri URL format
      const q = encodeURIComponent(query);
      const loc = location ? `-in-${encodeURIComponent(location)}` : '';
      const pageParam = p > 1 ? `-${p}` : '';
      const url = `https://www.naukri.com/${query.replace(/\s+/g, '-')}-jobs${loc}${pageParam}?k=${q}`;

      console.log(`[Naukri] Scraping page ${p}: ${url}`);

      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });

      // Wait for job cards
      await page.waitForSelector('.srp-jobtuple-wrapper, .jobTuple, article.jobTuple', { timeout: 10000 }).catch(() => {});

      // Give dynamic content time to load
      await new Promise(r => setTimeout(r, 2000));

      const pageJobs = await page.evaluate(() => {
        const listings = [];

        // Naukri uses multiple card formats
        const cards = document.querySelectorAll(
          '.srp-jobtuple-wrapper, article.jobTuple, .cust-job-tuple, [data-job-id]'
        );

        cards.forEach(card => {
          try {
            const titleEl = card.querySelector('.title, a.title, .jobTitle a, .row1 a');
            const companyEl = card.querySelector('.comp-name, .companyInfo a, .row2 .comp-name a, a.subTitle');
            const locationEl = card.querySelector('.loc, .locWdth, .location, .row3 .loc');
            const expEl = card.querySelector('.exp, .experience, .row3 .exp');
            const salaryEl = card.querySelector('.sal, .salary, .row3 .sal');
            const descEl = card.querySelector('.job-desc, .row4, .ellipsis');
            const skillEls = card.querySelectorAll('.tag-li, .dot-gt a, .tags li a, .skill-tag');

            const title = titleEl?.textContent?.trim();
            const company = companyEl?.textContent?.trim();

            if (title && company) {
              const skills = [];
              skillEls.forEach(el => {
                const skill = el.textContent?.trim();
                if (skill && skill.length < 30) skills.push(skill.toLowerCase());
              });

              listings.push({
                title,
                company,
                location: locationEl?.textContent?.trim() || '',
                experience: expEl?.textContent?.trim() || '',
                salary: salaryEl?.textContent?.trim() || '',
                description: descEl?.textContent?.trim() || '',
                skills,
                link: titleEl?.closest('a')?.href || titleEl?.href || ''
              });
            }
          } catch (e) {
            // Skip malformed cards
          }
        });

        return listings;
      });

      // Map to our job schema
      pageJobs.forEach(j => {
        const { salaryMin, salaryMax } = parseSalary(j.salary);
        const expLevel = parseExperience(j.experience);

        jobs.push({
          title: j.title,
          company: j.company,
          companyLogo: '',
          description: j.description || `${j.title} at ${j.company}. Experience: ${j.experience}`,
          requirements: j.experience ? [`${j.experience} experience`] : [],
          skills: j.skills.length > 0 ? j.skills : extractSkillsFromTitle(j.title),
          location: j.location || 'India',
          workType: j.location.toLowerCase().includes('remote') ? 'remote'
            : j.location.toLowerCase().includes('hybrid') ? 'hybrid' : 'on-site',
          jobType: j.title.toLowerCase().includes('intern') ? 'internship' : 'full-time',
          salaryMin,
          salaryMax,
          salaryCurrency: 'INR',
          experienceLevel: expLevel,
          industry: guessIndustry(j.title),
          source: 'naukri',
          applicationUrl: j.link,
          isActive: true,
          applicantCount: 0,
          postedDate: new Date().toISOString(),
          expiryDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          createdAt: new Date().toISOString(),
          scrapedAt: new Date().toISOString()
        });
      });

      console.log(`[Naukri] Page ${p}: Found ${pageJobs.length} jobs`);

      if (p < pages) await new Promise(r => setTimeout(r, 3000));
    }
  } catch (error) {
    console.error('[Naukri] Scraping error:', error.message);
  } finally {
    if (browser) await browser.close();
  }

  console.log(`[Naukri] Total scraped: ${jobs.length} jobs`);
  return jobs;
}

function parseSalary(salaryStr) {
  if (!salaryStr) return { salaryMin: 0, salaryMax: 0 };

  // Naukri shows salary like "4-8 Lacs PA" or "Not disclosed"
  const lacMatch = salaryStr.match(/([\d.]+)\s*-\s*([\d.]+)\s*(?:Lacs|LPA|L)/i);
  if (lacMatch) {
    return {
      salaryMin: Math.round(parseFloat(lacMatch[1]) * 100000),
      salaryMax: Math.round(parseFloat(lacMatch[2]) * 100000)
    };
  }

  const singleLac = salaryStr.match(/([\d.]+)\s*(?:Lacs|LPA|L)/i);
  if (singleLac) {
    const val = Math.round(parseFloat(singleLac[1]) * 100000);
    return { salaryMin: val, salaryMax: val };
  }

  return { salaryMin: 0, salaryMax: 0 };
}

function parseExperience(expStr) {
  if (!expStr) return 'entry';
  const match = expStr.match(/(\d+)/);
  if (!match) return 'entry';
  const years = parseInt(match[1]);
  if (years <= 1) return 'entry';
  if (years <= 4) return 'mid';
  if (years <= 7) return 'senior';
  return 'lead';
}

function extractSkillsFromTitle(title) {
  const t = title.toLowerCase();
  const skillMap = {
    'react': 'react', 'angular': 'angular', 'vue': 'vue', 'node': 'node.js',
    'python': 'python', 'java ': 'java', 'javascript': 'javascript',
    'django': 'django', 'flask': 'flask', '.net': '.net', 'c#': 'c#',
    'sql': 'sql', 'mongodb': 'mongodb', 'aws': 'aws', 'docker': 'docker',
    'devops': 'devops', 'android': 'android', 'ios': 'ios', 'flutter': 'flutter',
    'machine learning': 'machine learning', 'data': 'data analysis',
    'full stack': 'javascript', 'frontend': 'react', 'backend': 'node.js'
  };
  const found = [];
  for (const [keyword, skill] of Object.entries(skillMap)) {
    if (t.includes(keyword)) found.push(skill);
  }
  return [...new Set(found)].slice(0, 5);
}

function guessIndustry(title) {
  const t = title.toLowerCase();
  if (t.includes('data') || t.includes('ml') || t.includes('ai')) return 'Data Science';
  if (t.includes('design') || t.includes('ui')) return 'Design';
  if (t.includes('devops') || t.includes('cloud')) return 'Cloud Computing';
  if (t.includes('mobile') || t.includes('android') || t.includes('ios')) return 'Mobile';
  return 'Technology';
}

module.exports = { scrapeNaukri };
