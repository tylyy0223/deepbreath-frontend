import axios from 'axios';
import { token } from './token';
import { ENDPOINTS } from '../config/api';

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
  (response) => response,  // P1-#7 解包暂缓——等后端中间件方案稳定后再统一
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      // Share a single refresh promise across concurrent 401s
      if (!refreshPromise) {
        const refreshToken = token.getRefresh();
        if (!refreshToken) {
          refreshPromise = Promise.resolve(null);
        } else {
          refreshPromise = axios
            .post(ENDPOINTS.AUTH_REFRESH, { refresh_token: refreshToken })
            .then((res) => {
              // raw axios 不经过拦截器，需手动解包 {code, data} 格式
              const body = res.data;
              const payload = body?.code === 0 ? body.data : body;
              const { access_token, refresh_token } = payload || {};
              token.setAccess(access_token);
              token.setRefresh(refresh_token);
              return access_token;
            })
            .catch(() => null);
        }

        // Clear the shared promise after it settles
        refreshPromise.finally(() => {
          refreshPromise = null;
        });
      }

      const newToken = await refreshPromise;
      if (newToken) {
        originalRequest.headers.Authorization = `Bearer ${newToken}`;
        return api(originalRequest);
      }

      // Refresh failed — force logout
      token.clear();
      window.location.href = '/app/login';
    }

    return Promise.reject(error);
  },
);

export default api;
