import { create } from 'zustand';
import type { MoodEntry, DiaryCreateRequest, DiaryUpdateRequest, DiaryStats } from '../types/diary';
import api from '../lib/axios';
import { ENDPOINTS } from '../config/api';

interface DiaryState {
  entries: MoodEntry[];
  currentEntry: MoodEntry | null;
  stats: DiaryStats | null;
  loading: boolean;
  detailLoading: boolean;
  /** 分页状态 */
  page: number;
  pages: number;
  total: number;
  hasMore: boolean;
  /** 日记编辑草稿，切换页面后保留 */
  draft: DiaryDraft | null;

  fetchEntries: (opts?: { days?: number; search?: string; page?: number }) => Promise<void>;
  fetchEntry: (id: number) => Promise<MoodEntry | null>;
  fetchStats: (days?: number) => Promise<void>;
  createEntry: (data: DiaryCreateRequest) => Promise<void>;
  updateEntry: (id: number, data: DiaryUpdateRequest) => Promise<boolean>;
  deleteEntry: (id: number) => Promise<boolean>;
  setDraft: (draft: DiaryDraft | null) => void;
}

export interface DiaryDraft {
  mood_score: number;
  mood_label: string;
  body_sensation: string;
  note: string;
  weather: string;
  images: string[];
}

export const useDiaryStore = create<DiaryState>()((set) => ({
  entries: [],
  currentEntry: null,
  stats: null,
  loading: false,
  detailLoading: false,
  page: 1,
  pages: 0,
  total: 0,
  hasMore: false,
  draft: null,

  fetchEntries: async ({ days = 0, search = '', page = 1 } = {}) => {
    set({ loading: true });
    try {
      const res = await api.get(ENDPOINTS.DIARY_LIST, {
        params: { days, search, page, page_size: 20 },
      });
      const data = res.data.data || {};
      const items: MoodEntry[] = Array.isArray(data) ? data : data.items || [];
      set({
        entries: items,
        total: data.total ?? items.length,
        page: data.page ?? page,
        pages: data.pages ?? (items.length ? 1 : 0),
        hasMore: data.has_more ?? false,
      });
    } catch {
      set({ entries: [], total: 0, page: 1, pages: 0, hasMore: false });
    } finally {
      set({ loading: false });
    }
  },

  fetchEntry: async (id: number) => {
    set({ detailLoading: true, currentEntry: null });
    try {
      const res = await api.get(ENDPOINTS.DIARY_ENTRY(id));
      const entry: MoodEntry = res.data.data || res.data;
      set({ currentEntry: entry });
      return entry;
    } catch {
      set({ currentEntry: null });
      return null;
    } finally {
      set({ detailLoading: false });
    }
  },

  fetchStats: async (days = 7) => {
    try {
      const res = await api.get(ENDPOINTS.DIARY_STATS, { params: { days } });
      set({ stats: res.data.data || res.data });
    } catch {
      // silent
    }
  },

  createEntry: async (data: DiaryCreateRequest) => {
    await api.post(ENDPOINTS.DIARY_CREATE, data);
  },

  updateEntry: async (id: number, data: DiaryUpdateRequest) => {
    try {
      await api.put(ENDPOINTS.DIARY_UPDATE(id), data);
      return true;
    } catch {
      return false;
    }
  },

  deleteEntry: async (id: number) => {
    try {
      await api.delete(ENDPOINTS.DIARY_DELETE(id));
      return true;
    } catch {
      return false;
    }
  },

  setDraft: (draft) => set({ draft }),
}));
