import { useEffect, useRef, useState } from 'react';
import { NavLink } from 'react-router-dom';
import { useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useChatStore } from '../../stores/chatStore';
import { useChatStream } from '../../hooks/useChatStream';
import { MessageList } from './MessageList';
import { ChatInput } from './ChatInput';
import api from '../../lib/axios';

interface ChatWindowProps {
  mode: string;
}

const MODE_STYLES: Record<string, { icon: string; bar: string; badge: string }> = {
  science:   { icon: '📚', bar: 'border-blue-300 bg-blue-100/60 dark:bg-blue-900/30 dark:border-blue-700', badge: 'bg-blue-500 text-white dark:bg-blue-600' },
  counseling:{ icon: '🌳', bar: 'border-emerald-300 bg-emerald-100/60 dark:bg-emerald-900/30 dark:border-emerald-700', badge: 'bg-emerald-500 text-white dark:bg-emerald-600' },
  assessment:{ icon: '📊', bar: 'border-orange-300 bg-orange-100/60 dark:bg-orange-900/30 dark:border-orange-700', badge: 'bg-orange-500 text-white dark:bg-orange-600' },
  reading:   { icon: '📖', bar: 'border-purple-300 bg-purple-100/60 dark:bg-purple-900/30 dark:border-purple-700', badge: 'bg-purple-500 text-white dark:bg-purple-600' },
};

export function ChatWindow({ mode }: ChatWindowProps) {
  const { t } = useTranslation();
  const { messages, isStreaming, streamBuffer, lastCost, startNewChat } = useChatStore();
  const { send, cancel } = useChatStream();
  const location = useLocation();
  const autoSentRef = useRef(false);
  const [related, setRelated] = useState<{title:string;page_url:string}[]>([]);
  const lastStreaming = useRef(isStreaming);

  // Each time the mode changes, save old and restore new (persist across navigation)
  useEffect(() => {
    startNewChat(mode);
  }, [mode, startNewChat]);

  // Save current conversation snapshot when leaving this mode
  useEffect(() => {
    return () => {
      const { currentSessionId, messages } = useChatStore.getState();
      if (currentSessionId || messages.length > 0) {
        useChatStore.setState((s) => ({
          snapshots: { ...s.snapshots, [mode]: { sessionId: currentSessionId, messages: [...messages] } },
        }));
      }
    };
  }, [mode]);

  // Auto-send book serial when coming from References page (via navigate state)
  useEffect(() => {
    const bookSerial = (location.state as { bookSerial?: string } | null)?.bookSerial;
    if (bookSerial && !autoSentRef.current && !isStreaming) {
      autoSentRef.current = true;
      // Replace state to prevent re-trigger on back/forward navigation
      window.history.replaceState({}, '');
      // Small delay to ensure chat state is initialized
      const timer = setTimeout(() => {
        send(`${bookSerial} 号书`, 'reading');
      }, 200);
      return () => clearTimeout(timer);
    }
  }, [location.state, isStreaming, send]);

  // 流结束时异步拉取 Wiki 推荐文章（P1-#12）
  useEffect(() => {
    if (lastStreaming.current && !isStreaming) {
      const sid = useChatStore.getState().currentSessionId;
      if (sid) {
        api.get(`/chat/sessions/${sid}/related`).then((res) => {
          setRelated(res.data.data?.articles || []);
        }).catch(() => {});
      }
    }
    lastStreaming.current = isStreaming;
  }, [isStreaming]);

const handleSend = async (content: string, images?: string[]) => {
    setRelated([]);
    await send(content, mode, images);
  };

  const style = MODE_STYLES[mode] || MODE_STYLES.science;
  const modeKey = (['science','counseling','assessment','reading'] as const).find(k => k === mode) || 'science';
  const label = t(`chat.${modeKey}`);

  return (
    <div className="flex flex-col h-full">
      <div className={`px-4 py-2 border-b ${style.bar} flex items-center gap-2`}>
        <span className="text-sm">{style.icon}</span>
        <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${style.badge}`}>
          {label}
        </span>
        <button
          onClick={() => startNewChat(mode, true)}
          className="ml-auto text-xs text-gray-400 hover:text-gray-600 dark:hover:text-zinc-300 px-2 py-0.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
          title={t('chat.clear')}
        >
          ✕ {t('chat.clear')}
        </button>
      </div>

      {/* 4 模式切换 tab */}
      <div className="flex items-center gap-1.5 px-3 py-2 border-b border-gray-100 dark:border-zinc-800 overflow-x-auto">
        {([
          { key: 'science',    label: t('chat.science'),    icon: '🧠' },
          { key: 'counseling', label: t('chat.counseling'), icon: '🌳' },
          { key: 'assessment', label: t('chat.assessment'), icon: '📊' },
          { key: 'reading',    label: t('chat.reading'),    icon: '📖' },
        ] as const).map((m) => {
          const active = mode === m.key;
          return (
            <NavLink
              key={m.key}
              to={`/app/chat/${m.key}`}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap no-underline transition-all
                ${active
                  ? 'bg-primary-500 text-white shadow-sm'
                  : 'text-gray-500 dark:text-zinc-400 hover:bg-gray-100 dark:hover:bg-zinc-800'}`}
            >
              <span>{m.icon}</span>
              <span>{m.label}</span>
            </NavLink>
          );
        })}
      </div>

      {/* 心理评估模式：常驻免责提示（完整声明见欢迎卡） */}
      {mode === 'assessment' && (
        <div className="px-4 py-1.5 text-[10px] leading-relaxed text-center text-amber-700/80 bg-amber-50/60 border-b border-amber-100/80 dark:text-amber-400/70 dark:bg-amber-500/5 dark:border-amber-500/10">
          本评估仅为心理健康筛查参考，不构成医学诊断，不能替代精神科专业诊疗；请理性看待结果。
        </div>
      )}

      <MessageList
        messages={messages}
        isStreaming={isStreaming}
        streamBuffer={streamBuffer}
        mode={mode}
      />

      {related.length > 0 && !isStreaming && (
        <div className="px-4 py-2 text-xs text-gray-500 dark:text-zinc-400 border-t border-gray-100 dark:border-zinc-800">
          <span className="mr-1">{t('chat.related')}</span>
          {related.slice(0, 3).map((a, i) => (
            <span key={a.page_url}>
              <a href={a.page_url} target="_blank" rel="noopener noreferrer"
                 className="text-primary-600 hover:underline">{a.title}</a>
              {i < Math.min(related.length, 3) - 1 && ' · '}
            </span>
          ))}
        </div>
      )}

      {lastCost > 0 && !isStreaming && (
        <div className="px-4 text-[11px] text-gray-500 dark:text-zinc-400 text-center">
          {t('chat.cost', { cost: lastCost, mode: label })}
        </div>
      )}

      <ChatInput
        onSend={handleSend}
        onCancel={cancel}
        isStreaming={isStreaming}
      />
    </div>
  );
}
