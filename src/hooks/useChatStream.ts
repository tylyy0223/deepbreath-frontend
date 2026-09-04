import { useCallback, useRef } from 'react';
import { streamChat } from '../lib/sse';
import { useAuthStore } from '../stores/authStore';
import { useChatStore } from '../stores/chatStore';
import { useCreditsStore } from '../stores/creditsStore';
import type { ChatMessage } from '../types/chat';

const API_BASE = '/api/v1';
const CACHE_SIZE = 200;
const STORAGE_KEY = 'deepbreath_qa_cache';

// Persistent Q&A cache (survives page refreshes)
function loadCache(): Map<string, string> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const entries: [string, string][] = JSON.parse(raw);
      return new Map(entries);
    }
  } catch { /* corrupted, start fresh */ }
  return new Map();
}

function persistCache(cache: Map<string, string>) {
  try {
    const entries = Array.from(cache.entries());
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  } catch { /* quota exceeded */ }
}

function cacheKey(question: string, mode: string): string {
  return `${mode}::${question.trim()}`;
}

// Load persistent cache at module init
const cache = loadCache();

export function useChatStream() {
  const abortRef = useRef<AbortController | null>(null);

  const send = useCallback(async (message: string, mode?: string, images?: string[]) => {
    abortRef.current?.abort();
    abortRef.current = new AbortController();

    const token = useAuthStore.getState().accessToken;
    if (!token) return;

    const store = useChatStore.getState();
    const sessionId = store.currentSessionId;
    const currentMode = mode || 'science';
    const imageList = images || [];

    // Check cache for exact same question (skip if cached answer is an error)
    const key = cacheKey(message, currentMode);
    const cached = cache.get(key);
    if (cached && !cached.startsWith('抱歉，AI 服务') && imageList.length === 0) {
      const userMsg: ChatMessage = { id: `user-${Date.now()}`, role: 'user', content: message };
      const aiMsg: ChatMessage = { id: `ai-${Date.now()}`, role: 'assistant', content: cached + '\n\n_（来自缓存）_' };
      useChatStore.setState((s) => ({
        messages: [...s.messages, userMsg, aiMsg],
      }));
      return;
    }
    // Remove stale error-cache entry so next time won't hit it either
    if (cached) {
      cache.delete(key);
      persistCache(cache);
    }

    store.sendMessage(message, currentMode, imageList);

    await streamChat(
      `${API_BASE}/chat/send`,
      {
        message,
        session_id: sessionId || null,
        mode: currentMode,
        use_rag: true,
        images: imageList.length > 0 ? imageList : undefined,
      },
      token,
      {
        onChunk: (text) => useChatStore.getState().appendStreamChunk(text),
        onDone: (cost) => {
          const state = useChatStore.getState();
          if (typeof cost === 'number') {
            state.setLastCost(cost);
          }
          // Cache the completed answer (skip errors)
          if (state.streamBuffer && !state.streamBuffer.startsWith('抱歉，AI 服务')) {
            cache.set(key, state.streamBuffer);
            // Keep cache bounded
            if (cache.size > CACHE_SIZE) {
              const first = cache.keys().next().value;
              if (first) cache.delete(first);
            }
            persistCache(cache);
          }
          state.finalizeStream();
          useCreditsStore.getState().fetchBalance();
          if (!sessionId) {
            state.fetchSessions().then(() => {
              const sessions = useChatStore.getState().sessions;
              if (sessions.length > 0) {
                const latest = sessions.reduce((a, b) =>
                  (a.id || 0) > (b.id || 0) ? a : b
                );
                useChatStore.setState({ currentSessionId: latest.id });
              }
            });
          }
        },
        onError: (err) => {
          const state = useChatStore.getState();
          state.setStreaming(false);
          // 余额不足等业务错误：作为系统消息显示在对话里
          const status = (err as Error & { status?: number }).status;
          if (status === 402) {
            const sysMsg: ChatMessage = {
              id: `sys-${Date.now()}`,
              role: 'assistant',
              content: `💎 ${err.message}\n\n[前往充值 →](/app/credits)`,
            };
            useChatStore.setState((s) => ({ messages: [...s.messages, sysMsg] }));
          } else if (status === 429) {
            // 限流：提示稍后再试，不清空输入
            const sysMsg: ChatMessage = {
              id: `sys-${Date.now()}`,
              role: 'assistant',
              content: `⏳ ${err.message}`,
            };
            useChatStore.setState((s) => ({ messages: [...s.messages, sysMsg] }));
          }
        },
      },
      abortRef.current.signal,
    );
  }, []);

  const cancel = useCallback(() => {
    abortRef.current?.abort();
    useChatStore.getState().setStreaming(false);
  }, []);

  return { send, cancel };
}
