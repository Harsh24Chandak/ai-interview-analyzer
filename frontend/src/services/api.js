import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 25000,
});

api.interceptors.request.use((config) => {
  try {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  } catch (e) {}
  return config;
});

export const authAPI = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data),
  demoLogin: () => api.post('/auth/demo'),
  seedSampleData: () => api.post('/auth/seed-sample-data'),
  getCurrentUser: () => api.get('/auth/me'),
  updateProfile: (data) => api.put('/auth/profile', data),
  changePassword: (data) => api.post('/auth/change-password', data),
};

export const resumeAPI = {
  uploadResume: (formData) =>
    api.post('/resumes/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  analyzeResume: (data) => api.post('/resumes/analyze', data),
  rewriteBullets: (data) => api.post('/resumes/rewrite-bullets', data),
  listResumes: () => api.get('/resumes'),
};

export const jobsAPI = {
  analyzeJob: (data) => api.post('/jobs/analyze', data),
  listJobs: () => api.get('/jobs'),
};

export const interviewAPI = {
  startInterview: (data) => api.post('/interviews/start', data),
  submitAnswer: (sessionId, data) => api.post(`/interviews/${sessionId}/answer`, data),
  completeInterview: (sessionId, data) => api.post(`/interviews/${sessionId}/complete`, data),
  getInterviewDetails: (sessionId) => api.get(`/interviews/${sessionId}`),
  getInterviewHistory: () => api.get('/interviews'),
  deleteInterview: (sessionId) => api.delete(`/interviews/${sessionId}`),
  toggleBookmark: (questionId) => api.post(`/interviews/questions/${questionId}/bookmark`),
  listBookmarks: () => api.get('/interviews/bookmarks/list'),
};

export const analyticsAPI = {
  getDashboardStats: () => api.get('/analytics/dashboard'),
  getPerformanceAnalytics: () => api.get('/analytics/performance'),
  getHealth: () => api.get('/health'),
};

export default api;
