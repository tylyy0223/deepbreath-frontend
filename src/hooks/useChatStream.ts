import { useCallback, useRef } from 'react';
import { streamChat } from '../lib/sse';
import { useAuthStore } from '../stores/authStore';
import { useChatStore } from '../stores/chatStore';
import { useCreditsStore } from '../stores/creditsStore';
import type { ChatMessage } from '../types/chat';

const API_BASE = '/api/v1';
// 修复: Q&A 缓存从 localStorage 改成 sessionStorage
// 原因: 用户的 chat 内容是敏感心理数据, 不应长期驻留在磁盘
// sessionStorage 关闭浏览器即清, 跨刷新保留 (用户体验不变), 但不会被 XSS 持久化到磁盘
const CACHE_SIZE = 30;
const STORAGE_KEY = 'deepbreath_qa_cache';  // 实际写到 sessionStorage

function loadCache(): Map<string, string> {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
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
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  } catch { /* quota exceeded */ }
}

// 一次性迁移: 把旧 localStorage 里的 qa_cache 迁移到 sessionStorage 并清掉 localStorage
function migrateLegacyLocalStorage() {
  try {
    const old = localStorage.getItem(STORAGE_KEY);
    if (old) {
      sessionStorage.setItem(STORAGE_KEY, old);
      localStorage.removeItem(STORAGE_KEY);
    }
  } catch { /* ignore */ }
}
migrateLegacyLocalStorage();

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
          // 业务错误: 作为系统消息显示在对话里 (402 余额不足 / 429 限速 / 5xx 服务异常 / 网络超时)
          const status = (err as Error & { status?: number }).status;
          const errName = (err as Error).name;
          const errMsg = (err as Error).message || '';

          // 用户主动取消 (AbortController.abort): 静默, 不显示任何东西
          if (errName === 'AbortError' || /aborted/i.test(errMsg)) {
            return;
          }

          let sysContent: string | null = null;

          if (status === 402) {
            // 余额不足
            sysContent = `💎 ${errMsg || '积分不足'}\n\n[前往充值 →](/app/credits)`;
          } else if (status === 429) {
            // 频率限制
            sysContent = `⏳ ${errMsg || '请求过于频繁，请稍后再试'}`;
          } else if (status === 401) {
            // token 失效 (refresh 也救不了, 已强制登出, 不需要显示消息)
            // 让 axios interceptor 处理即可
            return;
          } else if (status && status >= 500) {
            // 后端 5xx: AI 服务异常
            sysContent = `⚠️ AI 服务暂时不可用 (${status})，请稍后重试`;
          } else if (errName === 'TypeError' && /fetch|network|timeout/i.test(errMsg)) {
            // 网络错误 (fetch 失败 / 超时)
            sysContent = `🌐 网络异常，请检查连接后重试`;
          } else if (errMsg) {
            // 兜底: 任何其他有 message 的错误
            sysContent = `❌ ${errMsg}`;
          }

          if (sysContent) {
            const sysMsg: ChatMessage = {
              id: `sys-${Date.now()}`,
              role: 'assistant',
              content: sysContent,
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
