import { useEffect, useMemo, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeSanitize from 'rehype-sanitize';
import { useChatStore } from '../stores/chatStore';
import { Card } from '../components/ui/Card';
import { checkAudioKeys, checkBoundRefs, playTts, stopTts } from '../lib/ttsAudio';

const MODE_LABELS: Record<string, string> = {
  science: '心理科普',
  counseling: '心理树洞',
  assessment: '心理评估',
  reading: '阅读模式',
};

export function SessionsPage() {
  const { sessions, messages, currentSessionId, sessionsLoading, sessionsHasMore, fetchSessions, fetchMoreSessions, selectSession, deleteSession, startNewChat } =
    useChatStore();

  // Generate descriptive titles: use first user message or mode label
  const displayTitles = useMemo(() => {
    const map: Record<number, string> = {};
    for (const s of sessions) {
      const id = s.id!;
      if (s.title && s.title !== '新对话') {
        map[id] = s.title;
      } else {
        const modeName = MODE_LABELS[s.mode || 'science'] || s.mode || 'science';
        map[id] = `${modeName} #${id}`;
      }
    }
    return map;
  }, [sessions]);

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  // 检测存档消息中哪些已有音频（详情页内显示 🔊 小图标，点击免费重播）
  const [audioIds, setAudioIds] = useState<Set<string>>(new Set());
  const [playingId, setPlayingId] = useState<string | null>(null);

  useEffect(() => {
    const aiTexts: Record<string, string> = {};
    messages.forEach((m) => {
      if (m.role !== 'user' && m.content) aiTexts[String(m.id)] = m.content;
    });
    checkAudioKeys(aiTexts).then((keys) => setAudioIds(new Set(keys)));
    return () => stopTts();
  }, [messages]);

  // 批量检测哪些会话已有音频（卡片列表显示 🔊 小图标）
  const [audioSessionIds, setAudioSessionIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (sessions.length === 0) return;
    const refs = sessions.map((s) => `session:${s.id}`);
    checkBoundRefs(refs).then((keys) => setAudioSessionIds(new Set(keys)));
  }, [sessions]);

  const handlePlay = async (id: string, text: string) => {
    if (playingId === id) {
      stopTts();
      setPlayingId(null);
      return;
    }
    setPlayingId(id);
    try {
      await playTts(text, {
        ref: currentSessionId ? `session:${currentSessionId}` : undefined,
        onEnd: () => setPlayingId(null),
      });
    } catch {
      setPlayingId(null);
    }
  };

  const selected = currentSessionId ? sessions.find((s) => s.id === currentSessionId) : null;

  const handleDelete = (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('删除这个对话？')) deleteSession(id);
  };

  return (
    <div className="max-w-4xl mx-auto">
      <h2 className="text-lg font-semibold text-gray-800 dark:text-zinc-200 mb-4">📁 存档会话</h2>

      {/* Detail view */}
      {selected ? (
        <Card className="p-6">
          <button onClick={() => startNewChat()} className="text-sm text-gray-400 hover:text-gray-600 mb-4">
            ← 返回列表
          </button>
          <h1 className="text-xl font-semibold text-gray-800 dark:text-zinc-200 mb-2">
            {displayTitles[selected.id!]}
          </h1>
          <div className="flex items-center gap-2">
            <span className="text-xs text-primary-600 bg-primary-50 dark:bg-primary-900/30 dark:text-primary-400 px-2 py-0.5 rounded-full">
              {MODE_LABELS[selected.mode || 'science'] || selected.mode}
            </span>
            {selected.created_at && (
              <span className="text-xs text-gray-400 dark:text-zinc-500">
                {new Date(selected.created_at).toLocaleDateString('zh-CN')}
              </span>
            )}
            <button
              onClick={(e) => handleDelete(selected.id!, e)}
              className="text-xs text-gray-400 hover:text-red-500 border border-gray-200 px-2 py-0.5 rounded-full"
            >
              🗑 删除
            </button>
          </div>
          <div className="mt-6 space-y-6">
            {messages.length === 0 ? (
              <p className="text-center py-12 text-gray-400 text-sm">该会话没有消息</p>
            ) : (
              messages.map((msg) =>
                msg.role === 'user' ? (
                  <div key={msg.id} className="border-l-4 border-primary-300 dark:border-primary-700 pl-3">
                    <p className="text-sm font-medium text-gray-700 dark:text-zinc-300 whitespace-pre-wrap">
                      {msg.content}
                    </p>
                  </div>
                ) : (
                  <div key={msg.id} className="prose prose-sm prose-gray max-w-none dark:prose-invert">
                    <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeSanitize]}>{msg.content}</ReactMarkdown>
                    {audioIds.has(String(msg.id)) && (
                      <button
                        onClick={() => handlePlay(String(msg.id), msg.content)}
                        className="not-prose inline-flex items-center gap-1 mt-1 text-xs px-2.5 py-1 rounded-full border transition-colors
                          bg-primary-50 border-primary-200 text-primary-700 hover:bg-primary-100
                          dark:bg-primary-900/30 dark:border-primary-700 dark:text-primary-400"
                        title="此内容已生成音频，点击播放"
                      >
                        {playingId === String(msg.id) ? '⏹ 停止' : '🔊 播放音频'}
                      </button>
                    )}
                  </div>
                )
              )
            )}
          </div>
        </Card>
      ) : (
        /* Card grid list */
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {sessions.map((s) => (
              <Card
                key={s.id}
                className="p-5 cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => selectSession(s.id!)}
              >
                <h3 className="font-medium text-gray-800 dark:text-zinc-200 text-sm line-clamp-2">
                  {s.id ? displayTitles[s.id] : '...'}
                </h3>
                <div className="flex items-center gap-3 mt-3 text-xs text-gray-400 dark:text-zinc-500">
                  <span className="bg-gray-100 dark:bg-zinc-700 px-2 py-0.5 rounded-full">
                    {MODE_LABELS[s.mode || 'science'] || s.mode}
                  </span>
                  {audioSessionIds.has(`session:${s.id}`) && <span className="bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400 px-2 py-0.5 rounded-full" title="包含已生成音频的消息">🔊</span>}
                  {s.created_at && <span>{new Date(s.created_at).toLocaleDateString('zh-CN')}</span>}
                  {s.message_count != null && <span>{s.message_count} 条消息</span>}
                  <button
                    onClick={(e) => handleDelete(s.id!, e)}
                    className="text-gray-400 hover:text-red-500 ml-auto"
                    title="删除"
                  >
                    <svg width="14" height="14" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H3a1 1 0 000 2h1v11a2 2 0 002 2h8a2 2 0 002-2V6h1a1 1 0 100-2h-2V3a1 1 0 00-1-1H6zm2 1h4v1H8V3zm-1 4a1 1 0 011 1v6a1 1 0 11-2 0V8a1 1 0 011-1zm5 1a1 1 0 10-2 0v6a1 1 0 102 0V8z" clipRule="evenodd" />
                    </svg>
                  </button>
                </div>
              </Card>
            ))}
            {sessions.length === 0 && (
              <div className="col-span-2 text-center py-12 text-gray-400">
                <span className="text-4xl">📁</span>
                <p className="mt-2 text-sm">暂无对话记录</p>
              </div>
            )}
          </div>
          {sessionsHasMore && (
            <div className="mt-6 text-center">
              <button
                onClick={fetchMoreSessions}
                disabled={sessionsLoading}
                className="px-6 py-2 text-sm text-primary-600 bg-primary-50 border border-primary-200 rounded-xl hover:bg-primary-100 transition-colors disabled:opacity-50 dark:bg-primary-900/20 dark:border-primary-800 dark:text-primary-400"
              >
                {sessionsLoading ? '加载中...' : '加载更多'}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
