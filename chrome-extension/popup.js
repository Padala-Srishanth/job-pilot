// Load saved settings
chrome.storage.local.get(['apiUrl', 'authToken'], (data) => {
  if (data.apiUrl) document.getElementById('apiUrl').value = data.apiUrl;
  if (data.authToken) {
    document.getElementById('status').className = 'status connected';
    document.getElementById('status').textContent = 'Connected to JobPilot';
  }
});

// Save API URL on change
document.getElementById('apiUrl').addEventListener('change', (e) => {
  chrome.storage.local.set({ apiUrl: e.target.value });
});

// Ask content script for job data
chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
  if (!tabs[0]) return;

  chrome.tabs.sendMessage(tabs[0].id, { action: 'getJobData' }, (response) => {
    if (chrome.runtime.lastError || !response || !response.title) {
      document.getElementById('noJob').style.display = 'block';
      document.getElementById('jobInfo').style.display = 'none';
      return;
    }

    document.getElementById('noJob').style.display = 'none';
    document.getElementById('jobInfo').style.display = 'block';
    document.getElementById('jobTitle').textContent = response.title;
    document.getElementById('jobCompany').textContent = response.company || 'Unknown Company';
    document.getElementById('jobLocation').textContent = response.location || '—';
    document.getElementById('jobSource').textContent = response.source || '—';

    // Store for save/track
    window._jobData = response;
  });
});

async function getApiUrl() {
  return new Promise(resolve => {
    chrome.storage.local.get(['apiUrl'], (data) => {
      resolve(data.apiUrl || 'http://localhost:5000');
    });
  });
}

async function getToken() {
  return new Promise(resolve => {
    chrome.storage.local.get(['authToken'], (data) => {
      resolve(data.authToken || '');
    });
  });
}

async function saveJob() {
  const btn = document.getElementById('btnSave');
  btn.textContent = 'Saving...';

  try {
    const apiUrl = await getApiUrl();
    const token = await getToken();

    // First create the job in the database
    const job = window._jobData;
    const res = await fetch(`${apiUrl}/api/jobs/external`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify(job)
    });

    if (res.ok) {
      const data = await res.json();
      // Now save/bookmark it
      await fetch(`${apiUrl}/api/saved-jobs/${data.jobId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }
      });
      btn.textContent = 'Saved!';
      btn.className = 'btn btn-saved';
    } else {
      btn.textContent = 'Failed — check login';
    }
  } catch (e) {
    btn.textContent = 'Error — check API URL';
  }
}

async function trackApplication() {
  const btn = document.getElementById('btnTrack');
  btn.textContent = 'Tracking...';

  try {
    const apiUrl = await getApiUrl();
    const token = await getToken();
    const job = window._jobData;

    // Create job + apply
    const createRes = await fetch(`${apiUrl}/api/jobs/external`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify(job)
    });

    if (createRes.ok) {
      const data = await createRes.json();
      await fetch(`${apiUrl}/api/applications/${data.jobId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ notes: `Applied via ${job.source} extension` })
      });
      btn.textContent = 'Tracked!';
      btn.className = 'btn btn-saved';
    } else {
      btn.textContent = 'Failed — check login';
    }
  } catch (e) {
    btn.textContent = 'Error — check API URL';
  }
}
