import { create } from 'zustand';
import type { ChatSession, ChatMessage, ChatMode } from '../types/chat';
import api from '../lib/axios';
import { ENDPOINTS } from '../config/api';

interface ModeSnapshot {
  sessionId: number | null;
  messages: ChatMessage[];
}

interface ChatState {
  sessions: ChatSession[];
  currentSessionId: number | null;
  messages: ChatMessage[];
  modes: ChatMode[];
  isStreaming: boolean;
  streamBuffer: string;
  lastCost: number;
  /** 每个模式的输入草稿，切换页面后不丢失 */
  drafts: Record<string, string>;
  sessionsLoading: boolean;
  sessionsHasMore: boolean;
  /** 按模式保存会话快照，切换模式后返回不丢失 */
  snapshots: Record<string, ModeSnapshot>;
  lastMode: string | null;

  fetchSessions: () => Promise<void>;
  fetchMoreSessions: () => Promise<void>;
  fetchModes: () => Promise<void>;
  selectSession: (id: number) => Promise<void>;
  createSession: () => Promise<number>;
  deleteSession: (id: number) => Promise<void>;
  startNewChat: (nextMode?: string, forceClear?: boolean) => void;
  sendMessage: (content: string, mode?: string, images?: string[]) => Promise<void>;
  appendStreamChunk: (chunk: string) => void;
  finalizeStream: () => void;
  setStreaming: (v: boolean) => void;
  setLastCost: (v: number) => void;
  setDraft: (mode: string, text: string) => void;
}

export const useChatStore = create<ChatState>()((set, get) => ({
  sessions: [],
  currentSessionId: null,
  messages: [],
  modes: [],
  isStreaming: false,
  streamBuffer: '',
  lastCost: 0,
  drafts: {},
  sessionsLoading: false,
  sessionsHasMore: false,
  snapshots: {},
  lastMode: null,

  fetchSessions: async () => {
    set({ sessionsLoading: true });
    try {
      const res = await api.get(ENDPOINTS.CHAT_SESSIONS, { params: { page: 1, page_size: 20 } });
      const sessions: ChatSession[] = Array.isArray(res.data)
        ? res.data
        : res.data.data || res.data.sessions || res.data.items || [];
      const total = res.data.total ?? sessions.length;
      set({ sessions, sessionsHasMore: sessions.length < total });
    } catch {
      set({ sessions: [], sessionsHasMore: false });
    } finally {
      set({ sessionsLoading: false });
    }
  },

  fetchMoreSessions: async () => {
    const { sessions, sessionsLoading, sessionsHasMore } = get();
    if (sessionsLoading || !sessionsHasMore) return;
    set({ sessionsLoading: true });
    try {
      const page = Math.floor(sessions.length / 20) + 1;
      const res = await api.get(ENDPOINTS.CHAT_SESSIONS, { params: { page, page_size: 20 } });
      const more: ChatSession[] = Array.isArray(res.data)
        ? res.data
        : res.data.data || res.data.sessions || res.data.items || [];
      const total = res.data.total ?? sessions.length;
      const merged = [...sessions, ...more];
      set({ sessions: merged, sessionsHasMore: merged.length < total });
    } catch {
      // keep existing
    } finally {
      set({ sessionsLoading: false });
    }
  },

  fetchModes: async () => {
    try {
      const res = await api.get(ENDPOINTS.CHAT_MODES);
      const modes: ChatMode[] = Array.isArray(res.data)
        ? res.data
        : res.data.data || res.data.modes || [];
      set({ modes });
    } catch {
      // modes is optional
    }
  },

  selectSession: async (id: number) => {
    set({ currentSessionId: id });
    try {
      const res = await api.get(ENDPOINTS.CHAT_MESSAGES(id));
      const messages: ChatMessage[] = Array.isArray(res.data)
        ? res.data
        : res.data.data || res.data.messages || [];
      set({ messages });
    } catch {
      set({ messages: [] });
    }
  },

  createSession: async () => {
    // Actually, create is implicitly done by sending first message without session_id
    // But if the API has a dedicated endpoint, use it:
    try {
      const res = await api.post(ENDPOINTS.CHAT_SESSIONS);
      const body = res.data.data || res.data;
      const id = body.id || body.session_id;
      if (id) {
        set({ currentSessionId: id, messages: [] });
        get().fetchSessions();
        return id;
      }
    } catch {
      // fallback: just use null session_id (will be created on first message)
    }
    set({ currentSessionId: null, messages: [] });
    return 0;
  },

  deleteSession: async (id: number) => {
    await api.delete(ENDPOINTS.CHAT_SESSION_DELETE(id));
    const { currentSessionId } = get();
    if (currentSessionId === id) {
      set({ currentSessionId: null, messages: [] });
    }
    get().fetchSessions();
  },

  sendMessage: async (_content: string, _mode?: string, _images?: string[]) => {
    // The actual SSE streaming is handled by useChatStream hook
    // This just sets initial state
    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: _content,
      images: _images || [],
    };
    set((s) => ({
      messages: [...s.messages, userMsg],
      isStreaming: true,
      streamBuffer: '',
    }));
  },

  appendStreamChunk: (chunk: string) => {
    set((s) => ({ streamBuffer: s.streamBuffer + chunk }));
  },

  finalizeStream: () => {
    const { streamBuffer, messages } = get();
    if (streamBuffer) {
      const aiMsg: ChatMessage = {
        id: `ai-${Date.now()}`,
        role: 'assistant',
        content: streamBuffer,
      };
      set({ messages: [...messages, aiMsg], streamBuffer: '', isStreaming: false });
    } else {
      set({ isStreaming: false });
    }
    // Refresh session list
    get().fetchSessions();
  },

  startNewChat: (nextMode, forceClear = false) => {
    const { currentSessionId, messages, lastMode, snapshots } = get();
    // 同模式清空 → 直接重置，不存档
    if (forceClear) {
      set({
        currentSessionId: null,
        messages: [],
        streamBuffer: '',
        isStreaming: false,
        lastMode: nextMode ?? null,
      });
      return;
    }
    // Save current mode's state before switching
    if (lastMode && (currentSessionId || messages.length > 0)) {
      snapshots[lastMode] = { sessionId: currentSessionId, messages: [...messages] };
    }
    // Restore next mode's snapshot if available; else fresh start
    const saved = nextMode ? snapshots[nextMode] : null;
    set({
      currentSessionId: saved?.sessionId ?? null,
      messages: saved?.messages ?? [],
      streamBuffer: '',
      isStreaming: false,
      snapshots: { ...snapshots },
      lastMode: nextMode ?? null,
    });
  },

  setStreaming: (v: boolean) => set({ isStreaming: v }),

  setLastCost: (v: number) => set({ lastCost: v }),

  setDraft: (mode: string, text: string) => set((s) => ({ drafts: { ...s.drafts, [mode]: text } })),
}));
