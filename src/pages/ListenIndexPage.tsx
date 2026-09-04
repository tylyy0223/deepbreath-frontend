/** AI 听书 · 章节列表页 (按 serial 展开) */
import { useEffect, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { Card } from '../components/ui/Card';
import { Spinner } from '../components/ui/Spinner';
import api from '../lib/axios';
import { ENDPOINTS } from '../config/api';

interface Chapter {
  chapter_idx: number;
  title: string;
  audio_url: string;
  audio_duration: number;
  explanation_chars: number;
  source_chars: number;
  status: string;
}

interface Limit {
  enabled: boolean;
  limit_minutes: number;
  used_seconds: number;
  remaining_seconds: number;
}

export function ListenIndexPage() {
  const { serial } = useParams<{ serial?: string }>();
  const [book, setBook] = useState<string>(serial || '004-271');
  const [books, setBooks] = useState<{ serial: string; book_index: number }[]>([]);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [limit, setLimit] = useState<Limit | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    if (serial) setBook(serial);
    load();
  }, [serial]);

  const load = async () => {
    setLoading(true);
    try {
      const [ch, lm, bk] = await Promise.all([
        api.get(ENDPOINTS.BOOK_LISTEN_SERIAL(book)),
        api.get(ENDPOINTS.BOOK_LISTEN_LIMIT),
        api.get(ENDPOINTS.BOOK_LISTEN_BOOKS),
      ]);
      setChapters(ch.data.data?.chapters || []);
      setLimit(lm.data.data || null);
      setBooks(bk.data.data?.books || []);
    } catch (e) {
      console.error('load fail', e);
    } finally {
      setLoading(false);
    }
  };

  // 顶部书选择器
  const switchBook = (s: string) => {
    if (s === book) return;
    setBook(s);
    navigate(`/app/knowledge/listen/${s}`);
  };

  const fmt = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${String(s).padStart(2, '0')}`;
  };

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <div>
          <Link to="/app/knowledge/listen" className="text-sm text-emerald-600 hover:underline">
            ← 书架
          </Link>
          <h1 className="text-2xl font-semibold text-gray-800 mt-1">
            📚 {book === '004-271' ? '蛤蟆先生去看心理医生'
              : book === '004-028' ? '弗洛伊德文集'
              : book === '004-176' ? '7个顶级心理预言'
              : book === '004-175' ? '20个心理学典型现象'
              : book === '004-211' ? '少有人走的路'
              : book === '004-213' ? '自控力'
              : book === '004-002' ? '遇见未知的自己'
              : book === '004-003' ? '走出孤独'
              : book}
          </h1>
        </div>
      </div>

      {/* 顶部书选择器 (多书时显示) */}
      {books.length > 1 && (
        <div className="mb-4 flex gap-2 overflow-x-auto pb-2">
          {books.map((b) => (
            <button
              key={b.serial}
              onClick={() => switchBook(b.serial)}
              className={`px-3 py-1.5 rounded-full text-sm whitespace-nowrap transition ${
                b.serial === book
                  ? 'bg-emerald-500 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {b.book_index > 0 && (
                <span className={`mr-1 text-[10px] font-semibold ${b.serial === book ? 'opacity-80' : 'text-emerald-600'}`}>
                  N{b.book_index}
                </span>
              )}
              {b.serial === '004-271' ? '蛤蟆先生'
                : b.serial === '004-028' ? '弗洛伊德'
                : b.serial === '004-176' ? '7个预言'
                : b.serial === '004-175' ? '20个现象'
                : b.serial === '004-211' ? '少有人走的路'
                : b.serial === '004-213' ? '自控力'
                        : b.serial === '004-007' ? '衰老的真相'
                        : b.serial === '004-006' ? '荣格分析心理学导论'
                        : b.serial === '004-005' ? '女性心灵成长图鉴'
                        : b.serial === '004-004' ? '超级心智'
                : b.serial === '004-002' ? '遇见未知的自己'
                : b.serial === '004-003' ? '走出孤独'
                : b.serial}
            </button>
          ))}
        </div>
      )}

      {limit && (
        <Card className="mb-4 p-4">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">今日听书</span>
            <span className="text-gray-800">
              {fmt(limit.used_seconds)} / {limit.limit_minutes} 分钟
            </span>
          </div>
          <div className="mt-2 h-2 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-emerald-500 transition-all"
              style={{ width: `${Math.min(100, (limit.used_seconds / (limit.limit_minutes * 60)) * 100)}%` }}
            />
          </div>
          <p className="text-xs text-gray-400 mt-2">
            剩余 {fmt(limit.remaining_seconds)} · 来源: app_settings
          </p>
        </Card>
      )}

      {loading ? (
        <div className="flex justify-center py-20"><Spinner /></div>
      ) : chapters.length === 0 ? (
        <Card className="p-8 text-center text-gray-400">该书暂无听书音频</Card>
      ) : (
        <div className="space-y-2">
          {chapters.map((c) => (
            <Card
              key={c.chapter_idx}
              className="p-4 hover:shadow-md transition cursor-pointer"
              onClick={() => navigate(`/app/knowledge/listen/${book}/${c.chapter_idx}`)}
            >
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="text-sm text-emerald-600 font-medium">第 {c.chapter_idx} 章</div>
                  <div className="text-gray-800 font-medium mt-0.5">{c.title}</div>
                  <div className="text-xs text-gray-400 mt-1">
                    {fmt(c.audio_duration)} · 评析 {c.explanation_chars} 字
                  </div>
                </div>
                <div className="text-emerald-500 text-2xl">▶</div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
