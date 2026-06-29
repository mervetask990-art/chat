import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

const api = axios.create({
  baseURL: `${API_URL}/api`,
  headers: { 'Content-Type': 'application/json' },
});

// Her istekte token ekle
api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// 401 → login sayfasına yönlendir
api.interceptors.response.use(
  (res) => res,
  (error) => {
    if (error.response?.status === 401 && typeof window !== 'undefined') {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// ── Auth ──────────────────────────────────────────────
export const authApi = {
  register: (data: { name: string; email: string; password: string }) =>
    api.post('/auth/register', data),
  login: (data: { email: string; password: string }) =>
    api.post('/auth/login', data),
  me: () => api.get('/auth/me'),
};

// ── Chats ─────────────────────────────────────────────
export const chatsApi = {
  getAll: () => api.get('/chats'),
  create: () => api.post('/chats'),
  getById: (id: string) => api.get(`/chats/${id}`),
  delete: (id: string) => api.delete(`/chats/${id}`),
  updateTitle: (id: string, title: string) => api.patch(`/chats/${id}`, { title }),
  sendMessage: (id: string, content: string, image?: File) => {
    const formData = new FormData();
    if (content) formData.append('content', content);
    if (image) formData.append('image', image);
    return api.post(`/chats/${id}/messages`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
};

// ── Exam ──────────────────────────────────────────────
export const examApi = {
  getTopics: () => api.get('/exam/topics'),
  getHistory: () => api.get('/exam/history'),
  start: (data: { topic: string; count: number; difficulty: string }) =>
    api.post('/exam/start', data),
  submitAnswer: (sessionId: string, data: { questionId: string; answer: string }) =>
    api.post(`/exam/${sessionId}/answer`, data),
  finish: (sessionId: string) => api.post(`/exam/${sessionId}/finish`),
};

export default api;
