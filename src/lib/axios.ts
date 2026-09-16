import axios from 'axios';
import { token } from './token';

const api = axios.create({
  baseURL: '/api/v1',
  headers: { 'Content-Type': 'application/json' },
});

// --- Request interceptor: attach Bearer token ---
api.interceptors.request.use((config) => {
  const access = token.getAccess();
  if (access) {
    config.headers.Authorization = `Bearer ${access}`;
  }
  return config;
});

// --- Response interceptor: unwrap API envelope + auto-refresh on 401 ---
let refreshPromise: Promise<string | null> | null = null;

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      if (!refreshPromise) {
        refreshPromise = fetch('/api/v1/auth/refresh', {
          method: 'POST',
          credentials: 'include',
        })
          .then(async (res) => {
            if (!res.ok) return null;
            const body = await res.json();
            const payload = body?.code === 0 ? body.data : body;
            const { access_token } = payload || {};
            if (access_token) token.setAccess(access_token);
            return access_token || null;
          })
          .catch(() => null);

        refreshPromise.finally(() => {
          refreshPromise = null;
        });
      }

      const newToken = await refreshPromise;
      if (newToken) {
        originalRequest.headers.Authorization = `Bearer ${newToken}`;
        return api(originalRequest);
      }

      token.clear();
      window.location.href = '/app/login';
    }

    return Promise.reject(error);
  },
);

export default api;
