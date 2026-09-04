import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { ChatMessage } from '../../types/chat';
import { useChatStore } from '../../stores/chatStore';
import { useCreditsStore } from '../../stores/creditsStore';
import api from '../../lib/axios';
import { ENDPOINTS } from '../../config/api';
import { playTts, stopTts } from '../../lib/ttsAudio';
import { ShareToCommunityModal } from './ShareToCommunityModal';

function creditsError(err: unknown): string | null {
  const resp = (err as { response?: { status?: number; data?: { detail?: string } } })?.response;
  if (resp?.status === 402) {
    return resp.data?.detail || 'Credits 余额不足，请前往「我的 Credits」充值';
  }
  return null;
}

export function MessageBubble({ message, hasAudio = false }: { message: ChatMessage; hasAudio?: boolean }) {
  const isUser = message.role === 'user';
  const { t } = useTranslation();
  const [playing, setPlaying] = useState(false);
  const [audioBound, setAudioBound] = useState(hasAudio);
  const [showShare, setShowShare] = useState(false);
  const messages = useChatStore((s) => s.messages);
  const { mode = 'science' } = useParams<{ mode: string }>();

  // 批量检测结果异步到达时同步状态
  useEffect(() => {
    if (hasAudio) setAudioBound(true);
  }, [hasAudio]);

  const handleTTS = async () => {
    if (playing) {
      stopTts();
      setPlaying(false);
      return;
    }
    try {
      setPlaying(true);
      const sid = message.session_id || useChatStore.getState().currentSessionId;
      await playTts(message.content, {
        ref: sid ? `session:${sid}` : undefined,
        onEnd: () => setPlaying(false),
      });
      setAudioBound(true); // 生成成功即绑定，可随时重播（免费）
      useCreditsStore.getState().fetchBalance();
    } catch (err) {
      setPlaying(false);
      const msg = creditsError(err);
      if (msg) alert(`💎 ${msg}`);
    }
  };

  const handleEmail = async () => {
    const email = prompt('输入邮箱地址，发送此回复：');
    if (!email) return;
    try {
      await api.post(ENDPOINTS.EMAIL_SEND, { email, content: message.content, subject: '🧠 DeepBreath AI 回复' });
      alert('已发送到 ' + email);
      useCreditsStore.getState().fetchBalance();
    } catch (err) {
      const msg = creditsError(err);
      alert(msg ? `💎 ${msg}` : '发送失败');
    }
  };

  const handleSaveArticle = async () => {
    // Find the preceding user message for the Q&A pair
    const idx = messages.findIndex((m) => m.id === message.id);
    const userMsg = idx > 0 ? messages[idx - 1] : null;
    const question = userMsg?.role === 'user' ? userMsg.content : '（用户提问）';
    const articleContent = `## 💡 问题\n\n${question}\n\n## 🧠 AI 解答\n\n${message.content}`;
    const title = question.length > 30 ? question.slice(0, 30) + '…' : question;

    try {
      await api.post(ENDPOINTS.COMMUNITY_POSTS, {
        title,
        content: articleContent,
        category: 'article',
      });
      alert('已保存到科普文章');
    } catch {
      alert('保存失败');
    }
  };

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div className="group relative">
        <div
          className={`max-w-[80%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed break-words
            ${isUser
              ? 'bg-primary-500 text-white rounded-br-md whitespace-pre-wrap'
              : 'bg-white border border-gray-100 text-gray-700 rounded-bl-md shadow-sm dark:bg-zinc-800 dark:border-zinc-700 dark:text-zinc-300 prose prose-sm max-w-none dark:prose-invert'
            }`}
        >
          {isUser ? (
            <>
              {message.images && message.images.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {message.images.map((url, i) => (
                    <img
                      key={i}
                      src={url}
                      alt=""
                      className="max-w-[200px] max-h-[200px] rounded-lg object-cover cursor-pointer hover:opacity-90 transition-opacity"
                      onClick={() => window.open(url, '_blank')}
                    />
                  ))}
                </div>
              )}
              <span className="whitespace-pre-wrap">{message.content}</span>
            </>
          ) : (
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {message.content}
            </ReactMarkdown>
          )}
        </div>
        {/* AI message actions: TTS + Email — always visible */}
        {!isUser && message.content && (
          <div className="flex gap-1.5 mt-1.5">
            <button
              onClick={handleTTS}
              className={`text-xs px-2.5 py-1 rounded-full border transition-colors
                ${playing
                  ? 'bg-red-50 border-red-200 text-red-500 dark:bg-red-900/20 dark:border-red-800'
                  : 'bg-white border-gray-200 text-gray-500 hover:text-primary-600 hover:border-primary-300 dark:bg-zinc-800 dark:border-zinc-600 dark:text-zinc-400 dark:hover:text-primary-400 dark:hover:border-primary-600'}`}
            >
              {playing ? `⏹ ${t('chat.stop')}` : audioBound ? `🔊 ${t('chat.play_audio')}` : `🎵 ${t('chat.generate_audio')}`}
            </button>
            <button
              onClick={handleEmail}
              className="text-xs px-2.5 py-1 rounded-full border bg-white border-gray-200 text-gray-500 hover:text-primary-600 hover:border-primary-300 transition-colors dark:bg-zinc-800 dark:border-zinc-600 dark:text-zinc-400 dark:hover:text-primary-400 dark:hover:border-primary-600"
            >
              📧 {t('chat.email')}
            </button>
            <button
              onClick={handleSaveArticle}
              className="text-xs px-2.5 py-1 rounded-full border bg-white border-gray-200 text-gray-500 hover:text-primary-600 hover:border-primary-300 transition-colors dark:bg-zinc-800 dark:border-zinc-600 dark:text-zinc-400 dark:hover:text-primary-400 dark:hover:border-primary-600"
            >
              📄 {t('chat.save_article')}
            </button>
            <button
              onClick={() => setShowShare(true)}
              className="text-xs px-2.5 py-1 rounded-full border bg-white border-gray-200 text-gray-500 hover:text-primary-600 hover:border-primary-300 transition-colors dark:bg-zinc-800 dark:border-zinc-600 dark:text-zinc-400 dark:hover:text-primary-400 dark:hover:border-primary-600"
            >
              📢 {t('chat.share')}
            </button>
          </div>
        )}

        {showShare && (
          <ShareToCommunityModal
            content={message.content}
            mode={mode}
            onClose={() => setShowShare(false)}
          />
        )}
      </div>
    </div>
  );
}
