import axios from 'axios';

const TOKEN_KEY = 'stockpilot.token';

export const tokenStore = {
  get: () => localStorage.getItem(TOKEN_KEY),
  set: (token) => localStorage.setItem(TOKEN_KEY, token),
  clear: () => localStorage.removeItem(TOKEN_KEY),
};

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  timeout: 25000,
});

api.interceptors.request.use((request) => {
  const token = tokenStore.get();
  if (token) request.headers.Authorization = `Bearer ${token}`;
  return request;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;
    const isLoginRequest = String(error.config?.url || '').includes('/auth/login');

    if (status === 401 && !isLoginRequest) {
      tokenStore.clear();
      window.dispatchEvent(new Event('stockpilot:unauthorized'));
    }

    const message =
      error.response?.data?.message ||
      (error.code === 'ECONNABORTED'
        ? 'The server took too long to respond. Please try again.'
        : 'Something went wrong. Please try again.');

    const wrapped = new Error(message);
    wrapped.status = status;
    wrapped.details = error.response?.data?.details;
    return Promise.reject(wrapped);
  }
);

export default api;
