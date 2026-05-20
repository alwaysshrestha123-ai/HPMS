import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
});

// Attach JWT to every request if available.
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('hpms_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Logout the user if the API returns 401.
api.interceptors.response.use(
  (r) => r,
  (err) => {
    if (err.response?.status === 401 && localStorage.getItem('hpms_token')) {
      localStorage.removeItem('hpms_token');
      localStorage.removeItem('hpms_user');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  },
);

export default api;
