import axios from 'axios';
import { auth } from './firebase';

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_BASE,
  headers: { 'Content-Type': 'application/json' }
});

// Attach Firebase ID token to every request
api.interceptors.request.use(async (config) => {
  try {
    const user = auth.currentUser;
    if (user) {
      const token = await user.getIdToken();
      config.headers.Authorization = `Bearer ${token}`;
    }
  } catch (error) {
    console.error('Token fetch error:', error);
  }
  return config;
});

// Handle 401 responses
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Firebase auth will handle re-auth via onAuthStateChanged
      console.warn('Unauthorized request');
    }
    return Promise.reject(error);
  }
);

// Auth
export const authAPI = {
  getMe: () => api.get('/auth/me'),
  sync: (data) => api.post('/auth/sync', data),
};

// Profile
export const profileAPI = {
  get: () => api.get('/profile'),
  update: (data) => api.put('/profile', data),
  uploadResume: (formData) => api.post('/profile/resume', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  updateSkills: (skills) => api.put('/profile/skills', { skills }),
  getResumeSuggestions: () => api.get('/profile/resume/suggestions'),
  toggleSmartApply: (data) => api.put('/profile/smart-apply', data),
};

// Jobs
export const jobsAPI = {
  getAll: (params) => api.get('/jobs', { params }),
  getById: (id) => api.get(`/jobs/${id}`),
  getRecommended: () => api.get('/jobs/recommended/me'),
  seed: () => api.post('/jobs/seed'),
};

// Applications
export const applicationsAPI = {
  getAll: (params) => api.get('/applications', { params }),
  apply: (jobId, data) => api.post(`/applications/${jobId}`, data),
  updateStatus: (id, data) => api.put(`/applications/${id}/status`, data),
  withdraw: (id) => api.delete(`/applications/${id}`),
  runSmartApply: () => api.post('/applications/smart-apply/run'),
};

// Referrals
export const referralsAPI = {
  getAll: (params) => api.get('/referrals', { params }),
  request: (data) => api.post('/referrals/request', data),
  getMyRequests: () => api.get('/referrals/my-requests'),
  generateMessage: (data) => api.post('/referrals/generate-message', data),
  seed: () => api.post('/referrals/seed'),
};

// Recruiter
export const recruiterAPI = {
  getPosts: (params) => api.get('/recruiter', { params }),
  likePost: (id) => api.post(`/recruiter/${id}/like`),
  seed: () => api.post('/recruiter/seed'),
};

// Analytics
export const analyticsAPI = {
  getDashboard: () => api.get('/analytics'),
};

// Scraper
export const scraperAPI = {
  run: (data) => api.post('/scraper/run', data),
  runSync: (data) => api.post('/scraper/run-sync', data),
  getStatus: () => api.get('/scraper/status'),
};

// Notifications
export const notificationsAPI = {
  getAll: () => api.get('/notifications'),
  markRead: (id) => api.put(`/notifications/${id}/read`),
  markAllRead: () => api.put('/notifications/read-all'),
  remove: (id) => api.delete(`/notifications/${id}`),
};

// Saved Jobs
export const savedJobsAPI = {
  getAll: () => api.get('/saved-jobs'),
  save: (jobId) => api.post(`/saved-jobs/${jobId}`),
  unsave: (jobId) => api.delete(`/saved-jobs/${jobId}`),
};

// Interviews
export const interviewsAPI = {
  getAll: () => api.get('/interviews'),
  create: (data) => api.post('/interviews', data),
  update: (id, data) => api.put(`/interviews/${id}`, data),
  remove: (id) => api.delete(`/interviews/${id}`),
};

export default api;
