import { create } from 'zustand';
import api from '../lib/axios';
import { ENDPOINTS } from '../config/api';

// === Types mirroring /admin API responses ===

export interface AdminTotals {
  users: number;
  chat_sessions: number;
  ai_messages: number;
  diary_entries: number;
  breath_sessions: number;
  community_posts: number;
  articles: number;
  article_views: number;
}

export interface DailyPoint { date: string; count: number }

export interface AdminAnalytics {
  period_days: number;
  totals: AdminTotals;
  daily: {
    new_users: DailyPoint[];
    ai_messages: DailyPoint[];
    diary_entries: DailyPoint[];
    breath_sessions: DailyPoint[];
    community_posts: DailyPoint[];
  };
  mood_distribution: { score: number; count: number }[];
  mood_daily_avg: { date: string; avg: number }[];
  breath_by_exercise: { title: string; count: number }[];
  chat_by_mode: { mode: string; count: number }[];
}

export interface AdminUser {
  id: number;
  email: string;
  nickname: string;
  role: string;
  status: string;
  created_at: string | null;
}

export interface LoginLog {
  id: number;
  user_id: number | null;
  email: string;
  action: string;
  success: boolean;
  ip_address: string;
  created_at: string | null;
}

export interface AiUsage {
  period_days: number;
  total_ai_messages: number;
  estimated_input_tokens: number;
  estimated_output_tokens: number;
  estimated_cost_cny: number;
  daily: { date: string; messages: number; tokens: number }[];
  top_users: { user_id: number; messages: number; tokens: number }[];
}

export interface CreditsSummary {
  gifted: number;
  consumed: number;
  recharged: number;
  redeemed: number;
  revenue_fen: number;
  pending_orders: number;
}

export interface AdminOrder {
  order_no: string;
  user_id: number | null;
  email: string;
  amount_fen: number;
  credits: number;
  channel: string;
  status: string;
  proof: string;
  created_at: string | null;
}

export interface OnlineUser {
  user_id: number;
  email: string;
  nickname: string;
  role: string;
  last_active_seconds_ago: number;
  ai_active: boolean;
}

export interface OnlineData {
  online_count: number;
  ai_active_count: number;
  deepseek_429_total: number;
  chat_rate_limited_total: number;
  window_seconds: number;
  users: OnlineUser[];
}

interface AdminState {
  analytics: AdminAnalytics | null;
  users: AdminUser[];
  usersTotal: number;
  loginLogs: LoginLog[];
  logsTotal: number;
  aiUsage: AiUsage | null;
  creditsSummary: CreditsSummary | null;
  adminOrders: AdminOrder[];
  ordersTotal: number;
  onlineData: OnlineData | null;
  loading: boolean;

  fetchAnalytics: (days?: number) => Promise<void>;
  fetchUsers: (page?: number) => Promise<void>;
  updateUserRole: (id: number, role: string) => Promise<void>;
  updateUserStatus: (id: number, status: string) => Promise<void>;
  fetchLoginLogs: (page?: number) => Promise<void>;
  fetchAiUsage: (days?: number) => Promise<void>;
  fetchCreditsSummary: () => Promise<void>;
  fetchAdminOrders: (status?: string, page?: number) => Promise<void>;
  fetchOnlineUsers: () => Promise<void>;
  confirmOrder: (orderNo: string) => Promise<string>;
  adjustCredits: (userId: number, amount: number, reason: string) => Promise<void>;
  generateCodes: (count: number, credits: number) => Promise<string[]>;
}

export const useAdminStore = create<AdminState>()((set, get) => ({
  analytics: null,
  users: [],
  usersTotal: 0,
  loginLogs: [],
  logsTotal: 0,
  aiUsage: null,
  creditsSummary: null,
  adminOrders: [],
  ordersTotal: 0,
  onlineData: null,
  loading: false,

  fetchAnalytics: async (days = 30) => {
    set({ loading: true });
    try {
      const res = await api.get(ENDPOINTS.ADMIN_ANALYTICS, { params: { days } });
      set({ analytics: res.data.data || null });
    } catch {
      set({ analytics: null });
    } finally {
      set({ loading: false });
    }
  },

  fetchUsers: async (page = 1) => {
    set({ loading: true });
    try {
      const res = await api.get(ENDPOINTS.ADMIN_USERS, { params: { page, page_size: 20 } });
      set({ users: res.data.data || [], usersTotal: res.data.total || 0 });
    } catch {
      set({ users: [] });
    } finally {
      set({ loading: false });
    }
  },

  // role/status are query params on the backend
  updateUserRole: async (id, role) => {
    await api.put(ENDPOINTS.ADMIN_USER_ROLE(id), null, { params: { role } });
    get().fetchUsers();
  },

  updateUserStatus: async (id, status) => {
    await api.put(ENDPOINTS.ADMIN_USER_STATUS(id), null, { params: { status } });
    get().fetchUsers();
  },

  fetchLoginLogs: async (page = 1) => {
    set({ loading: true });
    try {
      const res = await api.get(ENDPOINTS.ADMIN_LOGIN_LOGS, { params: { page, page_size: 30 } });
      set({ loginLogs: res.data.data || [], logsTotal: res.data.total || 0 });
    } catch {
      set({ loginLogs: [] });
    } finally {
      set({ loading: false });
    }
  },

  fetchAiUsage: async (days = 30) => {
    set({ loading: true });
    try {
      const res = await api.get(ENDPOINTS.ADMIN_AI_USAGE, { params: { days } });
      set({ aiUsage: res.data.data || null });
    } catch {
      set({ aiUsage: null });
    } finally {
      set({ loading: false });
    }
  },

  fetchCreditsSummary: async () => {
    try {
      const res = await api.get(ENDPOINTS.CREDITS_ADMIN_SUMMARY);
      set({ creditsSummary: res.data.data || null });
    } catch {
      set({ creditsSummary: null });
    }
  },

  fetchAdminOrders: async (status?: string, page = 1) => {
    set({ loading: true });
    try {
      const res = await api.get(ENDPOINTS.CREDITS_ADMIN_ORDERS, { params: { status, page, page_size: 20 } });
      set({ adminOrders: res.data.data || [], ordersTotal: res.data.total || 0 });
    } catch {
      set({ adminOrders: [] });
    } finally {
      set({ loading: false });
    }
  },

  fetchOnlineUsers: async () => {
    try {
      const res = await api.get(ENDPOINTS.ADMIN_ONLINE);
      set({ onlineData: res.data.data || null });
    } catch {
      // 轮询失败保留上次数据（避免闪烁），首次失败置 null
      set((s) => ({ onlineData: s.onlineData }));
    }
  },

  confirmOrder: async (orderNo) => {
    const res = await api.post(ENDPOINTS.CREDITS_ADMIN_ORDER_CONFIRM(orderNo));
    get().fetchAdminOrders();
    get().fetchCreditsSummary();
    return res.data.message || '已核销';
  },

  adjustCredits: async (userId, amount, reason) => {
    await api.post(ENDPOINTS.CREDITS_ADMIN_ADJUST, { user_id: userId, amount, reason });
    get().fetchCreditsSummary();
  },

  generateCodes: async (count, credits) => {
    const res = await api.post(ENDPOINTS.CREDITS_ADMIN_CODES, { count, credits });
    return res.data.data?.codes || [];
  },
}));
