import { create } from 'zustand';
import type { UserInfo, LoginRequest, RegisterRequest } from '../types/auth';
import api from '../lib/axios';
import { token } from '../lib/token';
import { ENDPOINTS } from '../config/api';

interface AuthState {
  user: UserInfo | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isInitializing: boolean;

  login: (email: string, password: string) => Promise<void>;
  loginBySms: (phone: string, smsCode: string) => Promise<void>;
  register: (email: string, password: string, nickname?: string) => Promise<void>;
  sendSmsCode: (phone: string, scene: 'register' | 'bind' | 'login') => Promise<void>;
  bindPhone: (phone: string, smsCode: string) => Promise<void>;
  logout: () => Promise<void>;
  init: () => Promise<void>;
  setTokens: (access: string, refresh: string, user: UserInfo) => void;
}

export const useAuthStore = create<AuthState>()((set, get) => ({
  user: null,
  accessToken: null,
  refreshToken: null,
  isAuthenticated: false,
  isInitializing: true,

  setTokens: (access, refresh, user) => {
    token.setAccess(access);
    token.setRefresh(refresh);
    token.setUser(user);
    set({ accessToken: access, refreshToken: refresh, user, isAuthenticated: true });
  },

  login: async (email: string, password: string) => {
    const body: LoginRequest = { email, password };
    const res = await api.post(ENDPOINTS.AUTH_LOGIN, body);
    const { access_token, refresh_token, user } = res.data;
    get().setTokens(access_token, refresh_token, user);
  },

  loginBySms: async (phone: string, smsCode: string) => {
    const body: LoginRequest = { phone, sms_code: smsCode };
    const res = await api.post(ENDPOINTS.AUTH_LOGIN, body);
    const { access_token, refresh_token, user } = res.data;
    get().setTokens(access_token, refresh_token, user);
  },

  register: async (email: string, password: string, nickname?: string) => {
    const body: RegisterRequest = { email, password };
    if (nickname) body.nickname = nickname;
    const res = await api.post(ENDPOINTS.AUTH_REGISTER, body);
    const { access_token, refresh_token, user } = res.data;
    get().setTokens(access_token, refresh_token, user);
  },

  sendSmsCode: async (phone: string, scene: 'register' | 'bind' | 'login') => {
    await api.post(ENDPOINTS.AUTH_SMS_SEND, { phone, scene });
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
    set({ user: null, accessToken: null, refreshToken: null, isAuthenticated: false });
  },

  init: async () => {
    const storedAccess = token.getAccess();
    const storedRefresh = token.getRefresh();
    const storedUser = token.getUser();

    if (storedAccess && storedRefresh && storedUser) {
      // Set tokens into state immediately
      set({
        accessToken: storedAccess,
        refreshToken: storedRefresh,
        user: storedUser,
        isAuthenticated: true,
      });

      // Try to refresh to get a fresh access token
      try {
        const res = await api.post(ENDPOINTS.AUTH_REFRESH, {
          refresh_token: storedRefresh,
        });
        const { access_token, refresh_token, user } = res.data;
        get().setTokens(access_token, refresh_token, user);
      } catch {
        // Refresh failed, but we still have valid tokens in state
        // The axios interceptor will handle 401s during actual API calls
      }
    }

    set({ isInitializing: false });
  },
}));
