/**
 * Content Script — extracts job data from the current page
 * Works on: LinkedIn, Indeed, Naukri, Internshala, Glassdoor, Foundit, TimesJobs
 */

function detectSite() {
  const host = window.location.hostname;
  if (host.includes('linkedin.com')) return 'linkedin';
  if (host.includes('indeed.com')) return 'indeed';
  if (host.includes('naukri.com')) return 'naukri';
  if (host.includes('internshala.com')) return 'internshala';
  if (host.includes('glassdoor')) return 'glassdoor';
  if (host.includes('foundit.in')) return 'foundit';
  if (host.includes('timesjobs.com')) return 'timesjobs';
  return 'unknown';
}

function extractJobData() {
  const site = detectSite();
  const url = window.location.href;

  const extractors = {
    linkedin: () => ({
      title: qs('.top-card-layout__title, .job-details-jobs-unified-top-card__job-title h1, h1')?.innerText?.trim(),
      company: qs('.topcard__org-name-link, .job-details-jobs-unified-top-card__company-name a, .top-card-layout__second-subline a')?.innerText?.trim(),
      location: qs('.topcard__flavor--bullet, .job-details-jobs-unified-top-card__bullet, .top-card-layout__second-subline .topcard__flavor:nth-child(2)')?.innerText?.trim(),
      description: qs('.description__text, .jobs-description__content, .show-more-less-html__markup')?.innerText?.trim()?.substring(0, 500),
    }),
    indeed: () => ({
      title: qs('.jobsearch-JobInfoHeader-title, h1[data-testid="jobsearch-JobInfoHeader-title"], .icl-u-xs-mb--xs h1')?.innerText?.trim(),
      company: qs('[data-testid="inlineHeader-companyName"] a, .jobsearch-CompanyInfoContainer a, .icl-u-lg-mr--sm')?.innerText?.trim(),
      location: qs('[data-testid="inlineHeader-companyLocation"], .jobsearch-CompanyInfoContainer .css-6z8o9s, .icl-u-xs-mt--xs .icl-IconFunctional')?.parentElement?.innerText?.trim(),
      description: qs('#jobDescriptionText, .jobsearch-JobComponent-description')?.innerText?.trim()?.substring(0, 500),
    }),
    naukri: () => ({
      title: qs('.jd-header-title, h1.jd-header-title, .styles_jd-header-title__rZwM1')?.innerText?.trim(),
      company: qs('.jd-header-comp-name a, .styles_jd-header-comp-name__MvqAI a')?.innerText?.trim(),
      location: qs('.location, .locWdth, .ni-job-tuple-icon-srp-location')?.innerText?.trim(),
      description: qs('.styles_JDC__dang-inner-html__h0K4t, .job-desc, .dang-inner-html')?.innerText?.trim()?.substring(0, 500),
    }),
    internshala: () => ({
      title: qs('.profile_on_detail_page, .heading_4_5 .profile')?.innerText?.trim(),
      company: qs('.company_name a, .heading_6 .link_display_like_text')?.innerText?.trim(),
      location: qs('#location_names a, .location_link a')?.innerText?.trim(),
      description: qs('.internship_details .text-container, .about_company_text_container')?.innerText?.trim()?.substring(0, 500),
    }),
    glassdoor: () => ({
      title: qs('[data-test="job-title"], .css-1vg6q84, .e1tk4kwz4')?.innerText?.trim(),
      company: qs('[data-test="emp-name"], .css-87ung5, .e1tk4kwz1')?.innerText?.trim(),
      location: qs('[data-test="emp-location"], .css-56kyx5, .e1tk4kwz5')?.innerText?.trim(),
      description: qs('.jobDescriptionContent, [data-test="description"]')?.innerText?.trim()?.substring(0, 500),
    }),
    foundit: () => ({
      title: qs('.jd-header-title, .job-title h1')?.innerText?.trim(),
      company: qs('.company-name a, .jd-header-comp-name a')?.innerText?.trim(),
      location: qs('.location span, .loc-text')?.innerText?.trim(),
      description: qs('.job-desc-section, .jd-desc')?.innerText?.trim()?.substring(0, 500),
    }),
    timesjobs: () => ({
      title: qs('.jd-job-title, h1.jd-job-title')?.innerText?.trim(),
      company: qs('.jd-header-comp-name a, .company-name')?.innerText?.trim(),
      location: qs('.location-text, .loc a')?.innerText?.trim(),
      description: qs('.jd-desc, .job-description')?.innerText?.trim()?.substring(0, 500),
    }),
  };

  const extractor = extractors[site];
  if (!extractor) return null;

  try {
    const data = extractor();
    if (!data.title) return null;

    return {
      title: data.title || '',
      company: data.company || '',
      location: data.location || '',
      description: data.description || '',
      source: site,
      applicationUrl: url,
      workType: guessWorkType(data.location || ''),
      jobType: guessJobType(data.title || ''),
      skills: [],
      isActive: true,
      applicantCount: 0,
      postedDate: new Date().toISOString(),
      expiryDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
    };
  } catch (e) {
    console.error('[JobPilot Extension] Extraction error:', e);
    return null;
  }
}

function qs(selector) {
  return document.querySelector(selector);
}

function guessWorkType(loc) {
  const l = loc.toLowerCase();
  if (l.includes('remote') || l.includes('work from home')) return 'remote';
  if (l.includes('hybrid')) return 'hybrid';
  return 'on-site';
}

function guessJobType(title) {
  const t = title.toLowerCase();
  if (t.includes('intern')) return 'internship';
  if (t.includes('contract')) return 'contract';
  return 'full-time';
}

// Listen for messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'getJobData') {
    const data = extractJobData();
    sendResponse(data);
  }
  return true;
});

// Inject a floating "Save to JobPilot" button on job pages
function injectFloatingButton() {
  if (document.getElementById('jobpilot-float-btn')) return;

  const btn = document.createElement('div');
  btn.id = 'jobpilot-float-btn';
  btn.innerHTML = `
    <div style="position:fixed;bottom:24px;right:24px;z-index:99999;display:flex;flex-direction:column;gap:8px;align-items:flex-end" id="jp-container">
      <div id="jp-tooltip" style="display:none;background:#111827;color:#e2e8f0;padding:8px 14px;border-radius:8px;font-size:13px;border:1px solid #334155;box-shadow:0 4px 20px rgba(0,0,0,0.4);font-family:system-ui">Saved to JobPilot!</div>
      <button id="jp-btn" style="background:linear-gradient(135deg,#10b981,#059669);color:#fff;border:none;padding:12px 20px;border-radius:12px;font-size:14px;font-weight:600;cursor:pointer;box-shadow:0 4px 20px rgba(16,185,129,0.3);font-family:system-ui;display:flex;align-items:center;gap:8px;transition:transform 0.2s">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z"/></svg>
        Save to JobPilot
      </button>
    </div>
  `;
  document.body.appendChild(btn);

  document.getElementById('jp-btn').addEventListener('click', async () => {
    const jobData = extractJobData();
    if (!jobData) {
      showTooltip('Could not detect job details');
      return;
    }

    const btnEl = document.getElementById('jp-btn');
    btnEl.textContent = 'Saving...';

    try {
      const { apiUrl, authToken } = await chrome.storage.local.get(['apiUrl', 'authToken']);
      const base = apiUrl || 'http://localhost:5000';

      const res = await fetch(`${base}/api/jobs/external`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${authToken}` },
        body: JSON.stringify(jobData)
      });

      if (res.ok) {
        const data = await res.json();
        await fetch(`${base}/api/saved-jobs/${data.jobId}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${authToken}` }
        });
        btnEl.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg> Saved!';
        btnEl.style.background = '#1e293b';
        showTooltip('Job saved to JobPilot!');
      } else {
        showTooltip('Failed — open extension to set API URL');
        btnEl.textContent = 'Save to JobPilot';
      }
    } catch (e) {
      showTooltip('Connection error');
      btnEl.textContent = 'Save to JobPilot';
    }
  });

  document.getElementById('jp-btn').addEventListener('mouseenter', (e) => {
    e.target.style.transform = 'scale(1.05)';
  });
  document.getElementById('jp-btn').addEventListener('mouseleave', (e) => {
    e.target.style.transform = 'scale(1)';
  });
}

function showTooltip(msg) {
  const tip = document.getElementById('jp-tooltip');
  if (!tip) return;
  tip.textContent = msg;
  tip.style.display = 'block';
  setTimeout(() => { tip.style.display = 'none'; }, 3000);
}

// Inject after page loads
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', injectFloatingButton);
} else {
  setTimeout(injectFloatingButton, 1500);
}
