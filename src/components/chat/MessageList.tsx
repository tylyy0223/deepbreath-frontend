import { useEffect, useState } from 'react';
import type { ChatMessage } from '../../types/chat';
import { MessageBubble } from './MessageBubble';
import { StreamingMessage } from './StreamingMessage';
import { checkAudioKeys } from '../../lib/ttsAudio';

interface MessageListProps {
  messages: ChatMessage[];
  isStreaming: boolean;
  streamBuffer: string;
  mode: string;
}

const WELCOME: Record<string, { title: string; desc: string; tips?: string[] }> = {
  science: {
    title: '心理科普助手',
    desc: '用科学心理学知识解答你的疑问',
    tips: ['什么是依恋理论？', '巴甫洛夫的狗实验是什么？', '如何用心理学解释拖延症？'],
  },
  counseling: {
    title: '心理树洞',
    desc: '想象面前有一棵大树，上面有个树洞，你可以对着它说出心里话，不用担心被批评或泄露。释放压力、整理情绪，把烦恼说出来！',
    tips: ['最近压力很大，想找人聊聊', '我总是不自信怎么办？', '和家人的关系让我困扰'],
  },
  assessment: {
    title: '心理评估助手',
    desc: '通过系统性的提问，帮你梳理和了解自己的心理状态',
    tips: ['想了解自己的情绪状态', '探索我的人格特质', '分析我的行为模式'],
  },
  reading: {
    title: '读书助手',
    desc: '告诉我「参考文献」中电子书的编号，即可进行整书的学习和研究；也可以直接提问',
    tips: ['学习 42 号书', '给我讲讲 79 号书的核心观点', '认知行为疗法是什么？'],
  },
};

export function MessageList({ messages, isStreaming, streamBuffer, mode }: MessageListProps) {
  const [audioIds, setAudioIds] = useState<Set<string>>(new Set());

  // 批量检测当前列表哪些 AI 消息已有音频（debounce：消息不变化就不重复请求）
  useEffect(() => {
    const aiOnly: Record<string, string> = {};
    messages.forEach((m) => {
      if (m.role === 'assistant' && m.content) {
        aiOnly[String(m.id || m.created_at || '')] = m.content;
      }
    });
    checkAudioKeys(aiOnly).then((keys) => setAudioIds(new Set(keys)));
  }, [messages]);

  if (messages.length === 0 && !isStreaming) {
    const w = WELCOME[mode] || WELCOME.science;
    return (
      <div className="flex-1 flex items-center justify-center px-4">
        <div className="text-center max-w-sm">
          <span className="text-5xl">🍃</span>
          <h2 className="mt-4 text-xl font-semibold text-gray-700 dark:text-zinc-300">{w.title}</h2>
          <p className="mt-2 text-sm text-gray-400">{w.desc}</p>
          {w.tips && (
            <div className="mt-6 space-y-2">
              {w.tips.map((tip, i) => (
                <p key={i} className="text-xs text-gray-400 dark:text-zinc-500">「{tip}」</p>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
      {messages.map((msg) => (
        <MessageBubble
          key={msg.id}
          message={msg}
          hasAudio={audioIds.has(String(msg.id || msg.created_at || ''))}
        />
      ))}
      {isStreaming && <StreamingMessage content={streamBuffer} />}
      <div id="scroll-bottom" />
    </div>
  );
}
