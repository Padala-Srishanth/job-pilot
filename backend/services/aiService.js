/**
 * AI Service - Handles OpenAI API integration for intelligent features
 * Falls back to template-based generation when API key is not configured
 */

let openai = null;
try {
  const OpenAI = require('openai');
  if (process.env.OPENAI_API_KEY) {
    openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }
} catch (e) {
  // OpenAI not available, use fallback
}

async function generateCoverLetter(user, job) {
  const skills = user.resume?.parsedData?.skills || [];
  const experience = user.resume?.parsedData?.experience || [];

  if (openai) {
    try {
      const response = await openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [{
          role: 'system',
          content: 'You are a professional cover letter writer. Write concise, compelling cover letters.'
        }, {
          role: 'user',
          content: `Write a brief cover letter for ${user.name} applying to ${job.title} at ${job.company}.
Skills: ${skills.join(', ')}
Experience: ${experience.map(e => `${e.title} at ${e.company}`).join(', ')}
Job Requirements: ${(job.requirements || []).join(', ')}
Keep it under 200 words.`
        }],
        max_tokens: 300,
        temperature: 0.7
      });
      return response.choices[0].message.content;
    } catch (error) {
      console.error('OpenAI API error:', error.message);
    }
  }

  // Template-based fallback
  return generateTemplateCoverLetter(user, job, skills);
}

function generateTemplateCoverLetter(user, job, skills) {
  const matchingSkills = skills.filter(s =>
    (job.skills || []).some(js => js.toLowerCase().includes(s.toLowerCase()))
  );

  return `Dear Hiring Manager,

I am writing to express my strong interest in the ${job.title} position at ${job.company}. With my background in ${matchingSkills.slice(0, 3).join(', ') || 'relevant technologies'}, I am confident in my ability to contribute effectively to your team.

${matchingSkills.length > 0
    ? `My expertise in ${matchingSkills.join(', ')} aligns well with your requirements.`
    : `I am eager to apply my skills and grow in this role.`}

I am excited about the opportunity to bring my experience and passion to ${job.company}. I look forward to discussing how I can contribute to your team's success.

Best regards,
${user.name}`;
}

async function generateReferralMessage(user, referral, job) {
  if (openai) {
    try {
      const response = await openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [{
          role: 'system',
          content: 'Write a professional, friendly cold outreach message for a referral request. Keep it brief and respectful.'
        }, {
          role: 'user',
          content: `${user.name} wants to request a referral from ${referral.name} at ${referral.company} for the ${job?.title || 'a position'} role. User skills: ${(user.resume?.parsedData?.skills || []).slice(0, 5).join(', ')}. Keep under 100 words.`
        }],
        max_tokens: 150,
        temperature: 0.7
      });
      return response.choices[0].message.content;
    } catch (error) {
      console.error('OpenAI API error:', error.message);
    }
  }

  return `Hi ${referral.name},

I hope this message finds you well. I'm ${user.name}, and I'm very interested in ${job?.title ? `the ${job.title} role` : 'opportunities'} at ${referral.company}. I'd love to connect and learn more about the team and culture. Would you be open to a brief chat or potentially referring me for the position?

Thank you for your time!
Best regards,
${user.name}`;
}

async function suggestResumeImprovements(parsedData) {
  const suggestions = [];

  if (!parsedData.skills?.length) {
    suggestions.push('Add a dedicated Skills section with relevant technical and soft skills.');
  } else if (parsedData.skills.length < 5) {
    suggestions.push('Consider adding more skills to your resume. Aim for at least 8-10 relevant skills.');
  }

  if (!parsedData.experience?.length) {
    suggestions.push('Add work experience or internship details with quantifiable achievements.');
  }

  if (!parsedData.projects?.length) {
    suggestions.push('Include personal or academic projects to showcase practical skills.');
  }

  if (!parsedData.education?.length) {
    suggestions.push('Add your educational background including degree, institution, and graduation year.');
  }

  if (!parsedData.summary) {
    suggestions.push('Add a professional summary at the top of your resume (2-3 sentences).');
  }

  if (openai && parsedData.skills?.length > 0) {
    try {
      const response = await openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [{
          role: 'user',
          content: `Given these resume skills: ${parsedData.skills.join(', ')}, suggest 3 trending complementary skills to add. Return only a JSON array of strings.`
        }],
        max_tokens: 100,
        temperature: 0.5
      });
      const aiSkills = JSON.parse(response.choices[0].message.content);
      suggestions.push(`Trending skills to consider adding: ${aiSkills.join(', ')}`);
    } catch (e) {
      // Ignore AI suggestion failures
    }
  }

  return suggestions;
}

module.exports = { generateCoverLetter, generateReferralMessage, suggestResumeImprovements };
