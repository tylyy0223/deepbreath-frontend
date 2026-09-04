/** AI 听书 · 书架 (多书选择) */
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Card } from '../components/ui/Card';
import { Spinner } from '../components/ui/Spinner';
import api from '../lib/axios';
import { ENDPOINTS } from '../config/api';

interface Book {
  serial: string;
  book_index: number;
  chapters: number;
  total_seconds: number;
  total_chars: number;
  first_title: string;
  last_chapter: number;
  listened_seconds_est: number;
  progress_percent: number;
}

interface Limit {
  enabled: boolean;
  limit_minutes: number;
  used_seconds: number;
  remaining_seconds: number;
}

const BOOK_COLORS = [
  'from-emerald-400 to-teal-500',
  'from-amber-400 to-orange-500',
  'from-violet-400 to-indigo-500',
  'from-rose-400 to-pink-500',
  'from-sky-400 to-blue-500',
  'from-cyan-400 to-sky-500',
];

const BOOK_EMOJI = ['📚', '📖', '📘', '📕', '📗', '📙'];

function fmt(sec: number) {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

function bookNameFromTitle(t: string) {
  // 第一章: 整个人都不太好 → "蛤蟆先生去看心理医生" (从 title 提取, fallback)
  if (!t) return '未知书名';
  // 实际场景下后端会补 serial->书名映射; 暂时用 title
  return t.split(':')[0] || t;
}

export function BooksListPage() {
  const [books, setBooks] = useState<Book[]>([]);
  const [limit, setLimit] = useState<Limit | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    setLoading(true);
    try {
      const res = await api.get(ENDPOINTS.BOOK_LISTEN_BOOKS);
      setBooks(res.data.data?.books || []);
      setLimit(res.data.data?.limit || null);
    } catch (e) {
      console.error('load fail', e);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="flex justify-center py-20"><Spinner /></div>;
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-800">🎧 AI 听书</h1>
        <p className="text-sm text-gray-500 mt-1">听 AI 评析心理学经典 · 每章 5-8 分钟</p>
      </div>

      {limit && (
        <Card className="p-4 mb-6">
          <div className="flex items-center justify-between text-sm mb-2">
            <span className="text-gray-600">📊 今日听书 (跨书共用)</span>
            <span className={`font-semibold ${limit.remaining_seconds === 0 ? 'text-red-500' : 'text-gray-800'}`}>
              {fmt(limit.used_seconds)} / {limit.limit_minutes} 分钟
            </span>
          </div>
          <div className="relative h-3 bg-gray-100 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all ${
                limit.remaining_seconds === 0
                  ? 'bg-red-500'
                  : limit.remaining_seconds < 600
                  ? 'bg-amber-500'
                  : 'bg-emerald-500'
              }`}
              style={{ width: `${Math.min(100, (limit.used_seconds / (limit.limit_minutes * 60)) * 100)}%` }}
            />
            <div className="absolute inset-0 flex items-center justify-center text-[10px] font-medium text-gray-600">
              {Math.round((limit.used_seconds / (limit.limit_minutes * 60)) * 100)}%
            </div>
          </div>
          {limit.remaining_seconds === 0 ? (
            <p className="text-xs text-red-500 mt-2 font-medium">
              ⛔ 今日听书时间已用完, 明天可以继续
            </p>
          ) : limit.remaining_seconds < 600 ? (
            <p className="text-xs text-amber-600 mt-2">
              ⚠️ 剩余 {fmt(limit.remaining_seconds)}, 不够再听一整章
            </p>
          ) : (
            <p className="text-xs text-gray-400 mt-2">
              剩余 {fmt(limit.remaining_seconds)} · 改阈值改 app_settings
            </p>
          )}
        </Card>
      )}

      {books.length === 0 ? (
        <Card className="p-8 text-center text-gray-400">还没有可听的书籍,等后端补数据</Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {books.map((b, idx) => {
            const color = BOOK_COLORS[idx % BOOK_COLORS.length];
            const emoji = BOOK_EMOJI[idx % BOOK_EMOJI.length];
            return (
              <Link
                key={b.serial}
                to={`/app/knowledge/listen/${b.serial}`}
                className="no-underline"
              >
                <Card className="p-0 hover:shadow-lg transition cursor-pointer overflow-hidden">
                  <div className={`bg-gradient-to-br ${color} p-5 text-white relative`}>
                    <div className="text-4xl mb-2">{emoji}</div>
                    <div className="text-xs opacity-80">编号 {b.serial}</div>
                    <div className="text-lg font-semibold mt-1">
                      {b.serial === '004-271' ? '蛤蟆先生去看心理医生'
                        : b.serial === '004-028' ? '弗洛伊德文集'
                        : b.serial === '004-176' ? '7个顶级心理预言'
                        : b.serial === '004-175' ? '20个心理学典型现象'
                        : b.serial === '004-211' ? '少有人走的路'
                        : b.serial === '004-213' ? '自控力'
                        : b.serial === '004-007' ? '衰老的真相'
                        : b.serial === '004-006' ? '荣格分析心理学导论'
                        : b.serial === '004-005' ? '女性心灵成长图鉴'
                        : b.serial === '004-004' ? '超级心智'
                        : b.serial === '004-002' ? '遇见未知的自己'
                        : b.serial === '004-003' ? '走出孤独'
                        : bookNameFromTitle(b.first_title)}
                    </div>
                    {b.book_index > 0 && (
                      <div className="absolute top-3 right-3 bg-white/25 backdrop-blur-sm text-white text-xs font-semibold px-2.5 py-1 rounded-full ring-1 ring-white/40">
                        经典 {b.book_index}
                      </div>
                    )}
                  </div>
                  <div className="p-4">
                    <div className="flex items-center justify-between text-xs text-gray-500 mb-2">
                      <span>{b.chapters} 章 · {fmt(b.total_seconds)}</span>
                      <span>评析 {b.total_chars.toLocaleString()} 字</span>
                    </div>
                    {b.progress_percent > 0 ? (
                      <div>
                        <div className="flex justify-between text-xs mb-1">
                          <span className="text-emerald-600 font-medium">已听 {b.progress_percent}%</span>
                          <span className="text-gray-400">第 {b.last_chapter} 章</span>
                        </div>
                        <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-emerald-500"
                            style={{ width: `${b.progress_percent}%` }}
                          />
                        </div>
                      </div>
                    ) : (
                      <div className="text-xs text-gray-400">未开始</div>
                    )}
                    <div className="mt-3 flex items-center gap-2 text-emerald-600 text-sm font-medium">
                      <span>{b.last_chapter > 0 ? '▶ 继续听' : '▶ 开始听'}</span>
                      <span className="text-gray-300">|</span>
                      <span className="text-gray-500 font-normal">{b.chapters} 章</span>
                    </div>
                  </div>
                </Card>
              </Link>
            );
          })}
        </div>
      )}

      {books.length > 0 && (
        <p className="text-xs text-gray-400 mt-6 text-center">
          新书评析稿由 DeepSeek 生成 · TTS 由硅基流动 (speech-2.8-hd) 合成 · 仅供学习,鼓励支持正版
        </p>
      )}
    </div>
  );
}
