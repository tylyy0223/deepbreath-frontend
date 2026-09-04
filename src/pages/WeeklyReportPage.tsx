import { useEffect, useState } from 'react';
import api from '../lib/axios';
import { Card } from '../components/ui/Card';
import { Spinner } from '../components/ui/Spinner';

interface ChatModeStat {
  mode: string;
  label: string;
  sessions: number;
  messages: number;
}

interface WeeklyReport {
  week_start: string;
  week_end: string;
  // 情绪
  mood_trend: { date: string; avg_mood: number }[];
  diary_count: number;
  // 呼吸
  breath_count: number;
  breath_minutes: number;
  // 签到
  checkin_days: number;
  checkin_credits: number;
  checkin_max_streak: number;
  // AI 对话
  chat_by_mode: ChatModeStat[];
  total_chat_sessions: number;
  total_chat_messages: number;
  // Credits
  credit_earned: number;
  credit_spent: number;
}

const MODE_ICONS: Record<string, string> = {
  science: '📚',
  counseling: '🌳',
  assessment: '📋',
  reading: '📖',
};

const MODE_COLORS: Record<string, string> = {
  science: 'bg-blue-500',
  counseling: 'bg-emerald-500',
  assessment: 'bg-amber-500',
  reading: 'bg-purple-500',
};

export function WeeklyReportPage() {
  const [data, setData] = useState<WeeklyReport | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/diary/weekly-report')
      .then((res) => setData(res.data.data || res.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="py-20"><Spinner /></div>;
  if (!data) return <div className="text-center py-12 text-gray-400">暂无数据</div>;

  const maxMood = Math.max(...data.mood_trend.map((d) => d.avg_mood), 5);
  const maxChatMsgs = Math.max(...data.chat_by_mode.map((m) => m.messages), 1);
  const dateRange = `${data.week_start?.slice(0, 10)} ~ ${data.week_end?.slice(0, 10)}`;

  return (
    <div className="max-w-2xl mx-auto">
      <h2 className="text-lg font-semibold text-gray-800 dark:text-zinc-200 mb-1">📊 个人周报</h2>
      <p className="text-xs text-gray-400 mb-4">{dateRange}</p>

      {/* ---- 概览卡片 ---- */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        <Card className="p-3 text-center">
          <p className="text-xl font-bold text-primary-600">{data.diary_count}</p>
          <p className="text-xs text-gray-400">📔 日记</p>
        </Card>
        <Card className="p-3 text-center">
          <p className="text-xl font-bold text-emerald-600">{data.breath_count}</p>
          <p className="text-xs text-gray-400">🫁 呼吸</p>
        </Card>
        <Card className="p-3 text-center">
          <p className="text-xl font-bold text-amber-600">{data.breath_minutes}min</p>
          <p className="text-xs text-gray-400">⏱️ 呼吸时长</p>
        </Card>
      </div>

      {/* ---- 签到 + Credits ---- */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        <Card className="p-3 text-center">
          <p className="text-xl font-bold text-orange-600">{data.checkin_days}/7</p>
          <p className="text-xs text-gray-400">📅 签到天数</p>
        </Card>
        <Card className="p-3 text-center">
          <p className="text-xl font-bold text-green-600">+{data.credit_earned}</p>
          <p className="text-xs text-gray-400">💎 获得 Credits</p>
        </Card>
        <Card className="p-3 text-center">
          <p className="text-xl font-bold text-red-500">-{data.credit_spent}</p>
          <p className="text-xs text-gray-400">💸 消费 Credits</p>
        </Card>
      </div>

      {/* ---- 情绪走势 ---- */}
      {data.mood_trend.length > 0 && (
        <Card className="p-4 mb-4">
          <h3 className="text-sm font-medium text-gray-700 dark:text-zinc-300 mb-3">📈 情绪走势</h3>
          <div className="flex items-end gap-2 h-28">
            {data.mood_trend.map((d) => (
              <div key={d.date} className="flex-1 flex flex-col items-center gap-1">
                <span className="text-[10px] text-gray-500">{d.avg_mood.toFixed(1)}</span>
                <div
                  className="w-full rounded-t-md bg-primary-400 dark:bg-primary-600 transition-all"
                  style={{ height: `${(d.avg_mood / maxMood) * 100}%`, minHeight: 4 }}
                />
                <span className="text-[10px] text-gray-400">{d.date.slice(5)}</span>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* ---- AI 对话模式统计 ---- */}
      {data.chat_by_mode.length > 0 && (
        <Card className="p-4 mb-4">
          <h3 className="text-sm font-medium text-gray-700 dark:text-zinc-300 mb-3">
            🤖 AI 对话（共 {data.total_chat_sessions} 次对话 · {data.total_chat_messages} 条消息）
          </h3>
          <div className="space-y-2">
            {data.chat_by_mode.map((m) => (
              <div key={m.mode} className="flex items-center gap-3">
                <span className="text-base w-6 text-center">{MODE_ICONS[m.mode] || '💬'}</span>
                <span className="text-sm text-gray-700 dark:text-zinc-300 w-16">{m.label}</span>
                <div className="flex-1 h-5 bg-gray-100 dark:bg-zinc-700 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${MODE_COLORS[m.mode] || 'bg-gray-400'} transition-all`}
                    style={{ width: `${(m.messages / maxChatMsgs) * 100}%`, minWidth: m.messages > 0 ? 8 : 0 }}
                  />
                </div>
                <span className="text-xs text-gray-500 w-14 text-right">
                  {m.messages} 条
                </span>
                <span className="text-xs text-gray-400 w-12 text-right">{m.sessions} 次</span>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* ---- 本周摘要 ---- */}
      <Card className="p-4">
        <h3 className="text-sm font-medium text-gray-700 dark:text-zinc-300 mb-2">📋 本周摘要</h3>
        <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-500">📔 日记记录</span>
            <span className="font-medium">{data.diary_count} 条</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">🫁 呼吸练习</span>
            <span className="font-medium">{data.breath_count} 次</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">📅 签到打卡</span>
            <span className="font-medium">{data.checkin_days}/7 天</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">💬 AI 对话</span>
            <span className="font-medium">{data.total_chat_sessions} 次</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">💎 净收入</span>
            <span className={`font-medium ${data.credit_earned - data.credit_spent >= 0 ? 'text-green-600' : 'text-red-500'}`}>
              {data.credit_earned - data.credit_spent >= 0 ? '+' : ''}{data.credit_earned - data.credit_spent}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">📅 最长连续签到</span>
            <span className="font-medium">{data.checkin_max_streak} 天</span>
          </div>
        </div>
      </Card>
    </div>
  );
}
