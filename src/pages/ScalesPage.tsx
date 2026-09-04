import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useScalesStore } from '../stores/scalesStore';
import { Card } from '../components/ui/Card';

export function ScalesPage() {
  const { scales, history, fetchScales, fetchHistory } = useScalesStore();
  const navigate = useNavigate();

  useEffect(() => {
    fetchScales();
    fetchHistory();
  }, [fetchScales, fetchHistory]);

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-gray-800 dark:text-zinc-200 mb-1">📝 心理测评</h2>
        <p className="text-xs text-gray-400">
          标准化自评量表 · 20 Credits/次 · 结果仅供参考，不构成临床诊断
        </p>
      </div>

      {/* 量表卡片 */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {scales.map((s) => (
          <Card
            key={s.id}
            className="p-5 cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => navigate(`/app/scales/${s.id}`)}
          >
            <div className="text-3xl mb-2">{s.emoji}</div>
            <h3 className="font-medium text-gray-800 dark:text-zinc-200 text-sm">{s.name}</h3>
            <p className="text-xs text-gray-400 mt-0.5">{s.name_en}</p>
            <p className="text-xs text-gray-500 dark:text-zinc-400 mt-2 line-clamp-2">{s.description}</p>
            <div className="flex items-center gap-3 mt-3 text-xs text-gray-400 dark:text-zinc-500">
              <span>{s.questions_count} 题</span>
              <span>⏱ {s.time_estimate}</span>
            </div>
          </Card>
        ))}
      </div>

      {/* 测评历史 */}
      {history.length > 0 && (
        <div>
          <h3 className="text-sm font-medium text-gray-700 dark:text-zinc-300 mb-3">📋 我的测评记录</h3>
          <div className="space-y-2">
            {history.map((h) => (
              <Card key={h.id} className="px-4 py-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span>{h.emoji}</span>
                  <span className="text-sm text-gray-700 dark:text-zinc-300">{h.scale_name}</span>
                </div>
                <div className="text-right">
                  <span className="text-sm font-medium text-primary-600" style={{ fontVariantNumeric: 'tabular-nums' }}>
                    {h.standard_score}
                  </span>
                  <span className="text-xs text-gray-500 dark:text-zinc-400 ml-2">{h.level}</span>
                  <p className="text-[10px] text-gray-400">
                    {h.created_at ? new Date(h.created_at).toLocaleString('zh-CN') : ''}
                  </p>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
