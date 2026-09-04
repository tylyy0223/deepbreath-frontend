import { create } from 'zustand';
import api from '../lib/axios';
import { ENDPOINTS } from '../config/api';

export interface ScaleMeta {
  id: string;
  name: string;
  name_en: string;
  emoji: string;
  description: string;
  time_estimate: string;
  questions_count: number;
  max_score: number;
}

export interface ScaleQuestion { num: number; text: string }
export interface ScaleOption { value: number; label: string }

export interface ScaleDetail extends ScaleMeta {
  questions: ScaleQuestion[];
  options: ScaleOption[];
}

export interface ScaleDimension {
  name: string;
  icon: string;
  score: number;
  avg: number;
  item_count: number;
}

export interface ScaleResult {
  result_id?: number;
  scale_id: string;
  level: string;
  description: string;
  // SDS/SAS
  raw_score?: number;
  standard_score?: number;
  max_raw?: number;
  // SCL-90
  gsi?: number;
  pst?: number;
  psd?: number;
  dimensions?: ScaleDimension[];
  highlights?: ScaleDimension[];
}

export interface ScaleHistoryItem {
  id: number;
  scale_id: string;
  scale_name: string;
  emoji: string;
  raw_score: number;
  standard_score: number;
  level: string;
  result: ScaleResult;
  created_at: string | null;
}

interface ScalesState {
  scales: ScaleMeta[];
  current: ScaleDetail | null;
  history: ScaleHistoryItem[];
  loading: boolean;

  fetchScales: () => Promise<void>;
  fetchScale: (id: string) => Promise<void>;
  submit: (id: string, answers: Record<string, number>) => Promise<ScaleResult>;
  fetchHistory: () => Promise<void>;
}

export const useScalesStore = create<ScalesState>()((set, get) => ({
  scales: [],
  current: null,
  history: [],
  loading: false,

  fetchScales: async () => {
    try {
      const res = await api.get(ENDPOINTS.SCALES);
      // 解包后 res.data 已是数组；兼容未解包的 {data:[...]} 格式
      const list = Array.isArray(res.data) ? res.data : (res.data?.data || []);
      set({ scales: list });
    } catch { /* silent */ }
  },

  fetchScale: async (id: string) => {
    set({ loading: true, current: null });
    try {
      const res = await api.get(ENDPOINTS.SCALE(id));
      set({ current: res.data?.data || res.data || null });
    } catch {
      set({ current: null });
    } finally {
      set({ loading: false });
    }
  },

  submit: async (id, answers) => {
    const res = await api.post(ENDPOINTS.SCALE_SUBMIT(id), { answers });
    get().fetchHistory();
    return res.data.data;
  },

  fetchHistory: async () => {
    try {
      const res = await api.get(ENDPOINTS.SCALES_HISTORY);
      set({ history: res.data.data || [] });
    } catch { /* silent */ }
  },
}));
