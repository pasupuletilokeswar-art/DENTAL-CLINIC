import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('clinic_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (
      error.response?.status === 401 ||
      (error.response?.status === 403 &&
        (error.response?.data?.message?.includes('token') ||
          error.response?.data?.message?.includes('Authentication') ||
          error.response?.data?.message?.includes('required')))
    ) {
      localStorage.removeItem('clinic_token');
      localStorage.removeItem('clinic_user');
      window.location.reload();
    }
    return Promise.reject(error);
  }
);

export default api;

