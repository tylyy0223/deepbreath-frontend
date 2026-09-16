import axios from 'axios';
import { token } from './token';
import { ENDPOINTS } from '../config/api';

const api = axios.create({
  baseURL: '/api/v1',
  // === refresh_token 走 cookie (httpOnly, JS 读不到) ===
  // 必须 withCredentials, 浏览器才会自动带 cookie 跨域
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
});

// --- Request interceptor: attach Bearer access_token ---
// refresh_token 不在这里带 (httpOnly cookie 自动随每个请求发)
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

    // 注意: 401 可能是 refresh 接口本身的 401 (refresh_token 过期), 不能无限循环
    // 用 _retryFlag 标记是否已经尝试过 refresh
    if (
      error.response?.status === 401 &&
      !originalRequest._retryFlag &&
      !originalRequest.url?.includes(ENDPOINTS.AUTH_REFRESH)  // refresh 接口本身 401 不重试
    ) {
      originalRequest._retryFlag = true;

      // Share a single refresh promise across concurrent 401s
      if (!refreshPromise) {
        // === 关键: refresh_token 在 httpOnly cookie 里, fetch 自动随请求发 ===
        // 不需要也不应该从 localStorage 读 refresh_token (前端根本读不到 cookie)
        refreshPromise = fetch(`${api.defaults.baseURL || '/api/v1'}${ENDPOINTS.AUTH_REFRESH}`, {
          method: 'POST',
          credentials: 'include',  // fetch API 的 withCredentials
          headers: { 'Content-Type': 'application/json' },
          // body 不传 refresh_token — 靠 cookie
        })
          .then(async (res) => {
            if (!res.ok) return null;
            const body = await res.json().catch(() => null);
            const payload = body?.code === 0 ? body.data : body;
            const access_token = payload?.access_token;
            // 注意: refresh_token 不需要也不应该存 localStorage — 后端通过 Set-Cookie 更新
            if (access_token) {
              token.setAccess(access_token);
              return access_token;
            }
            return null;
          })
          .catch(() => null);

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