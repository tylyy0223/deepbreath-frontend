import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDiaryStore } from '../stores/diaryStore';
import { MoodTimeline } from '../components/diary/MoodTimeline';
import { StatsPanel } from '../components/diary/StatsPanel';
import { Button } from '../components/ui/Button';
import { Spinner } from '../components/ui/Spinner';

/** 进入情绪日记前的心理贴士（正向心理学书写练习指引） */
const DIARY_TIPS = `日常可以坚持两件简单记录练习：

每日写下三件值得开心的小事，可以是搭乘电梯时协助轮椅长者、投喂流浪小猫、一次舒服的闲谈这类细碎善意与美好。长期这样觉察并记下正向经历，有助于促进大脑分泌血清素、内啡肽，稳固愉悦感。

碰到烦闷、委屈等负面体验时，如实记下发生的事情、当下真实情绪，再补充自己内心生出的期待与想法。书写相当于把积压在脑中的烦心事"外置安放"，暂时卸下心理负重，舒缓压力，帮助降低压力激素皮质醇水平。`;

export function DiaryPage() {
  const navigate = useNavigate();
  const { entries, stats, loading, page, pages, total, hasMore, fetchEntries, fetchStats } = useDiaryStore();
  const [search, setSearch] = useState('');
  const [showTips, setShowTips] = useState(true); // 默认展开贴士
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    fetchEntries({ page: 1 }); // 全部记录分页（第 1 页），翻页可查历史
    fetchStats(30); // 统计概览用近 30 天数据
  }, [fetchEntries, fetchStats]);

  // 搜索防抖：输入停顿 400ms 后触发检索（回到第 1 页）
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      fetchEntries({ search: search.trim(), page: 1 });
    }, 400);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [search, fetchEntries]);

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-800 dark:text-zinc-200">情绪日记</h2>
        <Button size="sm" onClick={() => navigate('/app/diary/new')}>
          + 记录心情
        </Button>
      </div>

      {/* 进入前提示语 */}
      {showTips && (
        <div className="mb-4 rounded-xl border border-pink-100 bg-gradient-to-br from-pink-50 to-rose-50 p-4 dark:from-pink-900/20 dark:to-rose-900/20 dark:border-pink-800/30">
          <div className="flex items-start justify-between mb-2">
            <span className="text-base font-semibold text-pink-500 dark:text-pink-300">小❤️❤️贴士</span>
            <button
              onClick={() => setShowTips(false)}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 text-sm px-1"
              aria-label="收起贴士"
            >
              ✕
            </button>
          </div>
          <div className="text-[15px] leading-relaxed text-gray-600 dark:text-zinc-300 whitespace-pre-line">
            {DIARY_TIPS}
          </div>
        </div>
      )}

      {/* 搜索 */}
      <div className="mb-4">
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">🔍</span>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="搜索日记内容或心情标签…"
            className="w-full pl-9 pr-9 py-2 rounded-xl border border-gray-200 bg-white text-sm text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-400 dark:bg-zinc-800 dark:border-zinc-700 dark:text-zinc-200"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-sm"
              aria-label="清除搜索"
            >
              ✕
            </button>
          )}
        </div>
        {search.trim() && (
          <p className="text-xs text-gray-400 mt-1">
            正在搜索「{search.trim()}」…（匹配日记内容和心情标签）
          </p>
        )}
      </div>

      {/* Stats */}
      <div className="mb-6">
        <h3 className="text-sm font-medium text-gray-500 mb-3">统计概览</h3>
        <StatsPanel stats={stats} />
      </div>

      {/* Timeline */}
      <h3 className="text-sm font-medium text-gray-500 mb-3">
        {search.trim() ? '搜索结果' : '全部记录'}
      </h3>
      {loading ? (
        <div className="py-12"><Spinner /></div>
      ) : (
        <>
          <MoodTimeline entries={entries} />
          {pages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <Button
                size="sm"
                variant="ghost"
                disabled={page <= 1}
                onClick={() => fetchEntries({ search: search.trim(), page: page - 1 })}
              >
                ← 上一页
              </Button>
              <span className="text-xs text-gray-400">
                第 {page} / {pages} 页 · 共 {total} 条
              </span>
              <Button
                size="sm"
                variant="ghost"
                disabled={!hasMore}
                onClick={() => fetchEntries({ search: search.trim(), page: page + 1 })}
              >
                下一页 →
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
