import { isSafeImageUrl } from '../../lib/safeUrl';
import type { MoodEntry } from '../../types/diary';
import { MOOD_EMOJIS } from '../../config/constants';
import { useNavigate } from 'react-router-dom';

function formatDate(iso: string): string {
  const d = new Date(iso);
  const month = d.getMonth() + 1;
  const day = d.getDate();
  const weekdays = ['日', '一', '二', '三', '四', '五', '六'];
  return `${month}月${day}日 周${weekdays[d.getDay()]}`;
}

export function MoodTimeline({ entries }: { entries: MoodEntry[] }) {
  const navigate = useNavigate();

  if (entries.length === 0) {
    return (
      <div className="text-center py-12 text-gray-400">
        <span className="text-4xl">📔</span>
        <p className="mt-2 text-sm">还没有日记记录</p>
        <p className="text-xs mt-1">开始记录你的心情变化吧</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {entries.map((entry) => {
        const mood = MOOD_EMOJIS[entry.mood_score] || MOOD_EMOJIS[3];
        return (
          <div
            key={entry.id}
            onClick={() => navigate(`/app/diary/${entry.id}`)}
            className="flex items-start gap-3 p-4 bg-white rounded-xl border border-gray-100 cursor-pointer hover:shadow-md transition-shadow dark:bg-zinc-800 dark:border-zinc-700"
          >
            <span className="text-3xl flex-shrink-0">{mood.emoji}</span>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-medium text-gray-700 dark:text-zinc-300">
                  {entry.mood_label || mood.label}
                </span>
                {entry.weather && <span className="text-xs">{entry.weather}</span>}
              </div>
              {entry.body_sensation && (
                <p className="text-xs text-gray-400 mt-0.5">身体: {entry.body_sensation}</p>
              )}
              {entry.note && (
                <p className="text-sm text-gray-600 mt-1.5 line-clamp-2">{entry.note}</p>
              )}
              {entry.images && entry.images.length > 0 && (
                <div className="flex gap-1.5 mt-1.5">
                  {entry.images.slice(0, 3).map((url, i) => (
                    <img
                      key={i}
                      src={isSafeImageUrl(url) ? url : ""}
                      alt=""
                      className="w-10 h-10 rounded-lg object-cover"
                    />
                  ))}
                  {entry.images.length > 3 && (
                    <span className="w-10 h-10 rounded-lg bg-gray-100 dark:bg-zinc-700 flex items-center justify-center text-xs text-gray-500 dark:text-zinc-400">
                      +{entry.images.length - 3}
                    </span>
                  )}
                </div>
              )}
            </div>
            <span className="text-xs text-gray-400 flex-shrink-0">
              {formatDate(entry.created_at)}
            </span>
          </div>
        );
      })}
    </div>
  );
}
