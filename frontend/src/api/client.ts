import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to attach JWT token
apiClient.interceptors.request.use(
  (config) => {
    if (typeof config.url === 'string' && config.url.startsWith('/api/')) {
      config.url = config.url.slice(4);
    }

    const token = localStorage.getItem('token');
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle global errors (e.g., 401 Unauthorized)
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const message = error.response?.data?.message;
    const shouldExpireSession =
      error.response?.status === 401 &&
      (message === 'Authentication required' || message === 'Invalid or expired token');

    if (shouldExpireSession) {
      localStorage.removeItem('token');
      localStorage.removeItem('userId');
      localStorage.removeItem('role');
      localStorage.removeItem('username');
      window.dispatchEvent(new Event('auth_expired'));
    }
    return Promise.reject(error);
  }
);

export default apiClient;
