const nodemailer = require('nodemailer');

let transporter = null;

function getTransporter() {
  if (transporter) return transporter;
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    console.log('[Email] No email credentials configured — notifications disabled');
    return null;
  }
  transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS }
  });
  return transporter;
}

async function sendEmail(to, subject, html) {
  const t = getTransporter();
  if (!t) return { sent: false, reason: 'Email not configured' };

  try {
    await t.sendMail({
      from: `"JobPilot" <${process.env.EMAIL_USER}>`,
      to, subject, html
    });
    console.log(`[Email] Sent to ${to}: ${subject}`);
    return { sent: true };
  } catch (error) {
    console.error('[Email] Send failed:', error.message);
    return { sent: false, reason: error.message };
  }
}

// ── Email Templates ──

function applicationStatusEmail(userName, jobTitle, company, status) {
  const statusColors = {
    applied: '#3b82f6', reviewing: '#06b6d4', interview: '#8b5cf6',
    accepted: '#10b981', rejected: '#ef4444', withdrawn: '#64748b'
  };
  const statusMessages = {
    applied: 'Your application has been submitted!',
    reviewing: 'Your application is being reviewed.',
    interview: 'Congratulations! You have an interview scheduled.',
    accepted: 'Amazing! You have been accepted!',
    rejected: 'Unfortunately, your application was not selected this time.',
    withdrawn: 'Your application has been withdrawn.'
  };

  return `
  <div style="font-family:'Segoe UI',sans-serif;max-width:600px;margin:0 auto;background:#111827;color:#e2e8f0;border-radius:12px;overflow:hidden">
    <div style="background:linear-gradient(135deg,#10b981,#059669);padding:24px 32px">
      <h1 style="margin:0;font-size:20px;color:#fff">JobPilot</h1>
    </div>
    <div style="padding:32px">
      <p style="margin:0 0 8px">Hi ${userName},</p>
      <p style="margin:0 0 24px;color:#94a3b8">${statusMessages[status] || 'Your application status has been updated.'}</p>
      <div style="background:#1e293b;border-radius:8px;padding:20px;margin-bottom:24px">
        <p style="margin:0 0 4px;font-weight:600;font-size:16px">${jobTitle}</p>
        <p style="margin:0 0 12px;color:#94a3b8">${company}</p>
        <span style="display:inline-block;padding:4px 12px;border-radius:20px;font-size:12px;font-weight:600;color:#fff;background:${statusColors[status] || '#64748b'}">
          ${status.toUpperCase()}
        </span>
      </div>
      <a href="${process.env.CLIENT_URL || 'http://localhost:3000'}/applications" style="display:inline-block;background:#10b981;color:#fff;padding:10px 24px;border-radius:8px;text-decoration:none;font-weight:500">View Applications</a>
    </div>
    <div style="padding:16px 32px;background:#0a0e17;text-align:center">
      <p style="margin:0;font-size:12px;color:#475569">JobPilot — AI-Powered Job Applications</p>
    </div>
  </div>`;
}

function smartApplyResultEmail(userName, appliedCount, jobs) {
  const jobRows = jobs.slice(0, 5).map(j =>
    `<tr><td style="padding:8px 12px;border-bottom:1px solid #1e293b">${j.title}</td><td style="padding:8px 12px;border-bottom:1px solid #1e293b;color:#94a3b8">${j.company}</td><td style="padding:8px 12px;border-bottom:1px solid #1e293b;text-align:center"><span style="color:#10b981;font-weight:600">${j.relevanceScore}%</span></td></tr>`
  ).join('');

  return `
  <div style="font-family:'Segoe UI',sans-serif;max-width:600px;margin:0 auto;background:#111827;color:#e2e8f0;border-radius:12px;overflow:hidden">
    <div style="background:linear-gradient(135deg,#10b981,#059669);padding:24px 32px">
      <h1 style="margin:0;font-size:20px;color:#fff">JobPilot — Smart Apply</h1>
    </div>
    <div style="padding:32px">
      <p>Hi ${userName},</p>
      <p>Smart Apply just applied to <strong>${appliedCount} new jobs</strong> on your behalf!</p>
      <table style="width:100%;border-collapse:collapse;margin:20px 0">
        <tr style="background:#1e293b"><th style="padding:8px 12px;text-align:left;font-size:13px">Job</th><th style="padding:8px 12px;text-align:left;font-size:13px">Company</th><th style="padding:8px 12px;text-align:center;font-size:13px">Match</th></tr>
        ${jobRows}
      </table>
      <a href="${process.env.CLIENT_URL || 'http://localhost:3000'}/applications" style="display:inline-block;background:#10b981;color:#fff;padding:10px 24px;border-radius:8px;text-decoration:none;font-weight:500">View All Applications</a>
    </div>
  </div>`;
}

function interviewReminderEmail(userName, jobTitle, company, date, notes) {
  return `
  <div style="font-family:'Segoe UI',sans-serif;max-width:600px;margin:0 auto;background:#111827;color:#e2e8f0;border-radius:12px;overflow:hidden">
    <div style="background:linear-gradient(135deg,#8b5cf6,#7c3aed);padding:24px 32px">
      <h1 style="margin:0;font-size:20px;color:#fff">Interview Reminder</h1>
    </div>
    <div style="padding:32px">
      <p>Hi ${userName},</p>
      <p>You have an upcoming interview:</p>
      <div style="background:#1e293b;border-radius:8px;padding:20px;margin:20px 0">
        <p style="margin:0 0 4px;font-weight:600;font-size:16px">${jobTitle}</p>
        <p style="margin:0 0 12px;color:#94a3b8">${company}</p>
        <p style="margin:0 0 4px"><strong>Date:</strong> ${new Date(date).toLocaleString()}</p>
        ${notes ? `<p style="margin:8px 0 0;color:#94a3b8"><strong>Notes:</strong> ${notes}</p>` : ''}
      </div>
      <p style="color:#94a3b8">Good luck! You've got this.</p>
    </div>
  </div>`;
}

function weeklyDigestEmail(userName, stats) {
  return `
  <div style="font-family:'Segoe UI',sans-serif;max-width:600px;margin:0 auto;background:#111827;color:#e2e8f0;border-radius:12px;overflow:hidden">
    <div style="background:linear-gradient(135deg,#10b981,#059669);padding:24px 32px">
      <h1 style="margin:0;font-size:20px;color:#fff">Your Weekly JobPilot Summary</h1>
    </div>
    <div style="padding:32px">
      <p>Hi ${userName}, here's your week in review:</p>
      <div style="display:flex;gap:12px;margin:20px 0">
        <div style="flex:1;background:#1e293b;border-radius:8px;padding:16px;text-align:center">
          <p style="margin:0;font-size:24px;font-weight:700;color:#3b82f6">${stats.applied || 0}</p>
          <p style="margin:4px 0 0;font-size:12px;color:#94a3b8">Applied</p>
        </div>
        <div style="flex:1;background:#1e293b;border-radius:8px;padding:16px;text-align:center">
          <p style="margin:0;font-size:24px;font-weight:700;color:#8b5cf6">${stats.interviews || 0}</p>
          <p style="margin:4px 0 0;font-size:12px;color:#94a3b8">Interviews</p>
        </div>
        <div style="flex:1;background:#1e293b;border-radius:8px;padding:16px;text-align:center">
          <p style="margin:0;font-size:24px;font-weight:700;color:#10b981">${stats.accepted || 0}</p>
          <p style="margin:4px 0 0;font-size:12px;color:#94a3b8">Accepted</p>
        </div>
      </div>
      <a href="${process.env.CLIENT_URL || 'http://localhost:3000'}/analytics" style="display:inline-block;background:#10b981;color:#fff;padding:10px 24px;border-radius:8px;text-decoration:none;font-weight:500">View Full Analytics</a>
    </div>
  </div>`;
}

module.exports = {
  sendEmail,
  applicationStatusEmail,
  smartApplyResultEmail,
  interviewReminderEmail,
  weeklyDigestEmail
};
