import { useState, useRef, useEffect, useCallback, type KeyboardEvent } from 'react';
import { Button } from '../ui/Button';
import { useChatStore } from '../../stores/chatStore';
import { token } from '../../lib/token';
import api from '../../lib/axios';

interface ChatInputProps {
  onSend: (message: string, images?: string[]) => void;
  onCancel: () => void;
  isStreaming: boolean;
  disabled?: boolean;
  mode?: string;
}

// 修复: 输入历史从 localStorage 改 sessionStorage (关闭浏览器即清)
// 原因: 用户发送的可能是心理问题/个人敏感信息, 不应长期驻留磁盘
const MAX_HISTORY = 5;
const STORAGE_KEY = 'deepbreath_input_history';  // 实际写到 sessionStorage

function loadHistory(): string[] {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function saveHistory(history: string[]) {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(history.slice(0, MAX_HISTORY)));
  } catch { /* quota */ }
}

// 一次性迁移: 旧 localStorage 数据搬过来 + 清掉
try {
  const legacy = localStorage.getItem(STORAGE_KEY);
  if (legacy && !sessionStorage.getItem(STORAGE_KEY)) {
    sessionStorage.setItem(STORAGE_KEY, legacy);
    localStorage.removeItem(STORAGE_KEY);
  }
} catch { /* ignore */ }

export function ChatInput({ onSend, onCancel, isStreaming, disabled, mode }: ChatInputProps) {
  const draft = useChatStore((s) => s.drafts[mode || 'science'] || '');
  const setDraft = useChatStore((s) => s.setDraft);
  const [input, setInput] = useState(draft);
  const [history, setHistory] = useState<string[]>(loadHistory);
  const [images, setImages] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync draft from store on mount / mode change
  useEffect(() => {
    setInput(draft);
  }, [mode]); // eslint-disable-line react-hooks/exhaustive-deps
  const [showHistory, setShowHistory] = useState(false);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // ---- 语音输入（微信式录音）----
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [recError, setRecError] = useState('');
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);

  const stopRecording = useCallback(() => {
    setIsRecording(false);
    try { mediaRecorderRef.current?.stop(); } catch { /* noop */ }
    try { streamRef.current?.getTracks().forEach((t) => t.stop()); } catch { /* noop */ }
  }, []);

  const handleToggleRecord = useCallback(async () => {
    if (isTranscribing) {
      setRecError('正在识别语音，请稍候…');
      return;
    }
    if (isRecording) {
      stopRecording();
      return;
    }
    setRecError('');
    if (!window.isSecureContext) {
      setRecError('录音需要 HTTPS 安全连接，请改用 https://47.103.62.70/app/ 访问');
      return;
    }
    if (!navigator.mediaDevices?.getUserMedia) {
      setRecError('当前浏览器不支持录音');
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const mime = MediaRecorder.isTypeSupported('audio/webm')
        ? 'audio/webm'
        : MediaRecorder.isTypeSupported('audio/mp4')
          ? 'audio/mp4'
          : '';
      const recorder = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
      mediaRecorderRef.current = recorder;
      chunksRef.current = [];
      recorder.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      recorder.onstop = async () => {
        setIsRecording(false);
        try { streamRef.current?.getTracks().forEach((t) => t.stop()); } catch { /* noop */ }
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || 'audio/webm' });
        if (blob.size < 1000) {
          setRecError('录音太短，请至少说话 1 秒');
          return;
        }
        setIsTranscribing(true);
        try {
          const fd = new FormData();
          const ext = (blob.type.includes('mp4') || blob.type.includes('aac')) ? 'm4a' : 'webm';
          fd.append('file', blob, `voice-${Date.now()}.${ext}`);
          const res = await api.post('/audio/transcribe', fd, {
            headers: { 'Content-Type': 'multipart/form-data' },
            timeout: 90000,
          });
          const text = res.data?.data?.text || '';
          if (!text) {
            setRecError('未识别到语音内容，请再试一次');
          } else {
            const currentDraft = useChatStore.getState().drafts[mode || 'science'] || '';
            setInput((prev) => (prev ? prev + ' ' : '') + text);
            setDraft(mode || 'science', (currentDraft ? currentDraft + ' ' : '') + text);
            textareaRef.current?.focus();
          }
        } catch (e: any) {
          setRecError(e?.response?.data?.detail || '语音识别失败，请稍后再试');
        } finally {
          setIsTranscribing(false);
        }
      };
      recorder.start();
      setIsRecording(true);
    } catch (e: any) {
      const errName = e?.name || '';
      if (errName === 'NotAllowedError' || errName === 'PermissionDeniedError') {
        setRecError('麦克风权限被拒绝，请在浏览器设置中允许访问麦克风后重试');
      } else if (errName === 'NotFoundError' || errName === 'DevicesNotFoundError') {
        setRecError('未检测到麦克风设备，请检查手机麦克风是否可用');
      } else if (errName === 'NotReadableError') {
        setRecError('麦克风被其他应用占用，请关闭其他录音应用后重试');
      } else {
        setRecError('无法访问麦克风，请检查浏览器权限');
      }
    }
  }, [isRecording, isTranscribing, mode, setDraft, stopRecording]);

  // 组件卸载时清理
  useEffect(() => {
    return () => {
      try { mediaRecorderRef.current?.stop(); } catch { /* noop */ }
      try { streamRef.current?.getTracks().forEach((t) => t.stop()); } catch { /* noop */ }
    };
  }, []);

  // Auto-resize
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = '0px';
    el.style.height = Math.min(el.scrollHeight, 160) + 'px';
  }, [input]);

  // 聚焦时通知父级滚动（resolve 键盘遮挡的最后防护）
  const handleFocus = useCallback(() => {
    if (history.length > 0) setShowHistory(true);
    // 延迟等待键盘弹起后重新布局，再将输入框滚入视口
    setTimeout(() => {
      textareaRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }, 350);
  }, [history.length]);

  // Close history on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowHistory(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const addToHistory = useCallback((text: string) => {
    setHistory((prev) => {
      const filtered = prev.filter((h) => h !== text);
      const next = [text, ...filtered].slice(0, MAX_HISTORY);
      saveHistory(next);
      return next;
    });
  }, []);

  // ---- 图片上传（贴图）----
  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setUploading(true);
    const newImages: string[] = [...images];
    for (const file of Array.from(files)) {
      if (!file.type.startsWith('image/')) continue;
      const formData = new FormData();
      formData.append('file', file);
      try {
        const tok = token.getAccess();
        const res = await fetch('/api/v1/upload/image', {
          method: 'POST',
          headers: tok ? { Authorization: `Bearer ${tok}` } : {},
          body: formData,
        });
        if (res.ok) {
          const json = await res.json();
          if (json.data?.url) newImages.push(json.data.url);
        }
      } catch { /* skip */ }
    }
    setImages(newImages);
    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeImage = (index: number) => {
    setImages(images.filter((_, i) => i !== index));
  };

  const handleSend = () => {
    const trimmed = input.trim();
    if ((!trimmed && images.length === 0) || isStreaming) return;
    if (trimmed) addToHistory(trimmed);
    onSend(trimmed || ' ', images.length > 0 ? images : undefined);
    setInput('');
    setImages([]);
    setDraft(mode || 'science', '');
    setShowHistory(false);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
      return;
    }

    // Arrow up: navigate history
    if (e.key === 'ArrowUp' && !input && history.length > 0) {
      e.preventDefault();
      const nextIdx = Math.min(historyIndex + 1, history.length - 1);
      setHistoryIndex(nextIdx);
      setInput(history[nextIdx]);
      return;
    }

    // Arrow down: go back in history
    if (e.key === 'ArrowDown' && historyIndex >= 0) {
      e.preventDefault();
      if (historyIndex === 0) {
        setHistoryIndex(-1);
        setInput('');
      } else {
        const nextIdx = historyIndex - 1;
        setHistoryIndex(nextIdx);
        setInput(history[nextIdx]);
      }
      return;
    }

    // Reset history index on manual typing
    setHistoryIndex(-1);
  };

  const selectHistory = (text: string) => {
    setInput(text);
    setShowHistory(false);
    textareaRef.current?.focus();
  };

  return (
    <div className="border-t border-gray-100 bg-white dark:bg-zinc-900 dark:border-zinc-700 px-4 py-3">
      <div className="relative max-w-3xl mx-auto" ref={containerRef}>
        {/* History dropdown */}
        {showHistory && history.length > 0 && (
          <div className="absolute bottom-full left-0 right-0 mb-1 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden dark:bg-zinc-800 dark:border-zinc-600 z-20">
            <div className="px-3 py-1.5 text-xs text-gray-400 dark:text-zinc-500 border-b border-gray-100 dark:border-zinc-700">
              最近输入（↑ 键快速选择）
            </div>
            {history.map((h, i) => (
              <button
                key={i}
                onClick={() => selectHistory(h)}
                className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 truncate dark:text-zinc-300 dark:hover:bg-zinc-700"
              >
                {h}
              </button>
            ))}
          </div>
        )}

        {/* Image previews */}
        {images.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-2">
            {images.map((url, i) => (
              <div key={i} className="relative w-16 h-16 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
                <img src={url} alt="" className="w-full h-full object-cover" />
                <button
                  type="button"
                  onClick={() => removeImage(i)}
                  className="absolute top-0.5 right-0.5 w-4 h-4 flex items-center justify-center
                    bg-black/50 text-white text-[10px] rounded-full hover:bg-black/70"
                  aria-label="删除图片"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="flex items-end gap-2">
          {/* Upload button */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            onChange={handleUpload}
            className="hidden"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={disabled || uploading}
            className="flex-shrink-0 w-9 h-9 flex items-center justify-center text-gray-400
              hover:text-primary-500 hover:bg-primary-50 rounded-xl transition-colors
              disabled:opacity-50 dark:hover:bg-zinc-700"
            title="上传图片"
          >
            {uploading ? (
              <span className="text-xs animate-spin">⏳</span>
            ) : (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                <circle cx="8.5" cy="8.5" r="1.5" />
                <polyline points="21 15 16 10 5 21" />
              </svg>
            )}
          </button>
          <textarea
            id="chat-input"
            name="message"
            ref={textareaRef}
            value={input}
            onChange={(e) => { const v = e.target.value; setInput(v); setDraft(mode || 'science', v); setHistoryIndex(-1); }}
            onKeyDown={handleKeyDown}
            onFocus={handleFocus}
            placeholder="输入消息... (Enter 发送，Shift+Enter 换行，↑ 历史)"
            rows={1}
            disabled={disabled}
            className="flex-1 resize-none text-sm px-3 py-2 border border-gray-200 rounded-xl leading-relaxed
              focus:outline-none focus:ring-2 focus:ring-primary-300 focus:border-transparent
              placeholder:text-gray-400 disabled:bg-gray-50 overflow-y-auto
              dark:bg-zinc-800 dark:border-zinc-600 dark:text-zinc-200 dark:placeholder:text-zinc-500"
          />
          {isTranscribing && (
            <span className="text-xs text-primary-600 dark:text-primary-400 shrink-0 animate-pulse">
              识别中…
            </span>
          )}
          <button
            type="button"
            onClick={handleToggleRecord}
            disabled={disabled}
            title={isRecording ? '点击停止录音' : isTranscribing ? '正在识别…' : '点击开始录音（语音转文字）'}
            className={`shrink-0 w-9 h-9 rounded-full flex items-center justify-center transition-colors
              ${isRecording
                ? 'bg-red-500 text-white animate-pulse'
                : isTranscribing
                  ? 'bg-primary-100 text-primary-600 dark:bg-zinc-600 dark:text-primary-400'
                  : 'bg-gray-100 text-gray-500 hover:bg-gray-200 dark:bg-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-600'}
              disabled:opacity-50`}
          >
            {isRecording ? (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="6" width="12" height="12" rx="2" /></svg>
            ) : isTranscribing ? (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" className="animate-spin">
                <path d="M21 12a9 9 0 1 1-6.219-8.56" />
              </svg>
            ) : (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                <line x1="12" y1="19" x2="12" y2="23" />
                <line x1="8" y1="23" x2="16" y2="23" />
              </svg>
            )}
          </button>
          {isStreaming ? (
            <Button variant="danger" size="sm" onClick={onCancel}>
              停止
            </Button>
          ) : (
            <Button
              size="sm"
              onClick={handleSend}
              disabled={(!input.trim() && images.length === 0) || disabled}
            >
              发送
            </Button>
          )}
        </div>
        {recError && (
          <p className="mt-1.5 text-xs text-red-500 dark:text-red-400">{recError}</p>
        )}
        {isRecording && (
          <p className="mt-1.5 text-xs text-red-500 dark:text-red-400 animate-pulse">
            ● 正在录音… 点击红色方块停止
          </p>
        )}
      </div>
    </div>
  );
}
