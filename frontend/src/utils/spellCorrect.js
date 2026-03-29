/**
 * Simple spell-correction for job search queries
 * Uses a dictionary of common job-related terms and Levenshtein distance
 */

const JOB_DICTIONARY = [
  // Roles
  'developer', 'engineer', 'designer', 'analyst', 'manager', 'intern', 'architect',
  'consultant', 'administrator', 'specialist', 'coordinator', 'associate', 'executive',
  'scientist', 'researcher', 'tester', 'lead', 'director', 'officer',
  // Tech
  'software', 'frontend', 'backend', 'fullstack', 'full stack', 'web', 'mobile', 'cloud',
  'devops', 'database', 'network', 'security', 'cybersecurity', 'blockchain',
  // Languages & frameworks
  'javascript', 'typescript', 'python', 'java', 'react', 'angular', 'vue', 'node',
  'django', 'flask', 'spring', 'dotnet', '.net', 'ruby', 'golang', 'rust', 'swift',
  'kotlin', 'flutter', 'android', 'ios', 'php', 'laravel', 'wordpress',
  // Data
  'data', 'machine learning', 'artificial intelligence', 'deep learning',
  'data science', 'data analysis', 'data engineer', 'business intelligence',
  'tensorflow', 'pytorch', 'pandas', 'numpy', 'tableau', 'power bi',
  // Cloud & tools
  'aws', 'azure', 'gcp', 'docker', 'kubernetes', 'terraform', 'jenkins', 'linux',
  'mongodb', 'postgresql', 'mysql', 'redis', 'elasticsearch', 'firebase',
  'sql', 'nosql', 'graphql', 'rest', 'api',
  // Design
  'figma', 'photoshop', 'illustrator', 'ui', 'ux', 'graphic', 'product',
  // Other fields
  'marketing', 'digital marketing', 'content', 'sales', 'finance', 'accounting',
  'human resources', 'operations', 'project management', 'business',
  // Locations
  'bangalore', 'bengaluru', 'mumbai', 'delhi', 'hyderabad', 'chennai', 'pune',
  'kolkata', 'noida', 'gurgaon', 'gurugram', 'ahmedabad', 'jaipur',
  'remote', 'work from home', 'hybrid', 'on-site', 'onsite',
  'india', 'usa', 'london', 'singapore', 'dubai', 'canada', 'germany',
  // Common words
  'development', 'programming', 'coding', 'testing', 'automation', 'integration',
  'deployment', 'maintenance', 'support', 'training', 'internship', 'fresher',
  'junior', 'senior', 'entry level', 'experienced', 'part time', 'contract'
];

/**
 * Calculate Levenshtein distance between two strings
 */
function levenshtein(a, b) {
  const matrix = [];
  for (let i = 0; i <= b.length; i++) matrix[i] = [i];
  for (let j = 0; j <= a.length; j++) matrix[0][j] = j;

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b[i - 1] === a[j - 1]) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1,     // insertion
          matrix[i - 1][j] + 1      // deletion
        );
      }
    }
  }
  return matrix[b.length][a.length];
}

/**
 * Find closest match for a word from the dictionary
 * @returns {{ corrected: string, suggestion: string|null, isCorrect: boolean }}
 */
export function correctWord(word) {
  if (!word || word.length < 2) return { corrected: word, suggestion: null, isCorrect: true };

  const lower = word.toLowerCase().trim();

  // Exact match
  if (JOB_DICTIONARY.includes(lower)) {
    return { corrected: word, suggestion: null, isCorrect: true };
  }

  // Find closest match
  let bestMatch = null;
  let bestDistance = Infinity;

  for (const term of JOB_DICTIONARY) {
    // Skip if length difference is too big
    if (Math.abs(term.length - lower.length) > 3) continue;

    const dist = levenshtein(lower, term);
    if (dist < bestDistance) {
      bestDistance = dist;
      bestMatch = term;
    }
  }

  // Only suggest if distance is small enough (max 2 edits for short words, 3 for longer)
  const maxDist = lower.length <= 4 ? 1 : lower.length <= 7 ? 2 : 3;

  if (bestMatch && bestDistance <= maxDist && bestDistance > 0) {
    return { corrected: bestMatch, suggestion: bestMatch, isCorrect: false };
  }

  return { corrected: word, suggestion: null, isCorrect: true };
}

/**
 * Correct an entire search query (multi-word)
 * @returns {{ corrected: string, suggestions: string[], hasCorrections: boolean }}
 */
export function correctQuery(query) {
  if (!query || !query.trim()) return { corrected: query, suggestions: [], hasCorrections: false };

  const words = query.trim().split(/\s+/);
  const correctedWords = [];
  const suggestions = [];
  let hasCorrections = false;

  // Also try matching the full query as a phrase
  const fullResult = correctWord(query.trim());
  if (fullResult.suggestion) {
    return {
      corrected: fullResult.suggestion,
      suggestions: [fullResult.suggestion],
      hasCorrections: true
    };
  }

  for (const word of words) {
    const result = correctWord(word);
    correctedWords.push(result.corrected);
    if (result.suggestion) {
      suggestions.push(`"${word}" → "${result.suggestion}"`);
      hasCorrections = true;
    }
  }

  return {
    corrected: correctedWords.join(' '),
    suggestions,
    hasCorrections
  };
}

/**
 * Get autocomplete suggestions for partial input
 */
export function getSuggestions(partial, limit = 5) {
  if (!partial || partial.length < 2) return [];

  const lower = partial.toLowerCase().trim();
  const lastWord = lower.split(/\s+/).pop();

  if (lastWord.length < 2) return [];

  return JOB_DICTIONARY
    .filter(term => term.startsWith(lastWord) || term.includes(lastWord))
    .sort((a, b) => {
      // Prioritize starts-with over includes
      const aStarts = a.startsWith(lastWord) ? 0 : 1;
      const bStarts = b.startsWith(lastWord) ? 0 : 1;
      return aStarts - bStarts || a.length - b.length;
    })
    .slice(0, limit);
}
