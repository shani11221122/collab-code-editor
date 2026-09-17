import axios from 'axios';

const api = axios.create({ baseURL: 'https://collab-code-editor-vv74.onrender.com' });

// Har request ke sath automatically token attach kar do
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export default api;