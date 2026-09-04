import { create } from 'zustand';
import type { CheckInResult, CheckInStatus, CheckInCalendar, CheckInHistory, CheckInStats } from '../types/checkin';
import api from '../lib/axios';

interface CheckInState {
  // data
  status: CheckInStatus | null;
  calendar: CheckInCalendar | null;
  history: CheckInHistory | null;
  stats: CheckInStats | null;
  // ui
  loading: boolean;
  checkingIn: boolean;
  error: string | null;

  // actions
  doCheckin: () => Promise<CheckInResult>;
  fetchStatus: () => Promise<void>;
  fetchCalendar: (year?: number, month?: number) => Promise<void>;
  fetchHistory: (page?: number, pageSize?: number) => Promise<void>;
  fetchStats: () => Promise<void>;
  clearError: () => void;
}

export const useCheckInStore = create<CheckInState>((set) => ({
  status: null,
  calendar: null,
  history: null,
  stats: null,
  loading: false,
  checkingIn: false,
  error: null,

  doCheckin: async () => {
    set({ checkingIn: true, error: null });
    try {
      const res = await api.post('/checkin');
      const data = res.data?.data || res.data;
      set(() => ({
        checkingIn: false,
        status: {
          checked_today: true,
          current_streak: data.streak,
          longest_streak: data.longest_streak,
          total_checkins: data.total_checkins,
          total_credits_earned: data.total_credits,
          today_reward: 0,
        },
      }));
      // refresh calendar & stats after checkin
      return data as CheckInResult;
    } catch (err: any) {
      const msg = err.response?.data?.detail || '签到失败，请稍后重试';
      set({ checkingIn: false, error: msg });
      throw err;
    }
  },

  fetchStatus: async () => {
    set({ loading: true, error: null });
    try {
      const res = await api.get('/checkin/status');
      set({ status: res.data?.data || res.data, loading: false });
    } catch (err: any) {
      set({ loading: false, error: '加载签到状态失败' });
    }
  },

  fetchCalendar: async (year?: number, month?: number) => {
    set({ loading: true });
    try {
      const now = new Date();
      const params = new URLSearchParams();
      if (year) params.set('year', String(year));
      if (month) params.set('month', String(month));
      else {
        params.set('year', String(now.getFullYear()));
        params.set('month', String(now.getMonth() + 1));
      }
      const res = await api.get(`/checkin/calendar?${params.toString()}`);
      set({ calendar: res.data?.data || res.data, loading: false });
    } catch {
      set({ loading: false });
    }
  },

  fetchHistory: async (page = 1, pageSize = 30) => {
    set({ loading: true });
    try {
      const res = await api.get(`/checkin/history?page=${page}&page_size=${pageSize}`);
      set({ history: res.data?.data || res.data, loading: false });
    } catch {
      set({ loading: false });
    }
  },

  fetchStats: async () => {
    try {
      const res = await api.get('/checkin/stats');
      set({ stats: res.data?.data || res.data });
    } catch {
      // stats are non-critical
    }
  },

  clearError: () => set({ error: null }),
}));
