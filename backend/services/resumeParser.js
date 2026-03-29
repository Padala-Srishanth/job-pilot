const fs = require('fs');
const path = require('path');
const { analyzeResume } = require('./aiResumeAnalyzer');

/**
 * Parse resume file and extract structured data using AI + NLP
 */
async function parseResume(filePath) {
  try {
    const ext = path.extname(filePath).toLowerCase();
    let text = '';

    if (ext === '.pdf') {
      const pdfParse = require('pdf-parse');
      const dataBuffer = fs.readFileSync(filePath);
      const data = await pdfParse(dataBuffer);
      text = data.text;
    } else {
      text = fs.readFileSync(filePath, 'utf-8');
    }

    if (!text || text.trim().length < 20) {
      console.warn('[Resume Parser] Very short or empty resume text');
      return getEmptyParsedData();
    }

    // Run AI/NLP analysis
    const analysis = await analyzeResume(text);

    // Also run section-based extraction for experience, education, projects
    const sectionData = extractSections(text);

    // Merge AI skills with section-extracted data
    const allSkills = [
      ...(analysis.skills?.technical || []),
      ...(analysis.skills?.tools || []),
      ...(analysis.skills?.soft || [])
    ];

    return {
      skills: [...new Set(allSkills)],
      experience: sectionData.experience,
      education: sectionData.education,
      projects: sectionData.projects,
      summary: analysis.summary || sectionData.summary,
      // AI-enriched fields
      aiAnalysis: {
        experienceLevel: analysis.experienceLevel,
        totalYearsExperience: analysis.totalYearsExperience,
        domain: analysis.domain,
        strengths: analysis.strengths,
        missingSkills: analysis.missingCommonSkills,
        senioritySignals: analysis.senioritySignals,
        skillCategories: analysis.skills,
        method: analysis.method
      }
    };
  } catch (error) {
    console.error('[Resume Parser] Error:', error.message);
    return getEmptyParsedData();
  }
}

/**
 * Section-based extraction for experience, education, projects
 */
function extractSections(text) {
  const lines = text.split('\n').map(l => l.trim());

  return {
    experience: extractExperience(lines),
    education: extractEducation(text),
    projects: extractProjects(lines),
    summary: extractSummary(text)
  };
}

function extractExperience(lines) {
  const experiences = [];
  let inSection = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!line) continue;

    if (/^(?:experience|work\s+experience|professional\s+experience|employment|work\s+history)/i.test(line)) {
      inSection = true;
      continue;
    }
    if (inSection && /^(?:education|skills|projects|certifications|awards|publications|interests|hobbies)/i.test(line)) {
      inSection = false;
      continue;
    }

    if (inSection && line.length > 10) {
      const match = line.match(/^(.+?)\s*[-–|@]\s*(.+?)(?:\s*[-–|]\s*(.+))?$/);
      if (match) {
        experiences.push({
          title: match[1].trim(),
          company: match[2].trim(),
          duration: match[3]?.trim() || '',
          description: lines[i + 1]?.trim() || ''
        });
      }
    }
  }

  return experiences.slice(0, 10);
}

function extractEducation(text) {
  const education = [];
  const pattern = /(?:B\.?Tech|B\.?S\.?c?|B\.?E\.?|M\.?Tech|M\.?S\.?c?|M\.?E\.?|MBA|Ph\.?D|Bachelor|Master|Diploma|B\.?C\.?A|M\.?C\.?A|B\.?Sc|M\.?Sc)\s+(?:in\s+)?([A-Za-z\s]+?)(?:\s+from\s+|\s+at\s+|\s*[-–,]\s*)([A-Z][a-zA-Z\s]+)/gi;

  let match;
  while ((match = pattern.exec(text)) !== null) {
    education.push({
      degree: match[0].split(/from|at|[-–,]/)[0].trim(),
      institution: match[2]?.trim() || '',
      year: (match[0].match(/20\d{2}/) || [''])[0]
    });
  }

  return education.slice(0, 5);
}

function extractProjects(lines) {
  const projects = [];
  let inSection = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!line) continue;

    if (/^(?:projects|personal\s+projects|academic\s+projects|side\s+projects|portfolio)/i.test(line)) {
      inSection = true;
      continue;
    }
    if (inSection && /^(?:education|skills|experience|certifications|awards)/i.test(line)) {
      inSection = false;
      continue;
    }

    if (inSection && line.length > 5 && !line.startsWith('-') && !line.startsWith('•')) {
      const techMatch = lines.slice(i, i + 3).join(' ').match(/(?:tech|stack|built\s+with|using|technologies)[:\s]+([^.\n]+)/i);
      projects.push({
        name: line.replace(/[-–|:].*$/, '').trim(),
        description: lines[i + 1]?.trim() || '',
        technologies: techMatch ? techMatch[1].split(/[,;]/).map(t => t.trim()).filter(Boolean) : []
      });
    }
  }

  return projects.slice(0, 8);
}

function extractSummary(text) {
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 20);
  return sentences.slice(0, 3).join('. ').trim().substring(0, 500);
}

function getEmptyParsedData() {
  return {
    skills: [], experience: [], education: [], projects: [], summary: '',
    aiAnalysis: { experienceLevel: 'entry', totalYearsExperience: 0, domain: 'other', strengths: [], missingSkills: [], senioritySignals: [], skillCategories: { technical: [], soft: [], tools: [] }, method: 'none' }
  };
}

module.exports = { parseResume };
