import { create } from 'zustand';
import type { BreathExercise, BreathExerciseDetail, BreathPhase, BreathHistoryItem, BreathStats } from '../types/breath';
import api from '../lib/axios';
import { ENDPOINTS } from '../config/api';

// Backend returns {title, duration_sec, technique_type}; map to frontend shape
function mapExercise(e: Record<string, unknown>): BreathExercise {
  return {
    id: e.id as number,
    name: (e.name || e.title || '') as string,
    description: (e.description || '') as string,
    duration_min: (e.duration_min as number) ?? Math.max(1, Math.round(((e.duration_sec as number) || 60) / 60)),
    pattern: (e.pattern || e.technique_type) as string | undefined,
  };
}

interface BreathState {
  exercises: BreathExercise[];
  activeExercise: BreathExerciseDetail | null;
  history: BreathHistoryItem[];
  stats: BreathStats | null;
  isActive: boolean;
  phase: BreathPhase;
  cycleCount: number;
  elapsedSeconds: number;
  totalCycles: number;

  fetchExercises: () => Promise<void>;
  fetchExerciseDetail: (id: number) => Promise<void>;
  fetchHistory: () => Promise<void>;
  fetchStats: () => Promise<void>;
  setPhase: (phase: BreathPhase) => void;
  setCycleCount: (count: number) => void;
  incrementElapsed: () => void;
  startExercise: (id: number) => Promise<void>;
  completeExercise: (durationSec: number) => Promise<void>;
  reset: () => void;
}

export const useBreathStore = create<BreathState>()((set, get) => ({
  exercises: [],
  activeExercise: null,
  history: [],
  stats: null,
  isActive: false,
  phase: 'idle',
  cycleCount: 0,
  elapsedSeconds: 0,
  totalCycles: 10,

  fetchExercises: async () => {
    try {
      const res = await api.get(ENDPOINTS.BREATH_EXERCISES);
      const raw: Record<string, unknown>[] = Array.isArray(res.data)
        ? res.data
        : res.data.data || res.data.exercises || [];
      set({ exercises: raw.map(mapExercise) });
    } catch {
      // silent
    }
  },

  fetchExerciseDetail: async (id: number) => {
    try {
      const res = await api.get(ENDPOINTS.BREATH_EXERCISE(id));
      const detail = mapExercise(res.data.data || res.data) as BreathExerciseDetail;
      set({ activeExercise: detail, totalCycles: detail.cycles || 10 });
    } catch {
      // fallback from exercises list
      const found = get().exercises.find((e) => e.id === id);
      if (found) {
        set({ activeExercise: found as BreathExerciseDetail, totalCycles: 10 });
      }
    }
  },

  fetchHistory: async () => {
    try {
      const res = await api.get(ENDPOINTS.BREATH_HISTORY);
      const history: BreathHistoryItem[] = res.data.data || [];
      set({ history });
    } catch {
      // silent
    }
  },

  fetchStats: async () => {
    try {
      const res = await api.get(ENDPOINTS.BREATH_STATS);
      set({ stats: res.data.data || null });
    } catch {
      // silent
    }
  },

  setPhase: (phase) => set({ phase }),
  setCycleCount: (count) => set({ cycleCount: count }),
  incrementElapsed: () => set((s) => ({ elapsedSeconds: s.elapsedSeconds + 1 })),

  startExercise: async (id: number) => {
    await get().fetchExerciseDetail(id);
    set({ isActive: true, phase: 'inhale', cycleCount: 0, elapsedSeconds: 0 });
  },

  completeExercise: async (durationSec: number) => {
    const ex = get().activeExercise;
    if (!ex) return;
    try {
      await api.post(ENDPOINTS.BREATH_COMPLETE, {
        exercise_id: ex.id,
        duration_sec: durationSec,
        completed: true,
      });
      // refresh personal stats & history
      get().fetchStats();
      get().fetchHistory();
    } catch {
      // silent
    }
    set({ isActive: false, phase: 'idle' });
  },

  reset: () =>
    set({
      isActive: false,
      phase: 'idle',
      cycleCount: 0,
      elapsedSeconds: 0,
      activeExercise: null,
    }),
}));
