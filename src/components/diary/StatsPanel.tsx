import type { DiaryStats } from '../../types/diary';

export function StatsPanel({ stats }: { stats: DiaryStats | null }) {
  if (!stats) {
    return (
      <div className="text-center py-8 text-gray-400 text-sm">
        暂无统计数据
      </div>
    );
  }

  const cards = [
    { label: '平均心情', value: stats.average_mood ? `${stats.average_mood.toFixed(1)} / 5` : '--' },
    { label: '连续记录', value: stats.streak_days ? `${stats.streak_days} 天` : '--' },
    { label: '总记录', value: stats.total_entries ? `${stats.total_entries} 条` : '--' },
    { label: '常见情绪', value: stats.most_common_label || '--' },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {cards.map((c) => (
        <div
          key={c.label}
          className="bg-white rounded-xl border border-gray-100 p-4 text-center"
        >
          <p className="text-2xl font-bold text-primary-600">{c.value}</p>
          <p className="text-xs text-gray-400 mt-1">{c.label}</p>
        </div>
      ))}
    </div>
  );
}
