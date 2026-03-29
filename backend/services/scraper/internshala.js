const puppeteer = require('puppeteer');

/**
 * Scrape internships from Internshala
 * @param {Object} options - Search options
 * @param {string} options.query - Search keyword (e.g. "web development", "data science")
 * @param {number} options.pages - Number of pages to scrape (default 1)
 * @returns {Array} Array of job objects
 */
async function scrapeInternshala({ query = 'web-development', pages = 1 } = {}) {
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

    // Set a realistic user agent
    await page.setUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    );

    // Internshala URL format
    const slug = query.toLowerCase().replace(/\s+/g, '-');
    const baseUrl = `https://internshala.com/internships/${slug}-internship`;

    for (let p = 1; p <= pages; p++) {
      const url = p === 1 ? baseUrl : `${baseUrl}/page-${p}`;
      console.log(`[Internshala] Scraping page ${p}: ${url}`);

      await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });

      // Wait for internship listings to load
      await page.waitForSelector('.internship_meta, .individual_internship, #internship_list_container_1', { timeout: 10000 }).catch(() => {});

      // Extract job data from the page
      const pageJobs = await page.evaluate(() => {
        const listings = [];
        const cards = document.querySelectorAll('.individual_internship, .internship_meta');

        cards.forEach(card => {
          try {
            const titleEl = card.querySelector('.job-internship-name a, .profile a, h3 a');
            const companyEl = card.querySelector('.company_name a, .company-name a, h4 a');
            const locationEl = card.querySelector('.location_link a, #location_names a, .locations a');
            const stipendEl = card.querySelector('.stipend, .desktop-text .stipend');
            const durationEl = card.querySelector('.other_detail_item:first-child .item_body, .duration');
            const startDateEl = card.querySelector('.start_immediately_desktop, .start-date');
            const applyLink = card.querySelector('.job-internship-name a, .profile a, h3 a');

            const title = titleEl?.textContent?.trim();
            const company = companyEl?.textContent?.trim();

            if (title && company) {
              listings.push({
                title,
                company,
                location: locationEl?.textContent?.trim() || 'India',
                stipend: stipendEl?.textContent?.trim() || '',
                duration: durationEl?.textContent?.trim() || '',
                startDate: startDateEl?.textContent?.trim() || '',
                link: applyLink?.href || '',
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
        const salaryMatch = j.stipend.match(/[\d,]+/g);
        const salaryMin = salaryMatch ? parseInt(salaryMatch[0].replace(/,/g, '')) : 0;
        const salaryMax = salaryMatch && salaryMatch[1] ? parseInt(salaryMatch[1].replace(/,/g, '')) : salaryMin;

        jobs.push({
          title: j.title,
          company: j.company,
          companyLogo: '',
          description: `${j.title} internship at ${j.company}. Duration: ${j.duration}. ${j.startDate}`,
          requirements: [],
          skills: extractSkillsFromTitle(j.title),
          location: j.location,
          workType: j.location.toLowerCase().includes('work from home') ? 'remote' : 'on-site',
          jobType: 'internship',
          salaryMin,
          salaryMax,
          salaryCurrency: 'INR',
          experienceLevel: 'entry',
          industry: guessIndustry(j.title),
          source: 'internshala',
          applicationUrl: j.link,
          isActive: true,
          applicantCount: 0,
          postedDate: new Date().toISOString(),
          expiryDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          createdAt: new Date().toISOString(),
          scrapedAt: new Date().toISOString()
        });
      });

      console.log(`[Internshala] Page ${p}: Found ${pageJobs.length} internships`);

      // Small delay between pages to be respectful
      if (p < pages) await new Promise(r => setTimeout(r, 2000));
    }
  } catch (error) {
    console.error('[Internshala] Scraping error:', error.message);
  } finally {
    if (browser) await browser.close();
  }

  console.log(`[Internshala] Total scraped: ${jobs.length} internships`);
  return jobs;
}

function extractSkillsFromTitle(title) {
  const t = title.toLowerCase();
  const skillMap = {
    'react': 'react', 'angular': 'angular', 'vue': 'vue', 'node': 'node.js',
    'python': 'python', 'java ': 'java', 'javascript': 'javascript', 'typescript': 'typescript',
    'django': 'django', 'flask': 'flask', 'spring': 'spring',
    'machine learning': 'machine learning', 'ml': 'machine learning',
    'data science': 'data analysis', 'data analy': 'data analysis',
    'web dev': 'html', 'frontend': 'react', 'backend': 'node.js',
    'full stack': 'javascript', 'fullstack': 'javascript',
    'android': 'java', 'ios': 'swift', 'flutter': 'flutter',
    'ui/ux': 'figma', 'design': 'figma', 'graphic': 'photoshop',
    'content': 'content writing', 'marketing': 'digital marketing',
    'sql': 'sql', 'database': 'sql', 'mongodb': 'mongodb',
    'aws': 'aws', 'cloud': 'aws', 'devops': 'docker',
    'cyber': 'cybersecurity', 'security': 'cybersecurity'
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
  if (t.includes('market') || t.includes('content')) return 'Marketing';
  if (t.includes('finance') || t.includes('account')) return 'Finance';
  return 'Technology';
}

module.exports = { scrapeInternshala };
