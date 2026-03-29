/**
 * Job Matcher - AI-enhanced real-time relevance scoring
 * Uses resume AI analysis + job description analysis for intelligent matching
 */

const { analyzeJobDescription } = require('./aiResumeAnalyzer');

// Skill relationship map — related skills boost each other
const SKILL_RELATIONS = {
  'react': ['javascript', 'typescript', 'html', 'css', 'tailwind', 'redux', 'next.js', 'frontend'],
  'angular': ['javascript', 'typescript', 'html', 'css', 'frontend', 'rxjs'],
  'vue': ['javascript', 'typescript', 'html', 'css', 'frontend', 'nuxt'],
  'node.js': ['javascript', 'typescript', 'express', 'backend', 'rest api', 'mongodb'],
  'python': ['django', 'flask', 'pandas', 'numpy', 'data analysis', 'machine learning'],
  'java': ['spring', 'maven', 'backend', 'android', 'microservices'],
  'mongodb': ['node.js', 'express', 'nosql', 'database', 'mongoose'],
  'sql': ['postgresql', 'mysql', 'database', 'data analysis'],
  'aws': ['cloud', 'docker', 'kubernetes', 'devops', 'terraform', 'ci/cd'],
  'docker': ['kubernetes', 'devops', 'ci/cd', 'aws', 'linux'],
  'machine learning': ['python', 'tensorflow', 'pytorch', 'deep learning', 'data analysis', 'nlp'],
  'data analysis': ['python', 'sql', 'pandas', 'tableau', 'power bi', 'excel'],
  'figma': ['ui', 'ux', 'design', 'adobe xd', 'css'],
  'flutter': ['dart', 'mobile', 'android', 'ios'],
  'c++': ['c', 'data structures', 'algorithms', 'system programming'],
};

/**
 * Main scoring function
 */
function calculateRelevanceScore(userProfile, job) {
  const userSkills = (userProfile.resume?.parsedData?.skills || []).map(s => s.toLowerCase());
  const aiAnalysis = userProfile.resume?.parsedData?.aiAnalysis || null;
  const userRoles = (userProfile.preferences?.roles || []).map(r => r.toLowerCase());
  const userLocations = (userProfile.preferences?.locations || []).map(l => l.toLowerCase());
  const jobTitle = (job.title || '').toLowerCase();
  const jobLocation = (job.location || '').toLowerCase();
  const jobDesc = (job.description || '').toLowerCase();

  // AI-analyze the job description for deeper skill extraction
  const jobAnalysis = analyzeJobDescription(job);
  const jobSkills = jobAnalysis.skills.length > 0 ? jobAnalysis.skills : (job.skills || []).map(s => s.toLowerCase());

  const hasResume = userSkills.length > 0;
  const hasPreferences = userRoles.length > 0 || userLocations.length > 0;
  const hasAI = aiAnalysis !== null;

  // === 1. SKILL MATCH (0-100) — weight: 40% ===
  let skillScore = 0;

  // Combine all text from the job for deep skill scanning
  const fullJobText = [jobTitle, jobDesc, ...(job.requirements || []), ...(job.skills || [])].join(' ').toLowerCase();

  // Extract skills from the full job text (catches skills in descriptions even if skills array is empty)
  const detectedJobSkills = [];
  const COMMON_TECH_TERMS = [
    'javascript', 'typescript', 'python', 'java', 'c++', 'c#', 'go', 'rust', 'ruby', 'php', 'swift', 'kotlin', 'dart',
    'react', 'angular', 'vue', 'next.js', 'node.js', 'express', 'django', 'flask', 'spring', 'laravel', '.net',
    'mongodb', 'postgresql', 'mysql', 'redis', 'firebase', 'sql', 'nosql',
    'aws', 'azure', 'gcp', 'docker', 'kubernetes', 'terraform', 'linux', 'ci/cd', 'jenkins',
    'html', 'css', 'tailwind', 'bootstrap', 'sass',
    'git', 'rest api', 'graphql', 'microservices', 'agile', 'scrum',
    'machine learning', 'deep learning', 'tensorflow', 'pytorch', 'nlp', 'data analysis', 'pandas', 'numpy',
    'figma', 'photoshop', 'ui/ux',
    'flutter', 'react native', 'android', 'ios',
    'selenium', 'testing', 'automation', 'manual testing', 'qa', 'quality assurance',
    'devops', 'sre', 'networking', 'security', 'cybersecurity',
    'power bi', 'tableau', 'excel', 'sap', 'salesforce', 'wordpress', 'shopify'
  ];

  for (const term of COMMON_TECH_TERMS) {
    if (fullJobText.includes(term)) detectedJobSkills.push(term);
  }

  // Also include explicitly listed skills
  jobSkills.forEach(s => { if (!detectedJobSkills.includes(s)) detectedJobSkills.push(s); });

  if (hasResume && detectedJobSkills.length > 0) {
    let directMatches = 0;
    let relatedMatches = 0;
    let partialMatches = 0;

    for (const js of detectedJobSkills) {
      if (userSkills.some(us => us === js || us.includes(js) || js.includes(us))) {
        directMatches++;
      } else if (userSkills.some(us => getRelatedSkills(us).includes(js))) {
        relatedMatches++;
      } else if (userSkills.some(us => {
        const words = js.split(/[\s/.-]+/);
        return words.some(w => w.length > 2 && us.includes(w));
      })) {
        partialMatches++;
      }
    }

    const totalSkills = detectedJobSkills.length;
    skillScore = ((directMatches * 1.0 + relatedMatches * 0.5 + partialMatches * 0.3) / totalSkills) * 100;
    skillScore = Math.min(100, skillScore);
  } else if (hasResume) {
    // No tech skills detected at all — score based on title keyword overlap
    const titleWords = jobTitle.split(/[\s,.\-\/()]+/).filter(w => w.length > 3);
    const userSkillWords = userSkills.flatMap(s => s.split(/[\s/.-]+/)).filter(w => w.length > 2);
    const overlap = titleWords.filter(w => userSkillWords.some(us => w.includes(us) || us.includes(w))).length;
    // Use title hash to create variety between different job titles
    const variety = hashString(jobTitle + (job.company || '')) % 20;
    skillScore = Math.min(70, overlap * 20 + variety);
  } else {
    skillScore = 10 + hashString(jobTitle + (job.company || '') + (job.location || '')) % 35;
  }

  // === 2. TITLE/ROLE + DOMAIN MATCH (0-100) — weight: 25% ===
  let titleScore = 0;
  if (hasResume || hasPreferences) {
    const searchTerms = [...userRoles];

    // Use AI-detected domain for smarter role matching
    const userDomain = aiAnalysis?.domain || '';
    const domainTerms = {
      frontend: ['frontend', 'front end', 'ui', 'react', 'angular', 'vue', 'web developer'],
      backend: ['backend', 'back end', 'server', 'api', 'node', 'python developer', 'java developer'],
      fullstack: ['full stack', 'fullstack', 'software engineer', 'web developer', 'mern', 'mean'],
      data: ['data', 'ml', 'machine learning', 'data scientist', 'ai', 'analyst', 'data engineer'],
      mobile: ['mobile', 'android', 'ios', 'flutter', 'react native', 'app developer'],
      devops: ['devops', 'sre', 'platform', 'infrastructure', 'cloud', 'site reliability'],
      design: ['designer', 'ui/ux', 'ux', 'ui designer', 'product designer', 'graphic']
    };

    if (userDomain && domainTerms[userDomain]) {
      searchTerms.push(...domainTerms[userDomain]);
    } else {
      // Fallback: infer from skills
      if (userSkills.includes('react') || userSkills.includes('angular') || userSkills.includes('vue')) searchTerms.push('frontend', 'front end', 'ui');
      if (userSkills.includes('node.js') || userSkills.includes('express') || userSkills.includes('django')) searchTerms.push('backend', 'back end', 'server');
      if (userSkills.includes('python') && userSkills.includes('machine learning')) searchTerms.push('ml', 'data scientist', 'ai');
      if (userSkills.includes('figma') || userSkills.includes('adobe xd')) searchTerms.push('designer', 'ui/ux', 'ux');
      if (userSkills.includes('docker') || userSkills.includes('kubernetes')) searchTerms.push('devops', 'sre', 'platform');
      if (userSkills.includes('flutter') || userSkills.includes('android') || userSkills.includes('ios')) searchTerms.push('mobile', 'app');
    }

    if (searchTerms.length > 0) {
      const titleWords = jobTitle.split(/[\s,.-]+/);
      const matchCount = searchTerms.filter(term =>
        jobTitle.includes(term) || titleWords.some(w => w.includes(term) || term.includes(w))
      ).length;
      titleScore = Math.min(100, (matchCount / Math.max(searchTerms.length, 1)) * 150);
    }

    // Domain match bonus — user domain matches job domain
    if (userDomain && jobAnalysis.domain === userDomain) {
      titleScore = Math.min(100, titleScore + 25);
    }

    // Boost for exact role match
    if (userRoles.some(r => jobTitle.includes(r))) {
      titleScore = Math.min(100, titleScore + 30);
    }
  } else {
    titleScore = 10 + hashString(jobTitle + job.company) % 30;
  }

  // === 3. LOCATION MATCH (0-100) — weight: 15% ===
  let locationScore = 50; // neutral default
  if (userLocations.length > 0) {
    const locationMatch = userLocations.some(loc =>
      jobLocation.includes(loc) || loc.includes(jobLocation.split(',')[0]?.trim())
    );
    const prefWorkType = userProfile.preferences?.workType;

    if (locationMatch) {
      locationScore = 95;
    } else if (job.workType === 'remote' || prefWorkType === 'remote') {
      locationScore = 80;
    } else if (prefWorkType === 'any') {
      locationScore = 60;
    } else {
      locationScore = 20;
    }
  } else if (job.workType === 'remote') {
    locationScore = 65;
  }

  // === 4. JOB TYPE MATCH (0-100) — weight: 10% ===
  let typeScore = 50;
  const prefJobType = userProfile.preferences?.jobType;
  if (prefJobType && prefJobType !== 'any') {
    typeScore = prefJobType === job.jobType ? 100 : 25;
  } else {
    // Slight variety based on job type
    const typeBonus = { 'full-time': 60, 'internship': 55, 'contract': 45, 'part-time': 40 };
    typeScore = typeBonus[job.jobType] || 50;
  }

  // === 5. EXPERIENCE LEVEL MATCH (0-100) — weight: 10% ===
  let expScore = 50;
  const userExp = userProfile.resume?.parsedData?.experience || [];
  const jobExpLevel = jobAnalysis.level || job.experienceLevel || 'entry';

  // Use AI-detected experience data if available
  const aiYears = aiAnalysis?.totalYearsExperience || 0;
  const aiLevel = aiAnalysis?.experienceLevel || null;
  const userYears = aiYears > 0 ? aiYears : userExp.length;

  if (aiLevel || userExp.length > 0) {
    // Level-to-level matching
    const levelOrder = { entry: 0, mid: 1, senior: 2, lead: 3 };
    const userLevelNum = levelOrder[aiLevel || 'entry'] || 0;
    const jobLevelNum = levelOrder[jobExpLevel] || 0;
    const levelDiff = Math.abs(userLevelNum - jobLevelNum);

    if (levelDiff === 0) expScore = 95;
    else if (levelDiff === 1) expScore = 70;
    else if (levelDiff === 2) expScore = 35;
    else expScore = 15;

    // Also check years fit
    const levelMap = { entry: [0, 1], mid: [2, 4], senior: [5, 8], lead: [8, 15] };
    const [minYrs, maxYrs] = levelMap[jobExpLevel] || [0, 2];
    if (userYears >= minYrs && userYears <= maxYrs + 2) {
      expScore = Math.min(100, expScore + 10); // bonus for year fit
    }
  } else {
    const levelScore = { entry: 75, mid: 45, senior: 20, lead: 10 };
    expScore = levelScore[jobExpLevel] || 40;
  }

  // === WEIGHTED TOTAL ===
  const weights = { skill: 0.40, title: 0.25, location: 0.15, type: 0.10, exp: 0.10 };
  let total = (
    skillScore * weights.skill +
    titleScore * weights.title +
    locationScore * weights.location +
    typeScore * weights.type +
    expScore * weights.exp
  );

  // Clamp to 5-98 range (never show 0% or 100%)
  total = Math.round(Math.min(98, Math.max(5, total)));

  return total;
}

/**
 * Get related skills for a given skill
 */
function getRelatedSkills(skill) {
  return SKILL_RELATIONS[skill] || [];
}

/**
 * Simple string hash for consistent pseudo-random variety
 */
function hashString(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

/**
 * Rank jobs by relevance for a user
 */
function rankJobs(userProfile, jobs) {
  return jobs
    .map(job => ({
      ...(job.toObject ? job.toObject() : job),
      relevanceScore: calculateRelevanceScore(userProfile, job)
    }))
    .sort((a, b) => b.relevanceScore - a.relevanceScore);
}

module.exports = { calculateRelevanceScore, rankJobs };
