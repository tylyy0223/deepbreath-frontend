import { isSafeImageUrl } from '../lib/safeUrl';
import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useDiaryStore } from '../stores/diaryStore';
import { Card } from '../components/ui/Card';
import { Spinner } from '../components/ui/Spinner';
import { Button } from '../components/ui/Button';
import { useToast } from '../components/ui/Toast';
import { MOOD_EMOJIS } from '../config/constants';

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'long',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function DiaryDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { currentEntry, detailLoading, fetchEntry, deleteEntry } = useDiaryStore();
  const { addToast } = useToast();
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (id) {
      const numId = Number(id);
      if (!isNaN(numId)) fetchEntry(numId);
    }
  }, [id, fetchEntry]);

  const handleDelete = async () => {
    if (!deleteConfirm) {
      setDeleteConfirm(true);
      return;
    }
    setDeleting(true);
    try {
      const ok = await deleteEntry(currentEntry!.id);
      if (ok) {
        addToast('日记已删除', 'success');
        navigate('/app/diary', { replace: true });
      } else {
        addToast('删除失败，请稍后重试', 'error');
      }
    } catch {
      addToast('删除失败，请稍后重试', 'error');
    } finally {
      setDeleting(false);
      setDeleteConfirm(false);
    }
  };

  if (detailLoading) {
    return (
      <div className="max-w-2xl mx-auto py-20">
        <Spinner />
      </div>
    );
  }

  if (!currentEntry) {
    return (
      <div className="max-w-2xl mx-auto py-20 text-center">
        <span className="text-4xl">📔</span>
        <p className="mt-4 text-gray-500 dark:text-zinc-400">日记不存在或无权查看</p>
        <button
          onClick={() => navigate('/app/diary')}
          className="mt-3 text-sm text-primary-600 hover:text-primary-700 font-medium"
        >
          ← 返回列表
        </button>
      </div>
    );
  }

  const mood = MOOD_EMOJIS[currentEntry.mood_score] || MOOD_EMOJIS[3];
  const weatherOption = currentEntry.weather
    ? (() => {
        // Import constants inline to avoid cross-module issues
        const WEATHER_OPTIONS = [
          { value: 'sunny', emoji: '☀️', label: '晴天' },
          { value: 'cloudy', emoji: '☁️', label: '多云' },
          { value: 'rainy', emoji: '🌧️', label: '下雨' },
          { value: 'snowy', emoji: '❄️', label: '下雪' },
          { value: 'windy', emoji: '💨', label: '大风' },
        ];
        return WEATHER_OPTIONS.find((w) => w.value === currentEntry.weather);
      })()
    : null;

  return (
    <div className="max-w-2xl mx-auto">
      <button
        onClick={() => navigate('/app/diary')}
        className="text-sm text-gray-400 hover:text-gray-600 dark:text-zinc-500 dark:hover:text-zinc-300 mb-4 inline-block"
      >
        ← 返回日记列表
      </button>

      <Card className="p-6">
        {/* Mood */}
        <div className="flex items-start gap-4 mb-4">
          <span className="text-5xl flex-shrink-0">{mood.emoji}</span>
          <div>
            <h1 className="text-xl font-semibold text-gray-800 dark:text-zinc-200">
              {currentEntry.mood_label || mood.label}
            </h1>
            <div className="flex items-center gap-2 mt-1 text-sm text-gray-500 dark:text-zinc-400">
              {weatherOption && (
                <span>{weatherOption.emoji} {weatherOption.label}</span>
              )}
              {weatherOption && currentEntry.body_sensation && <span>·</span>}
              {currentEntry.body_sensation && (
                <span>身体: {currentEntry.body_sensation}</span>
              )}
            </div>
          </div>
        </div>

        {/* Date */}
        <p className="text-xs text-gray-400 dark:text-zinc-500 mb-4">
          {formatDateTime(currentEntry.created_at)}
        </p>

        {/* Note content */}
        {currentEntry.note ? (
          <div className="prose prose-sm prose-gray max-w-none dark:prose-invert">
            <p className="text-gray-700 dark:text-zinc-300 whitespace-pre-wrap leading-relaxed">
              {currentEntry.note}
            </p>
          </div>
        ) : (
          <p className="text-gray-400 dark:text-zinc-500 text-sm italic">没有记录文字内容</p>
        )}

        {/* Images */}
        {currentEntry.images && currentEntry.images.length > 0 && (
          <div className="flex flex-wrap gap-2.5 mt-4">
            {currentEntry.images.map((url, i) => (
              <img
                key={i}
                src={isSafeImageUrl(url) ? url : ""}
                alt=""
                className="max-w-[240px] max-h-[240px] rounded-xl object-cover cursor-pointer hover:opacity-90 transition-opacity"
                onClick={() => window.open(url, '_blank')}
              />
            ))}
          </div>
        )}

        {/* Actions：编辑 & 删除 */}
        <div className="mt-6 pt-4 border-t border-gray-100 dark:border-zinc-700 flex gap-3 justify-end">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate(`/app/diary/${currentEntry.id}/edit`)}
          >
            ✏️ 编辑
          </Button>
          <Button
            variant="danger"
            size="sm"
            loading={deleting}
            onClick={handleDelete}
          >
            {deleteConfirm ? '⚠️ 确认删除？' : '🗑️ 删除'}
          </Button>
        </div>
      </Card>
    </div>
  );
}
