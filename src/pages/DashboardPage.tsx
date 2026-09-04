/**
 * 工作台 — DeepBreath 主入口
 * 心情打卡 · 3 个快速行动 · 今日科普 4 条 2x2 · 6 大模块 · 情绪曲线
 */
import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { useCheckInStore } from '../stores/checkinStore';
import { useContentStore } from '../stores/contentStore';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';

interface Article {
  id?: number;
  title: string;
  slug: string;
  excerpt?: string;
  content?: string;
  category?: string;
  cover_url?: string;
  created_at?: string;
}

const QUICK_ACTIONS = [
  { to: '/app/breath', icon: '🌬️', title: '3 分钟呼吸', desc: '快速平复 · 4-7-8 节奏', gradient: 'from-amber-300 to-orange-400' },
  { to: '/app/chat/science', icon: '🧠', title: '和 AI 聊聊', desc: '心理科普模式', gradient: 'from-violet-400 to-indigo-500' },
  { to: '/app/listen', icon: '🎧', title: 'AI 听书', desc: '蛤蟆先生 15 章评析', gradient: 'from-emerald-400 to-teal-500' },
  { to: '/app/chat/reading', icon: '📖', title: 'AI 解读一本', desc: '《被讨厌的勇气》 10 分钟', gradient: 'from-sky-400 to-blue-500' },
];

const MODULES = [
  { to: '/app/chat/science', icon: '🧠', title: 'AI 心理对话', desc: '四种对话模式,随时随地倾诉', color: 'from-violet-500 to-indigo-500' },
  { to: '/app/breath', icon: '🌬️', title: '呼吸练习', desc: '引导式呼吸放松训练', color: 'from-amber-400 to-orange-500' },
  { to: '/app/knowledge', icon: '📚', title: '知识库', desc: '科普文章 · 经典书目 · AI 听书', color: 'from-emerald-500 to-teal-500' },
  { to: '/app/diary', icon: '📝', title: '情绪日记', desc: '记录每日心情,可视化情绪趋势', color: 'from-emerald-400 to-teal-500' },
  { to: '/app/scales', icon: '📊', title: '心理测评', desc: '专业心理量表,系统评估你的状态', color: 'from-rose-400 to-pink-500' },
  { to: '/app/community', icon: '🫂', title: '心情社区', desc: '和同路人分享感受、互相支持', color: 'from-cyan-400 to-sky-500' },
];

function categoryColor(slug?: string): { gradient: string; label: string; tagBg: string; tagFg: string } {
  switch (slug) {
    case 'stress-relief': return { gradient: 'from-violet-500 to-indigo-500', label: '情绪', tagBg: 'bg-violet-500/10', tagFg: 'text-violet-600 dark:text-violet-400' };
    case 'positive-growth': return { gradient: 'from-emerald-500 to-teal-500', label: '成长', tagBg: 'bg-emerald-500/10', tagFg: 'text-emerald-600 dark:text-emerald-400' };
    case 'low-mood': return { gradient: 'from-rose-500 to-pink-500', label: '治愈', tagBg: 'bg-rose-500/10', tagFg: 'text-rose-600 dark:text-rose-400' };
    default: return { gradient: 'from-sky-500 to-blue-500', label: '科普', tagBg: 'bg-sky-500/10', tagFg: 'text-sky-600 dark:text-sky-400' };
  }
}

export function DashboardPage() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const { status: checkinStatus, fetchStatus } = useCheckInStore();
  const { articles, recommendations, fetchArticles, fetchRecommendations } = useContentStore();
  const [today, setToday] = useState('');

  useEffect(() => {
    fetchStatus();
    fetchArticles();
    fetchRecommendations();
    const d = new Date();
    const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
    setToday(`${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日 · ${weekdays[d.getDay()]}`);
  }, [fetchStatus, fetchArticles, fetchRecommendations]);

  const checkedToday = checkinStatus?.checked_today;
  const greetingHour = new Date().getHours();
  const greeting = greetingHour < 6 ? '夜深了' : greetingHour < 11 ? '早安' : greetingHour < 14 ? '中午好' : greetingHour < 18 ? '下午好' : '晚上好';
  const userName = user?.nickname || user?.email?.split('@')[0] || '朋友';

  // 取 4 篇:优先 recommendations(个性化),否则最新 4 篇
  const top4: Article[] = (recommendations?.articles?.length
    ? recommendations.articles.slice(0, 4)
    : articles.slice(0, 4)
  ).slice(0, 4);

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* 顶部日期 + 问候 */}
      <div className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <p className="text-xs text-gray-400 dark:text-zinc-500">{today}</p>
          <h1 className="text-2xl font-bold text-gray-800 dark:text-zinc-100 mt-1">
            {greeting},{userName} ☀️
          </h1>
          <p className="text-sm text-gray-500 dark:text-zinc-400 mt-1">今天感觉怎么样?</p>
        </div>
      </div>

      {/* 心情打卡条 */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 border border-amber-100/60 dark:border-amber-800/40 p-5">
        <div className="absolute -right-12 -top-12 w-40 h-40 rounded-full bg-gradient-to-br from-amber-300 to-orange-400 opacity-25 blur-2xl" />
        <div className="relative flex items-center gap-4 flex-wrap">
          <div className="w-14 h-14 rounded-full bg-white dark:bg-zinc-800 grid place-items-center text-3xl shadow-sm flex-shrink-0">
            {checkedToday ? '🌤️' : '🌤️'}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-gray-800 dark:text-zinc-100">
              {checkedToday ? '今日心情已记录' : '今日心情未记录'}
            </h3>
            <p className="text-sm text-gray-600 dark:text-zinc-400 mt-0.5">
              {checkedToday
                ? '看见自己的情绪节奏,坚持下去 🌿'
                : '用 1 分钟记录今天的状态,系统会帮你看见自己的情绪节奏'}
            </p>
          </div>
          <Button variant={checkedToday ? 'secondary' : 'primary'} onClick={() => navigate('/app/diary')}>
            {checkedToday ? '查看' : '记录心情'}
            <span className="ml-1">→</span>
          </Button>
        </div>
      </div>

      {/* 今日科普 4 条 2x2 */}
      <section>
        <div className="flex items-end justify-between mb-3">
          <div>
            <p className="text-xs text-gray-400 dark:text-zinc-500 flex items-center gap-1.5">
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              每日更新 · {recommendations?.reason?.replace(/[🌧🌿🌱✨]/g, '').trim() || '今天的内容已准备好'}
            </p>
            <h2 className="text-lg font-bold text-gray-800 dark:text-zinc-100 mt-1">今日科普</h2>
          </div>
          <Link to="/app/articles" className="text-xs text-gray-500 dark:text-zinc-400 hover:text-primary-600 no-underline flex items-center gap-1">
            查看全部 <span>→</span>
          </Link>
        </div>

        {top4.length === 0 ? (
          <Card className="text-center text-sm text-gray-400 dark:text-zinc-500 py-8">
            正在加载今日科普内容…
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {top4.map((a) => {
              const c = categoryColor(a.category);
              const date = a.created_at ? new Date(a.created_at).toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit' }) : '';
              return (
                <Link
                  key={a.id || a.slug}
                  to={`/app/articles`}
                  className="group no-underline"
                >
                  <Card className="flex gap-3 hover:shadow-md hover:-translate-y-0.5 transition-all p-3.5">
                    <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${c.gradient} grid place-items-center text-2xl flex-shrink-0 shadow-sm`}>
                      {a.category === 'stress-relief' ? '🧠' : a.category === 'positive-growth' ? '🌿' : a.category === 'low-mood' ? '🌧' : '💡'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 text-[11px] text-gray-500 dark:text-zinc-400 mb-1">
                        <span className={`px-1.5 py-0.5 rounded ${c.tagBg} ${c.tagFg} font-medium`}>{c.label}</span>
                        {date && <span>· {date}</span>}
                        <span className="ml-auto px-1.5 py-0.5 rounded text-[9px] font-bold bg-gradient-to-r from-amber-400 to-orange-400 text-white">NEW</span>
                      </div>
                      <h3 className="text-sm font-semibold text-gray-800 dark:text-zinc-100 line-clamp-2 group-hover:text-primary-600 transition-colors">
                        {a.title}
                      </h3>
                    </div>
                  </Card>
                </Link>
              );
            })}
          </div>
        )}
      </section>

      {/* 3 个快速行动 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {QUICK_ACTIONS.map((q) => (
          <button
            key={q.title}
            onClick={() => navigate(q.to)}
            className="flex items-center gap-3 p-3 bg-white dark:bg-zinc-800 rounded-2xl border border-gray-100 dark:border-zinc-700 hover:shadow-md hover:-translate-y-0.5 transition-all text-left"
          >
            <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${q.gradient} grid place-items-center text-white text-lg flex-shrink-0`}>
              {q.icon}
            </div>
            <div className="min-w-0">
              <h3 className="font-semibold text-sm text-gray-800 dark:text-zinc-100">{q.title}</h3>
              <p className="text-[11px] text-gray-500 dark:text-zinc-400 mt-0.5 truncate">{q.desc}</p>
            </div>
          </button>
        ))}
      </div>

      {/* 6 大模块网格 */}
      <section>
        <div className="flex items-end justify-between mb-3">
          <div>
            <p className="text-xs text-gray-400 dark:text-zinc-500 uppercase tracking-wide">所有功能</p>
            <h2 className="text-lg font-bold text-gray-800 dark:text-zinc-100 mt-1">你想做点什么?</h2>
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {MODULES.map((m) => (
            <button
              key={m.title}
              onClick={() => navigate(m.to)}
              className="group bg-white dark:bg-zinc-800 rounded-2xl border border-gray-100 dark:border-zinc-700 p-4 text-left hover:shadow-md hover:-translate-y-0.5 transition-all"
            >
              <div className={`w-11 h-11 rounded-2xl bg-gradient-to-br ${m.color} grid place-items-center text-white text-xl mb-2.5 shadow-sm`}>
                {m.icon}
              </div>
              <h3 className="font-semibold text-sm text-gray-800 dark:text-zinc-100">{m.title}</h3>
              <p className="text-[11px] text-gray-500 dark:text-zinc-400 mt-0.5 line-clamp-2 leading-relaxed">{m.desc}</p>
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}
