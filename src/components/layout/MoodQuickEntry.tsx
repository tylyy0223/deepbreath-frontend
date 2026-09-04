import { useState, useEffect, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useDiaryStore } from '../../stores/diaryStore';
import { useToast } from '../ui/Toast';

const STORAGE_KEY = 'mood_quick_dismissed';

/** 可拖拽、可关闭的右下角浮动情绪快捷入口（P1-#8） */
export function MoodQuickEntry() {
  const { t } = useTranslation();
  const MOODS = [
    { score: 1, emoji: '😫', label: t('mood.label_1') },
    { score: 2, emoji: '😟', label: t('mood.label_2') },
    { score: 3, emoji: '😐', label: t('mood.label_3') },
    { score: 4, emoji: '🙂', label: t('mood.label_4') },
    { score: 5, emoji: '😄', label: t('mood.label_5') },
  ];
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [todayMood, setTodayMood] = useState<number | null>(null);
  const [dismissed, setDismissed] = useState(() => sessionStorage.getItem(STORAGE_KEY) === '1');
  const [pos, setPos] = useState({ x: 16, y: 120 }); // 相对右下角的偏移
  const [dragging, setDragging] = useState(false);
  const dragRef = useRef<{ startX: number; startY: number; startPosX: number; startPosY: number } | null>(null);
  const hasMoved = useRef(false);
  const { addToast } = useToast();
  const createEntry = useDiaryStore((s) => s.createEntry);

  useEffect(() => {
    const today = new Date().toDateString();
    const last = localStorage.getItem('mood_quick_date');
    if (last === today) {
      setTodayMood(Number(localStorage.getItem('mood_quick_score')) || null);
    }
  }, []);

  const handleMood = async (score: number, emoji: string, label: string) => {
    setSaving(true);
    try {
      await createEntry({ mood_score: score, mood_label: label });
      const today = new Date().toDateString();
      localStorage.setItem('mood_quick_date', today);
      localStorage.setItem('mood_quick_score', String(score));
      setTodayMood(score);
      setOpen(false);
      addToast(`已记录今日心情 ${emoji}`, 'success');
    } catch {
      addToast('记录失败，请稍后重试', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDismiss = () => {
    setDismissed(true);
    sessionStorage.setItem(STORAGE_KEY, '1');
  };

  // 拖拽
  const onPointerDown = useCallback((e: React.PointerEvent) => {
    hasMoved.current = false;
    dragRef.current = { startX: e.clientX, startY: e.clientY, startPosX: pos.x, startPosY: pos.y };
    setDragging(true);
    e.preventDefault();
  }, [pos]);

  useEffect(() => {
    if (!dragging) return;
    const onMove = (e: PointerEvent) => {
      if (!dragRef.current) return;
      const dx = dragRef.current.startX - e.clientX;
      const dy = dragRef.current.startY - e.clientY;
      if (Math.abs(dx) > 3 || Math.abs(dy) > 3) hasMoved.current = true;
      setPos({
        x: Math.max(0, dragRef.current.startPosX + dx),
        y: Math.max(0, dragRef.current.startPosY + dy),
      });
    };
    const onUp = () => { setDragging(false); dragRef.current = null; };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    return () => { window.removeEventListener('pointermove', onMove); window.removeEventListener('pointerup', onUp); };
  }, [dragging]);

  const handleClick = () => {
    if (hasMoved.current) return; // 拖拽了就不触发点击
    setOpen(!open);
  };

  if (dismissed) return null;

  return (
    <div
      className="fixed z-40 select-none"
      style={{ right: pos.x, bottom: pos.y }}
    >
      {/* 展开面板 */}
      {open && (
        <div className="mb-2 p-3 bg-white dark:bg-zinc-800 rounded-2xl shadow-xl border border-gray-100 dark:border-zinc-700">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs text-gray-400 dark:text-zinc-500">今天感觉怎么样？</p>
            <button
              onClick={handleDismiss}
              className="text-gray-300 hover:text-gray-500 dark:hover:text-gray-400 text-sm leading-none px-1"
              title="关闭"
            >
              ×
            </button>
          </div>
          <div className="flex gap-1.5">
            {MOODS.map((m) => (
              <button
                key={m.score}
                disabled={saving}
                onClick={() => handleMood(m.score, m.emoji, m.label)}
                className="flex flex-col items-center gap-0.5 p-2 rounded-xl hover:bg-gray-50 dark:hover:bg-zinc-700 transition-colors disabled:opacity-50"
                title={m.label}
              >
                <span className="text-2xl">{m.emoji}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 浮动按钮（可拖拽） */}
      <div className="relative group">
        <button
          onPointerDown={onPointerDown}
          onClick={handleClick}
          className="w-11 h-11 rounded-full shadow-lg flex items-center justify-center text-xl
            bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-600
            hover:shadow-xl transition-shadow cursor-grab active:cursor-grabbing"
          title={todayMood ? `今日心情: ${MOODS.find(m => m.score === todayMood)?.emoji}` : '记录心情 · 可拖拽移动'}
        >
          {todayMood ? MOODS.find(m => m.score === todayMood)?.emoji : '💭'}
        </button>
        {/* 关闭按钮 —— hover 时显示 */}
        <button
          onClick={handleDismiss}
          className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-gray-200 dark:bg-zinc-600
            text-gray-400 dark:text-zinc-400 hover:text-red-500 hover:bg-red-100 dark:hover:bg-red-900/30
            text-[10px] leading-none flex items-center justify-center
            opacity-0 group-hover:opacity-100 transition-opacity"
          title="关闭心情入口"
        >
          ×
        </button>
      </div>
    </div>
  );
}
