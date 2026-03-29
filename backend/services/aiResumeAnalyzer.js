/**
 * AI Resume Analyzer
 * Deep analysis of resume text — extracts skills, experience level, strengths,
 * and generates a structured profile for intelligent job matching.
 *
 * Uses OpenAI when available, falls back to enhanced NLP.
 */

let openai = null;
try {
  const OpenAI = require('openai');
  if (process.env.OPENAI_API_KEY) {
    openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }
} catch (e) {}

// ═══════════════════════════════════════════
// COMPREHENSIVE SKILL DATABASE (300+ skills)
// ═══════════════════════════════════════════
const SKILL_DATABASE = {
  // Programming Languages
  languages: [
    'javascript', 'typescript', 'python', 'java', 'c', 'c++', 'c#', 'go', 'golang',
    'rust', 'ruby', 'php', 'swift', 'kotlin', 'scala', 'r', 'matlab', 'perl',
    'dart', 'lua', 'haskell', 'elixir', 'clojure', 'objective-c', 'shell', 'bash',
    'powershell', 'assembly', 'vba', 'groovy', 'julia', 'solidity'
  ],
  // Frontend
  frontend: [
    'react', 'react.js', 'reactjs', 'angular', 'angularjs', 'vue', 'vue.js', 'vuejs',
    'next.js', 'nextjs', 'nuxt', 'nuxt.js', 'svelte', 'gatsby', 'remix',
    'html', 'html5', 'css', 'css3', 'sass', 'scss', 'less', 'stylus',
    'tailwind', 'tailwindcss', 'bootstrap', 'material ui', 'mui', 'chakra ui',
    'styled-components', 'emotion', 'ant design', 'redux', 'zustand', 'mobx',
    'webpack', 'vite', 'parcel', 'rollup', 'babel', 'eslint', 'prettier',
    'storybook', 'jest', 'cypress', 'playwright', 'selenium',
    'jquery', 'backbone', 'ember', 'lit', 'alpine.js', 'htmx'
  ],
  // Backend
  backend: [
    'node.js', 'nodejs', 'express', 'express.js', 'fastify', 'nest.js', 'nestjs', 'koa',
    'django', 'flask', 'fastapi', 'spring', 'spring boot', 'hibernate',
    'asp.net', '.net', '.net core', 'rails', 'ruby on rails', 'laravel', 'symfony',
    'gin', 'echo', 'fiber', 'actix', 'rocket',
    'graphql', 'rest', 'rest api', 'restful', 'grpc', 'websocket', 'socket.io',
    'microservices', 'serverless', 'oauth', 'jwt', 'passport'
  ],
  // Database
  database: [
    'mongodb', 'mongoose', 'postgresql', 'postgres', 'mysql', 'mariadb', 'sqlite',
    'redis', 'memcached', 'elasticsearch', 'solr', 'cassandra', 'dynamodb',
    'firebase', 'firestore', 'supabase', 'prisma', 'sequelize', 'typeorm',
    'sql', 'nosql', 'oracle', 'sql server', 'mssql', 'neo4j', 'couchdb',
    'influxdb', 'timescaledb', 'cockroachdb', 'planetscale'
  ],
  // Cloud & DevOps
  cloud: [
    'aws', 'amazon web services', 'azure', 'gcp', 'google cloud', 'heroku', 'vercel',
    'netlify', 'digitalocean', 'linode', 'cloudflare', 'render',
    'docker', 'kubernetes', 'k8s', 'terraform', 'ansible', 'puppet', 'chef',
    'jenkins', 'github actions', 'gitlab ci', 'circleci', 'travis ci',
    'ci/cd', 'nginx', 'apache', 'caddy', 'linux', 'ubuntu', 'centos',
    'prometheus', 'grafana', 'datadog', 'new relic', 'elk stack', 'splunk',
    's3', 'ec2', 'lambda', 'ecs', 'eks', 'rds', 'cloudfront', 'route53'
  ],
  // Mobile
  mobile: [
    'react native', 'flutter', 'swift', 'swiftui', 'uikit', 'kotlin', 'android',
    'ios', 'xcode', 'android studio', 'expo', 'ionic', 'cordova', 'capacitor',
    'xamarin', 'maui', 'jetpack compose'
  ],
  // AI/ML/Data
  aiml: [
    'machine learning', 'deep learning', 'artificial intelligence', 'ai', 'ml',
    'tensorflow', 'pytorch', 'keras', 'scikit-learn', 'sklearn', 'xgboost',
    'nlp', 'natural language processing', 'computer vision', 'opencv',
    'pandas', 'numpy', 'scipy', 'matplotlib', 'seaborn', 'plotly',
    'jupyter', 'colab', 'hugging face', 'transformers', 'bert', 'gpt',
    'langchain', 'llm', 'rag', 'vector database', 'pinecone', 'weaviate',
    'data analysis', 'data science', 'data engineering', 'data visualization',
    'tableau', 'power bi', 'looker', 'metabase', 'apache spark', 'hadoop',
    'airflow', 'kafka', 'etl', 'data pipeline', 'dbt', 'snowflake', 'databricks'
  ],
  // Design
  design: [
    'figma', 'sketch', 'adobe xd', 'photoshop', 'illustrator', 'indesign',
    'after effects', 'premiere pro', 'canva', 'invision', 'zeplin',
    'ui design', 'ux design', 'ui/ux', 'user research', 'wireframing',
    'prototyping', 'design system', 'responsive design', 'accessibility', 'a11y'
  ],
  // Tools & Methods
  tools: [
    'git', 'github', 'gitlab', 'bitbucket', 'svn',
    'jira', 'confluence', 'trello', 'asana', 'notion', 'linear', 'monday',
    'slack', 'teams', 'zoom',
    'agile', 'scrum', 'kanban', 'waterfall', 'lean', 'devops', 'sre',
    'tdd', 'bdd', 'unit testing', 'integration testing', 'e2e testing',
    'postman', 'insomnia', 'swagger', 'openapi',
    'vs code', 'intellij', 'vim', 'neovim'
  ],
  // Soft skills
  soft: [
    'leadership', 'communication', 'teamwork', 'problem solving', 'problem-solving',
    'critical thinking', 'time management', 'project management', 'mentoring',
    'presentation', 'negotiation', 'stakeholder management', 'cross-functional'
  ]
};

// Flatten all skills for quick lookup
const ALL_SKILLS = Object.values(SKILL_DATABASE).flat();

// Skill normalization map (aliases → canonical name)
const SKILL_ALIASES = {
  'reactjs': 'react', 'react.js': 'react',
  'vuejs': 'vue', 'vue.js': 'vue',
  'nodejs': 'node.js', 'node': 'node.js',
  'nextjs': 'next.js',
  'nestjs': 'nest.js',
  'expressjs': 'express', 'express.js': 'express',
  'golang': 'go',
  'postgres': 'postgresql',
  'k8s': 'kubernetes',
  'amazon web services': 'aws',
  'google cloud': 'gcp',
  'sklearn': 'scikit-learn',
  'objective c': 'objective-c',
  'c sharp': 'c#',
  'cpp': 'c++',
  'js': 'javascript',
  'ts': 'typescript',
  'py': 'python',
  'ml': 'machine learning',
  'dl': 'deep learning',
  'ai': 'artificial intelligence',
  'tailwindcss': 'tailwind',
};

/**
 * AI-powered resume analysis using OpenAI
 */
async function analyzeResumeWithAI(resumeText) {
  if (!openai) return null;

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [{
        role: 'system',
        content: `You are an expert resume analyzer for tech jobs. Extract structured data from the resume text.
Return ONLY valid JSON with this exact structure:
{
  "skills": { "technical": ["skill1", "skill2"], "soft": ["skill1"], "tools": ["tool1"] },
  "experienceLevel": "entry|mid|senior|lead",
  "totalYearsExperience": 0,
  "domain": "frontend|backend|fullstack|data|mobile|devops|design|other",
  "strengths": ["strength1", "strength2", "strength3"],
  "missingCommonSkills": ["skill1", "skill2"],
  "senioritySignals": ["signal1"],
  "summary": "2-sentence professional summary"
}`
      }, {
        role: 'user',
        content: `Analyze this resume:\n\n${resumeText.substring(0, 4000)}`
      }],
      max_tokens: 800,
      temperature: 0.3
    });

    const content = response.choices[0].message.content;
    // Extract JSON from response (handle markdown code blocks)
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    return JSON.parse(content);
  } catch (error) {
    console.error('[AI Analyzer] OpenAI error:', error.message);
    return null;
  }
}

/**
 * Enhanced NLP-based resume analysis (no API needed)
 */
function analyzeResumeWithNLP(resumeText) {
  const text = resumeText.toLowerCase();
  const lines = resumeText.split('\n').map(l => l.trim()).filter(Boolean);

  // 1. Extract ALL skills (comprehensive matching)
  const foundSkills = new Set();

  for (const skill of ALL_SKILLS) {
    // Word boundary matching to avoid false positives
    const escaped = skill.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`(?:^|[\\s,;|/()\\[\\]])${escaped}(?:[\\s,;|/()\\[\\]]|$)`, 'i');
    if (regex.test(text) || text.includes(skill.toLowerCase())) {
      const normalized = SKILL_ALIASES[skill.toLowerCase()] || skill.toLowerCase();
      foundSkills.add(normalized);
    }
  }

  // Also extract skills from common patterns like "Proficient in X, Y, Z"
  const skillPatterns = [
    /(?:proficient|experienced|skilled|expertise|knowledge|familiar)\s+(?:in|with)\s*[:\-]?\s*([^.\n]+)/gi,
    /(?:technologies|tech stack|tools|skills)[:\-]\s*([^.\n]+)/gi,
    /(?:built|developed|created|implemented)\s+(?:with|using)\s+([^.\n]+)/gi
  ];

  for (const pattern of skillPatterns) {
    let match;
    while ((match = pattern.exec(resumeText)) !== null) {
      const fragment = match[1].toLowerCase();
      for (const skill of ALL_SKILLS) {
        if (fragment.includes(skill.toLowerCase())) {
          foundSkills.add(SKILL_ALIASES[skill.toLowerCase()] || skill.toLowerCase());
        }
      }
    }
  }

  // 2. Determine experience level
  const expYears = extractYearsOfExperience(resumeText);
  let experienceLevel = 'entry';
  if (expYears >= 8) experienceLevel = 'lead';
  else if (expYears >= 5) experienceLevel = 'senior';
  else if (expYears >= 2) experienceLevel = 'mid';

  // Seniority signals
  const senioritySignals = [];
  if (/(?:led|lead|managed|mentored|architected|directed)\s/i.test(resumeText)) senioritySignals.push('leadership language');
  if (/(?:senior|sr\.|staff|principal|lead|head|director|vp|chief)/i.test(resumeText)) senioritySignals.push('senior title');
  if (/(?:team of|managed \d|mentored \d)/i.test(resumeText)) senioritySignals.push('team management');
  if (/(?:million|scaled|architecture|system design)/i.test(resumeText)) senioritySignals.push('scale/architecture');

  if (senioritySignals.length >= 2 && experienceLevel === 'mid') experienceLevel = 'senior';

  // 3. Detect domain
  const skills = [...foundSkills];
  const frontendSkills = skills.filter(s => SKILL_DATABASE.frontend.includes(s));
  const backendSkills = skills.filter(s => SKILL_DATABASE.backend.includes(s));
  const mobileSkills = skills.filter(s => SKILL_DATABASE.mobile.includes(s));
  const aimlSkills = skills.filter(s => SKILL_DATABASE.aiml.includes(s));
  const cloudSkills = skills.filter(s => SKILL_DATABASE.cloud.includes(s));
  const designSkills = skills.filter(s => SKILL_DATABASE.design.includes(s));

  let domain = 'other';
  const domainScores = {
    frontend: frontendSkills.length,
    backend: backendSkills.length,
    fullstack: Math.min(frontendSkills.length, backendSkills.length),
    mobile: mobileSkills.length,
    data: aimlSkills.length,
    devops: cloudSkills.length,
    design: designSkills.length
  };
  domainScores.fullstack *= 1.5; // Boost fullstack if both front+back

  const topDomain = Object.entries(domainScores).sort((a, b) => b[1] - a[1])[0];
  if (topDomain[1] > 0) domain = topDomain[0];

  // 4. Identify strengths
  const strengths = [];
  if (frontendSkills.length >= 3) strengths.push('Strong frontend development skills');
  if (backendSkills.length >= 3) strengths.push('Solid backend/API development');
  if (aimlSkills.length >= 3) strengths.push('Data science & ML expertise');
  if (cloudSkills.length >= 3) strengths.push('Cloud & DevOps proficiency');
  if (mobileSkills.length >= 2) strengths.push('Mobile app development');
  if (designSkills.length >= 2) strengths.push('UI/UX design skills');
  if (skills.length >= 15) strengths.push('Broad technology exposure');
  if (senioritySignals.length >= 2) strengths.push('Leadership & mentoring experience');

  // 5. Suggest missing common skills
  const missingCommonSkills = [];
  if (!foundSkills.has('git')) missingCommonSkills.push('git');
  if (frontendSkills.length > 0 && !foundSkills.has('typescript')) missingCommonSkills.push('typescript');
  if (backendSkills.length > 0 && !foundSkills.has('docker')) missingCommonSkills.push('docker');
  if (skills.length > 5 && !foundSkills.has('agile')) missingCommonSkills.push('agile');

  // 6. Categorize skills
  const technical = skills.filter(s =>
    SKILL_DATABASE.languages.includes(s) ||
    SKILL_DATABASE.frontend.includes(s) ||
    SKILL_DATABASE.backend.includes(s) ||
    SKILL_DATABASE.database.includes(s) ||
    SKILL_DATABASE.cloud.includes(s) ||
    SKILL_DATABASE.mobile.includes(s) ||
    SKILL_DATABASE.aiml.includes(s)
  );
  const softSkills = skills.filter(s => SKILL_DATABASE.soft.includes(s));
  const toolSkills = skills.filter(s => SKILL_DATABASE.tools.includes(s) || SKILL_DATABASE.design.includes(s));

  return {
    skills: { technical, soft: softSkills, tools: toolSkills },
    experienceLevel,
    totalYearsExperience: expYears,
    domain,
    strengths: strengths.slice(0, 5),
    missingCommonSkills: missingCommonSkills.slice(0, 5),
    senioritySignals,
    summary: `${domain.charAt(0).toUpperCase() + domain.slice(1)} professional with ${expYears}+ years experience and expertise in ${technical.slice(0, 4).join(', ')}.`
  };
}

function extractYearsOfExperience(text) {
  // Try to find explicit mention of years
  const yearPatterns = [
    /(\d+)\+?\s*(?:years?|yrs?)\s+(?:of\s+)?(?:experience|exp)/i,
    /experience\s*[:\-]?\s*(\d+)\+?\s*(?:years?|yrs?)/i
  ];
  for (const p of yearPatterns) {
    const m = text.match(p);
    if (m) return parseInt(m[1]);
  }

  // Count year ranges in work experience (e.g., "2019-2022")
  const yearRanges = text.match(/20\d{2}\s*[-–to]+\s*(?:20\d{2}|present|current|now)/gi) || [];
  if (yearRanges.length > 0) {
    let totalYears = 0;
    for (const range of yearRanges) {
      const years = range.match(/20\d{2}/g);
      if (years && years.length >= 2) {
        totalYears += parseInt(years[1]) - parseInt(years[0]);
      } else if (range.toLowerCase().includes('present') || range.toLowerCase().includes('current')) {
        const startYear = range.match(/20\d{2}/);
        if (startYear) totalYears += new Date().getFullYear() - parseInt(startYear[0]);
      }
    }
    return Math.max(totalYears, 0);
  }

  return 0;
}

/**
 * Main analysis function — uses AI if available, otherwise enhanced NLP
 */
async function analyzeResume(resumeText) {
  console.log(`[Resume Analyzer] Analyzing resume (${resumeText.length} chars)...`);

  // Try AI first
  const aiResult = await analyzeResumeWithAI(resumeText);
  if (aiResult) {
    console.log('[Resume Analyzer] AI analysis complete');
    return { ...aiResult, method: 'ai' };
  }

  // Fallback to enhanced NLP
  const nlpResult = analyzeResumeWithNLP(resumeText);
  console.log(`[Resume Analyzer] NLP analysis complete — found ${nlpResult.skills.technical.length} technical skills`);
  return { ...nlpResult, method: 'nlp' };
}

/**
 * Analyze a job description and extract structured requirements
 */
function analyzeJobDescription(job) {
  const text = [job.title, job.description, ...(job.requirements || []), ...(job.skills || [])].join(' ').toLowerCase();

  const requiredSkills = new Set();
  for (const skill of ALL_SKILLS) {
    if (text.includes(skill.toLowerCase())) {
      requiredSkills.add(SKILL_ALIASES[skill.toLowerCase()] || skill.toLowerCase());
    }
  }

  // Add the job's explicit skills
  (job.skills || []).forEach(s => requiredSkills.add(s.toLowerCase()));

  let requiredLevel = 'entry';
  if (/(?:senior|sr\.|lead|principal|staff)\s/i.test(text)) requiredLevel = 'senior';
  else if (/(?:mid|intermediate|2-4|3-5)\s/i.test(text)) requiredLevel = 'mid';
  else if (/(?:junior|jr\.|entry|fresher|intern|0-1|0-2)\s/i.test(text)) requiredLevel = 'entry';

  return {
    skills: [...requiredSkills],
    level: requiredLevel,
    isRemote: /remote|work from home|wfh/i.test(text),
    domain: guessDomain(text)
  };
}

function guessDomain(text) {
  if (/frontend|front.end|react|angular|vue|ui/i.test(text)) return 'frontend';
  if (/backend|back.end|server|api|microservice/i.test(text)) return 'backend';
  if (/full.stack|fullstack/i.test(text)) return 'fullstack';
  if (/data|machine learning|ml|ai|analyst/i.test(text)) return 'data';
  if (/mobile|android|ios|flutter|react native/i.test(text)) return 'mobile';
  if (/devops|cloud|sre|infrastructure|platform/i.test(text)) return 'devops';
  if (/design|ui.ux|figma/i.test(text)) return 'design';
  return 'other';
}

module.exports = { analyzeResume, analyzeJobDescription, analyzeResumeWithNLP, ALL_SKILLS, SKILL_ALIASES };
