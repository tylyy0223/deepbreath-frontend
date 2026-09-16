import { create } from 'zustand';
import type { UserInfo, LoginRequest, RegisterRequest } from '../types/auth';
import api from '../lib/axios';
import { token } from '../lib/token';
import { ENDPOINTS } from '../config/api';

interface AuthState {
  user: UserInfo | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  isInitializing: boolean;

  login: (email: string, password: string) => Promise<void>;
  loginByPhone: (phone: string, password: string) => Promise<void>;
  loginBySms: (phone: string, smsCode: string) => Promise<void>;
  register: (phone: string, smsCode: string, password: string, email?: string, nickname?: string) => Promise<void>;
  sendSmsCode: (phone: string, scene: 'register' | 'bind' | 'login' | 'reset') => Promise<void>;
  resetPassword: (phone: string, smsCode: string, newPassword: string) => Promise<void>;
  bindPhone: (phone: string, smsCode: string) => Promise<void>;
  logout: () => Promise<void>;
  init: () => Promise<void>;
  setTokens: (access: string, user: UserInfo) => void;
}

export const useAuthStore = create<AuthState>()((set, get) => ({
  user: null,
  accessToken: null,
  isAuthenticated: false,
  isInitializing: true,

  setTokens: (access, user) => {
    token.setAccess(access);
    token.setUser(user);
    set({ accessToken: access, user, isAuthenticated: true });
  },

  login: async (email: string, password: string) => {
    const body: LoginRequest = { email, password };
    const res = await api.post(ENDPOINTS.AUTH_LOGIN, body);
    const { access_token, user } = res.data;
    get().setTokens(access_token, user);
  },

  loginByPhone: async (phone: string, password: string) => {
    const body: LoginRequest = { phone, password };
    const res = await api.post(ENDPOINTS.AUTH_LOGIN, body);
    const { access_token, refresh_token, user } = res.data;
    get().setTokens(access_token, refresh_token, user);
  },

  loginBySms: async (phone: string, smsCode: string) => {
    const body: LoginRequest = { phone, sms_code: smsCode };
    const res = await api.post(ENDPOINTS.AUTH_LOGIN, body);
    const { access_token, user } = res.data;
    get().setTokens(access_token, user);
  },

  register: async (phone: string, smsCode: string, password: string, email?: string, nickname?: string) => {
    const body: RegisterRequest = { phone, sms_code: smsCode, password };
    if (email) body.email = email;
    if (nickname) body.nickname = nickname;
    const res = await api.post(ENDPOINTS.AUTH_REGISTER, body);
    const { access_token, user } = res.data;
    get().setTokens(access_token, user);
  },

  sendSmsCode: async (phone: string, scene: 'register' | 'bind' | 'login' | 'reset') => {
    await api.post(ENDPOINTS.AUTH_SMS_SEND, { phone, scene });
  },

  resetPassword: async (phone: string, smsCode: string, newPassword: string) => {
    await api.post(ENDPOINTS.AUTH_PASSWORD_RESET, { phone, sms_code: smsCode, new_password: newPassword });
  },

  bindPhone: async (phone: string, smsCode: string) => {
    const res = await api.post(ENDPOINTS.AUTH_BIND_PHONE, { phone, sms_code: smsCode });
    const d = res.data.data || {};
    const user = get().user;
    if (user) {
      const updated = { ...user, phone: d.phone, phone_bound: true };
      token.setUser(updated);
      set({ user: updated });
    }
  },

  logout: async () => {
    try {
      await api.post(ENDPOINTS.AUTH_LOGOUT);
    } catch { /* fire-and-forget */ }
    token.clear();
    set({ user: null, accessToken: null, isAuthenticated: false });
  },

  init: async () => {
    const storedAccess = token.getAccess();
    const storedUser = token.getUser();

    if (storedAccess && storedUser) {
      set({
        accessToken: storedAccess,
        user: storedUser,
        isAuthenticated: true,
      });

      try {
        const res = await fetch('/api/v1/auth/refresh', {
          method: 'POST',
          credentials: 'include',
        });
        if (res.ok) {
          const body = await res.json();
          const payload = body?.code === 0 ? body.data : body;
          const { access_token, user } = payload || {};
          if (access_token) {
            get().setTokens(access_token, user || storedUser);
          }
        }
      } catch {
        // Refresh failed — axios interceptor will handle 401s on actual API calls
      }
    }

    set({ isInitializing: false });
  },
}));
