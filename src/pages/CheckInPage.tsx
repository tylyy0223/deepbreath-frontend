import { useEffect, useState, useCallback } from 'react';
import { useCheckInStore } from '../stores/checkinStore';
import { Button } from '../components/ui/Button';
import { Spinner } from '../components/ui/Spinner';

/** 星期头 */
const WEEKDAYS = ['一', '二', '三', '四', '五', '六', '日'];

/** 签到奖励表（与后端 checkin_service.py 一致） */
const REWARD_TABLE = [
  { days: '1-2 天', reward: 2 },
  { days: '3-6 天', reward: 3 },
  { days: '7 天 🎉', reward: 5, highlight: true },
  { days: '14 天 🌟', reward: 7, highlight: true },
  { days: '30 天 🏆', reward: 10, highlight: true },
  { days: '100 天 👑', reward: 20, highlight: true },
  { days: '365 天 💎', reward: 50, highlight: true },
];

export function CheckInPage() {
  const {
    status, calendar, stats, checkingIn, loading,
    doCheckin, fetchStatus, fetchCalendar, fetchStats,
  } = useCheckInStore();

  const [message, setMessage] = useState<string | null>(null);
  const [calendarYear, setCalendarYear] = useState(new Date().getFullYear());
  const [calendarMonth, setCalendarMonth] = useState(new Date().getMonth() + 1);

  useEffect(() => {
    fetchStatus();
    fetchStats();
    fetchCalendar(calendarYear, calendarMonth);
  }, [fetchStatus, fetchStats, fetchCalendar, calendarYear, calendarMonth]);

  const handleCheckin = useCallback(async () => {
    try {
      const result = await doCheckin();
      setMessage(result.message);
      fetchCalendar(calendarYear, calendarMonth);
      fetchStats();
      setTimeout(() => setMessage(null), 4000);
    } catch {
      // error handled in store
    }
  }, [doCheckin, fetchCalendar, fetchStats, calendarYear, calendarMonth]);

  const prevMonth = () => {
    if (calendarMonth === 1) {
      setCalendarYear(calendarYear - 1);
      setCalendarMonth(12);
    } else {
      setCalendarMonth(calendarMonth - 1);
    }
  };

  const nextMonth = () => {
    if (calendarMonth === 12) {
      setCalendarYear(calendarYear + 1);
      setCalendarMonth(1);
    } else {
      setCalendarMonth(calendarMonth + 1);
    }
  };

  const today = new Date();
  const canGoNext = calendarYear < today.getFullYear() ||
    (calendarYear === today.getFullYear() && calendarMonth < today.getMonth() + 1);

  // 构建日历网格
  const days = calendar?.days || [];
  const firstDay = new Date(calendarYear, calendarMonth - 1, 1);
  const firstDayOfWeek = (firstDay.getDay() + 6) % 7; // 周一=0
  const daysInMonth = new Date(calendarYear, calendarMonth, 0).getDate();

  const checkedSet = new Set(days.filter(d => d.checked).map(d => d.date));

  const checked = status?.checked_today;
  const streak = status?.current_streak || 0;

  return (
    <div className="max-w-lg mx-auto px-4 pb-24 pt-4">
      {/* ---- Hero: 签到按钮 ---- */}
      <div className="text-center mb-6">
        <div className="text-5xl mb-3">📅</div>
        <h1 className="text-xl font-bold text-gray-800 dark:text-zinc-100 mb-1">每日签到</h1>
        <p className="text-sm text-gray-400 dark:text-zinc-500 mb-4">
          坚持签到，赢取 Credits 奖励
        </p>

        {/* 状态提示 */}
        {message && (
          <div className="mb-3 px-4 py-2 bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-300 rounded-lg text-sm animate-pulse">
            {message}
          </div>
        )}

        {/* 签到按钮 */}
        <Button
          size="lg"
          onClick={handleCheckin}
          loading={checkingIn}
          disabled={checked || checkingIn}
          className={`w-full max-w-xs h-14 text-lg font-bold rounded-2xl transition-all duration-300 ${
            checked
              ? 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400 cursor-default'
              : 'bg-primary-600 hover:bg-primary-700 text-white shadow-lg shadow-primary-600/25'
          }`}
        >
          {checkingIn ? '签到中…' : checked ? `✅ 今日已签到` : '📌 签到领奖励'}
        </Button>

        {/* 连续天数 */}
        <div className="flex justify-center gap-6 mt-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-800 dark:text-zinc-100">{streak}</div>
            <div className="text-xs text-gray-400">连续天数</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-800 dark:text-zinc-100">
              {stats?.longest_streak || status?.longest_streak || 0}
            </div>
            <div className="text-xs text-gray-400">最长连续</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-amber-500">
              {stats?.total_credits_earned || status?.total_credits_earned || 0}
            </div>
            <div className="text-xs text-gray-400">累计 Credits</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-800 dark:text-zinc-100">
              {stats?.total_checkins || status?.total_checkins || 0}
            </div>
            <div className="text-xs text-gray-400">总计天数</div>
          </div>
        </div>

        {/* 今日预计奖励 */}
        {!checked && status?.today_reward !== undefined && status.today_reward > 0 && (
          <div className="mt-3 text-sm text-amber-600 dark:text-amber-400">
            今日签到可获得 <span className="font-bold">+{status.today_reward} Credits</span>
          </div>
        )}
      </div>

      {/* ---- 月度日历 ---- */}
      <div className="bg-white dark:bg-zinc-800 rounded-2xl p-4 shadow-sm mb-4">
        {/* 月份切换 */}
        <div className="flex items-center justify-between mb-3">
          <button
            onClick={prevMonth}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 dark:hover:bg-zinc-700 text-gray-500"
          >
            ‹
          </button>
          <span className="font-semibold text-gray-700 dark:text-zinc-200">
            {calendarYear} 年 {calendarMonth} 月
          </span>
          <button
            onClick={nextMonth}
            disabled={!canGoNext}
            className={`w-8 h-8 flex items-center justify-center rounded-lg text-gray-500 ${
              canGoNext ? 'hover:bg-gray-100 dark:hover:bg-zinc-700' : 'opacity-30 cursor-not-allowed'
            }`}
          >
            ›
          </button>
        </div>

        {/* 星期头 */}
        <div className="grid grid-cols-7 mb-1">
          {WEEKDAYS.map(w => (
            <div key={w} className="text-center text-xs text-gray-400 py-1">{w}</div>
          ))}
        </div>

        {/* 日期网格 */}
        <div className="grid grid-cols-7 gap-1">
          {/* 前置空白 */}
          {Array.from({ length: firstDayOfWeek }).map((_, i) => (
            <div key={`empty-${i}`} />
          ))}
          {/* 日期 */}
          {Array.from({ length: daysInMonth }).map((_, i) => {
            const d = i + 1;
            const dateStr = `${calendarYear}-${String(calendarMonth).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
            const isChecked = checkedSet.has(dateStr);
            const isToday = today.getFullYear() === calendarYear &&
              today.getMonth() + 1 === calendarMonth &&
              today.getDate() === d;

            return (
              <div
                key={d}
                className={`aspect-square flex items-center justify-center rounded-lg text-sm font-medium
                  ${isChecked
                    ? 'bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300'
                    : 'text-gray-500 hover:bg-gray-50 dark:hover:bg-zinc-700'}
                  ${isToday ? 'ring-2 ring-primary-400 ring-offset-1 dark:ring-offset-zinc-800' : ''}
                `}
                title={isChecked ? `连续第 ${days.find(dd => dd.date === dateStr)?.streak_count || '?'} 天` : undefined}
              >
                {d}
              </div>
            );
          })}
        </div>
      </div>

      {/* ---- 奖励规则 ---- */}
      <div className="bg-white dark:bg-zinc-800 rounded-2xl p-4 shadow-sm mb-4">
        <h3 className="text-sm font-semibold text-gray-700 dark:text-zinc-200 mb-3">🏆 奖励规则</h3>
        <div className="grid grid-cols-2 gap-2">
          {REWARD_TABLE.map((r) => (
            <div
              key={r.days}
              className={`flex justify-between items-center px-3 py-2 rounded-lg text-sm ${
                r.highlight
                  ? 'bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800'
                  : 'bg-gray-50 dark:bg-zinc-700/50'
              }`}
            >
              <span className={r.highlight ? 'font-semibold text-amber-700 dark:text-amber-300' : 'text-gray-600 dark:text-zinc-300'}>
                {r.days}
              </span>
              <span className="font-bold text-amber-600 dark:text-amber-400">+{r.reward}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ---- 签到习惯 ---- */}
      {stats && (stats.morning_count > 0 || stats.afternoon_count > 0 || stats.evening_count > 0) && (
        <div className="bg-white dark:bg-zinc-800 rounded-2xl p-4 shadow-sm">
          <h3 className="text-sm font-semibold text-gray-700 dark:text-zinc-200 mb-3">⏰ 签到习惯</h3>
          <div className="flex gap-2">
            {[
              { label: '上午', count: stats.morning_count, color: 'bg-amber-200' },
              { label: '下午', count: stats.afternoon_count, color: 'bg-orange-300' },
              { label: '晚上', count: stats.evening_count, color: 'bg-indigo-300' },
              { label: '深夜', count: stats.night_count, color: 'bg-purple-400' },
            ].map(s => (
              <div key={s.label} className="flex-1 text-center">
                <div className={`h-2 rounded-full mb-1 ${s.color}`} style={{
                  opacity: Math.max(0.15, s.count / Math.max(1,
                    stats.morning_count + stats.afternoon_count + stats.evening_count + stats.night_count))
                }} />
                <div className="text-xs text-gray-500">{s.label}</div>
                <div className="text-sm font-semibold text-gray-700 dark:text-zinc-200">{s.count}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* loading overlay */}
      {loading && !status && (
        <div className="flex justify-center py-12">
          <Spinner />
        </div>
      )}
    </div>
  );
}
