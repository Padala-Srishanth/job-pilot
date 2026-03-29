/**
 * JSearch API - Free job search API via RapidAPI
 * Aggregates jobs from LinkedIn, Indeed, Glassdoor, and more
 * Free tier: 200 requests/month
 *
 * Get your key at: https://rapidapi.com/letscrape-6bRBa3QguO5/api/jsearch
 */

const https = require('https');

async function searchJSearch({ query = 'software developer', location = 'India', pages = 1, apiKey } = {}) {
  const key = apiKey || process.env.JSEARCH_API_KEY;
  if (!key) {
    console.log('[JSearch] No API key configured. Set JSEARCH_API_KEY env var.');
    return [];
  }

  const jobs = [];

  for (let p = 1; p <= pages; p++) {
    try {
      console.log(`[JSearch] Fetching page ${p} for "${query}" in "${location}"...`);

      const data = await makeRequest({
        hostname: 'jsearch.p.rapidapi.com',
        path: `/search?query=${encodeURIComponent(query + ' in ' + location)}&page=${p}&num_pages=1`,
        headers: {
          'X-RapidAPI-Key': key,
          'X-RapidAPI-Host': 'jsearch.p.rapidapi.com'
        }
      });

      if (data.data && Array.isArray(data.data)) {
        for (const item of data.data) {
          jobs.push({
            title: item.job_title || '',
            company: item.employer_name || '',
            companyLogo: item.employer_logo || '',
            description: (item.job_description || '').substring(0, 1000),
            requirements: extractRequirements(item.job_description || ''),
            skills: extractSkillsFromDesc(item.job_title + ' ' + (item.job_description || '')),
            location: [item.job_city, item.job_state, item.job_country].filter(Boolean).join(', ') || location,
            workType: item.job_is_remote ? 'remote' : 'on-site',
            jobType: mapJobType(item.job_employment_type),
            salaryMin: item.job_min_salary || 0,
            salaryMax: item.job_max_salary || 0,
            salaryCurrency: item.job_salary_currency || 'USD',
            experienceLevel: mapExpLevel(item.job_required_experience?.experience || ''),
            industry: item.job_publisher || 'Technology',
            source: 'jsearch-' + (item.job_publisher || 'api').toLowerCase().replace(/\s+/g, ''),
            applicationUrl: item.job_apply_link || '',
            isActive: true,
            applicantCount: 0,
            postedDate: item.job_posted_at_datetime_utc || new Date().toISOString(),
            expiryDate: item.job_offer_expiration_datetime_utc || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
            createdAt: new Date().toISOString(),
            scrapedAt: new Date().toISOString()
          });
        }
        console.log(`[JSearch] Page ${p}: Found ${data.data.length} jobs`);
      }

      if (p < pages) await new Promise(r => setTimeout(r, 1000));
    } catch (error) {
      console.error(`[JSearch] Page ${p} error:`, error.message);
    }
  }

  console.log(`[JSearch] Total: ${jobs.length} jobs`);
  return jobs;
}

function makeRequest(options) {
  return new Promise((resolve, reject) => {
    const req = https.request({ ...options, method: 'GET' }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(new Error('Invalid API response'));
        }
      });
    });
    req.on('error', reject);
    req.setTimeout(15000, () => { req.destroy(); reject(new Error('Request timeout')); });
    req.end();
  });
}

function extractRequirements(desc) {
  if (!desc) return [];
  const lines = desc.split('\n').filter(l => l.trim().startsWith('-') || l.trim().startsWith('•') || /^\d+\./.test(l.trim()));
  return lines.slice(0, 8).map(l => l.replace(/^[-•\d.]+\s*/, '').trim()).filter(l => l.length > 10 && l.length < 200);
}

function extractSkillsFromDesc(text) {
  const t = text.toLowerCase();
  const skills = [];
  const map = {
    'react': 'react', 'angular': 'angular', 'vue': 'vue', 'node': 'node.js',
    'python': 'python', 'java ': 'java', 'javascript': 'javascript', 'typescript': 'typescript',
    'django': 'django', 'flask': 'flask', 'spring': 'spring', '.net': '.net', 'c#': 'c#', 'c++': 'c++',
    'golang': 'go', 'rust': 'rust', 'ruby': 'ruby', 'php': 'php', 'swift': 'swift', 'kotlin': 'kotlin',
    'sql': 'sql', 'mongodb': 'mongodb', 'postgresql': 'postgresql', 'redis': 'redis',
    'aws': 'aws', 'azure': 'azure', 'gcp': 'gcp', 'docker': 'docker', 'kubernetes': 'kubernetes',
    'machine learning': 'machine learning', 'deep learning': 'deep learning',
    'tensorflow': 'tensorflow', 'pytorch': 'pytorch', 'pandas': 'pandas',
    'figma': 'figma', 'photoshop': 'photoshop',
    'flutter': 'flutter', 'react native': 'react native',
    'git': 'git', 'linux': 'linux', 'agile': 'agile', 'scrum': 'scrum',
    'tableau': 'tableau', 'power bi': 'power bi', 'excel': 'excel',
    'selenium': 'selenium', 'cypress': 'cypress', 'jest': 'jest'
  };
  for (const [k, v] of Object.entries(map)) { if (t.includes(k)) skills.push(v); }
  return [...new Set(skills)].slice(0, 8);
}

function mapJobType(type) {
  if (!type) return 'full-time';
  const t = type.toUpperCase();
  if (t.includes('INTERN')) return 'internship';
  if (t.includes('CONTRACT') || t.includes('TEMP')) return 'contract';
  if (t.includes('PART')) return 'part-time';
  return 'full-time';
}

function mapExpLevel(exp) {
  if (!exp) return 'mid';
  const t = exp.toLowerCase();
  if (t.includes('entry') || t.includes('junior') || t.includes('intern') || t.includes('no experience')) return 'entry';
  if (t.includes('senior') || t.includes('lead') || t.includes('principal')) return 'senior';
  if (t.includes('director') || t.includes('executive')) return 'lead';
  return 'mid';
}

module.exports = { searchJSearch };
