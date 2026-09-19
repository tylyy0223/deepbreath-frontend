import { useEffect, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeSanitize from 'rehype-sanitize';

// 4 模式专属等待文案池（每 1.5s 轮播，给"事情在发生"的感觉）
const MODE_HINTS: Record<string, { emoji: string; hints: string[] }> = {
  science: {
    emoji: '🔬',
    hints: ['🔬 查阅心理学文献...', '🔍 检索相关研究...', '✍️ 组织科普语言...', '💡 整理答案中...'],
  },
  counseling: {
    emoji: '🌳',
    hints: ['🌳 安静听你说...', '💭 感受你的情绪...', '🫂 准备回应你...', '✨ 整理思绪中...'],
  },
  assessment: {
    emoji: '📋',
    hints: ['📋 梳理评估维度...', '🎯 分析你的状态...', '📝 准备下一个问题...', '🔄 整理评估思路...'],
  },
  reading: {
    emoji: '📚',
    hints: ['📚 翻到书中段落...', '🔖 检索原文内容...', '💡 联系你的问题...', '📖 整理读书笔记...'],
  },
};

// 轮播间隔（毫秒）
const HINT_ROTATE_MS = 1800;

interface StreamingMessageProps {
  content: string;
  mode?: string;
}

export function StreamingMessage({ content, mode = 'science' }: StreamingMessageProps) {
  // 首字节前的等待阶段：轮播模式专属文案 + 呼吸光晕
  const [hintIdx, setHintIdx] = useState(0);

  useEffect(() => {
    if (content) return; // 已有内容时不需要轮播
    const t = setInterval(() => {
      setHintIdx((i) => (i + 1) % MODE_HINTS[mode].hints.length);
    }, HINT_ROTATE_MS);
    return () => clearInterval(t);
  }, [content, mode]);

  if (!content) {
    const cfg = MODE_HINTS[mode] || MODE_HINTS.science;
    const hint = cfg.hints[hintIdx];
    return (
      <div className="flex justify-start">
        <div className="bg-white border border-gray-100 rounded-2xl rounded-bl-md px-5 py-3 shadow-sm dark:bg-zinc-800 dark:border-zinc-700">
          <div className="flex items-center gap-2.5">
            {/* 呼吸光晕 + 三点脉冲（"假进度"反馈） */}
            <div className="relative flex items-center justify-center w-5 h-5">
              <span
                className="absolute inset-0 rounded-full bg-primary-400/30 animate-ping"
                style={{ animationDuration: '2s' }}
              />
              <span className="relative w-2 h-2 rounded-full bg-primary-500" />
            </div>
            <span
              className="text-xs text-gray-500 dark:text-zinc-400 transition-opacity duration-300"
              key={hintIdx} // 强制重渲染触发淡入
            >
              {hint}
            </span>
          </div>
        </div>
      </div>
    );
  }

  // 流式打字机阶段：内容 + 闪烁光标
  return (
    <div className="flex justify-start">
      <div className="max-w-[80%] px-4 py-2.5 rounded-2xl rounded-bl-md text-sm leading-relaxed break-words bg-white border border-gray-100 text-gray-700 shadow-sm dark:bg-zinc-800 dark:border-zinc-700 dark:text-zinc-300 prose prose-sm dark:prose-invert max-w-none">
        <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeSanitize]}>
          {content}
        </ReactMarkdown>
        <span className="inline-block w-1.5 h-4 ml-0.5 bg-primary-400 rounded-sm animate-blink align-text-bottom" />
      </div>
    </div>
  );
}
