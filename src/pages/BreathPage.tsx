import { useEffect } from 'react';
import { ExerciseList } from '../components/breath/ExerciseList';
import { useBreathStore } from '../stores/breathStore';
import { Card } from '../components/ui/Card';

export function BreathPage() {
  const { stats, history, fetchStats, fetchHistory } = useBreathStore();

  useEffect(() => {
    fetchStats();
    fetchHistory();
  }, [fetchStats, fetchHistory]);

  const statItems = stats
    ? [
        { icon: '🔥', label: '连续天数', value: stats.streak_days },
        { icon: '🫁', label: '累计次数', value: stats.total_sessions },
        { icon: '⏱', label: '累计分钟', value: stats.total_minutes },
        { icon: '📅', label: '本周次数', value: stats.week_sessions },
      ]
    : [];

  return (
    <div>
      <h2 className="text-lg font-semibold text-gray-800 dark:text-zinc-200 mb-4">呼吸练习</h2>

      {/* Personal stats */}
      {stats && stats.total_sessions > 0 && (
        <div className="grid grid-cols-4 gap-3 mb-6">
          {statItems.map((s) => (
            <Card key={s.label} className="p-3 text-center">
              <div className="text-lg">{s.icon}</div>
              <div className="text-lg font-semibold text-gray-800 dark:text-zinc-200">{s.value}</div>
              <div className="text-xs text-gray-400 dark:text-zinc-500">{s.label}</div>
            </Card>
          ))}
        </div>
      )}

      <ExerciseList />

      {/* Recent practice history */}
      {history.length > 0 && (
        <div className="mt-8">
          <h3 className="text-sm font-medium text-gray-700 dark:text-zinc-300 mb-3">📋 最近练习</h3>
          <div className="space-y-2">
            {history.slice(0, 8).map((h) => (
              <Card key={h.id} className="px-4 py-2.5 flex items-center justify-between">
                <span className="text-sm text-gray-700 dark:text-zinc-300">{h.exercise_title}</span>
                <span className="text-xs text-gray-400 dark:text-zinc-500">
                  {Math.max(1, Math.round(h.duration_sec / 60))} 分钟 ·{' '}
                  {h.completed_at ? new Date(h.completed_at).toLocaleDateString('zh-CN') : '未完成'}
                </span>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
