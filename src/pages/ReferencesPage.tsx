import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Card } from '../components/ui/Card';
import { Spinner } from '../components/ui/Spinner';
import api from '../lib/axios';
import { ENDPOINTS } from '../config/api';

interface Book {
  serial: string;
  name: string;
  author: string;
  chapters: number;
}

interface BookProgress {
  book_title: string;
  current_chapter: number;
  total_chapters: number;
  updated_at: string;
}

export function ReferencesPage() {
  const [books, setBooks] = useState<Book[]>([]);
  const [progress, setProgress] = useState<BookProgress[]>([]);
  const [loading, setLoading] = useState(true);
  const [keyword, setKeyword] = useState('');
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 12;
  const navigate = useNavigate();

  useEffect(() => {
    api.get(ENDPOINTS.REFERENCES).then((res) => setBooks(res.data.data?.books || [])).catch(() => {});
    api.get('/reading/progress').then((res) => setProgress(res.data.data?.progress || [])).catch(() => {});
    setLoading(false);
  }, []);

  // 搜索时重置回第 1 页
  useEffect(() => { setPage(1); }, [keyword]);

  const handleContinue = (serial: string) => {
    navigate(`/app/listen/${serial}`);
  };

  const handleDeleteProgress = async (e: React.MouseEvent, bookTitle: string) => {
    e.stopPropagation();
    e.preventDefault();
    try {
      await api.delete(`/reading/progress/${encodeURIComponent(bookTitle)}`);
      setProgress((prev) => prev.filter((p) => p.book_title !== bookTitle));
    } catch { /* silent */ }
  };

  const filtered = useMemo(() => {
    const k = keyword.trim().toLowerCase();
    if (!k) return books;
    return books.filter(
      (b) => b.name.toLowerCase().includes(k)
        || b.author.toLowerCase().includes(k)
        || b.serial.includes(k)
        || String(parseInt(b.serial, 10)).includes(k),
    );
  }, [books, keyword]);

  // 分页
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const paged = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-4">
        <h2 className="text-lg font-semibold text-gray-800 dark:text-zinc-200 mb-1">📚 经典书目</h2>
        <p className="text-xs text-gray-400 leading-relaxed">
          💡 点击任意书籍卡片进入 AI 听书章节列表（5-8 分钟/章）；切换顶部「🎧 AI 听书」tab 可浏览所有可听书籍，每日限听 120 分钟。
        </p>
      </div>

      {/* P2-#13: 继续阅读 */}
      {progress.length > 0 && (
        <div className="mb-6">
          <h3 className="text-sm font-medium text-gray-700 dark:text-zinc-300 mb-3">📌 继续阅读</h3>
          <div className="flex gap-3 overflow-x-auto pb-1">
            {progress.slice(0, 5).map((p) => (
              <Card
                key={p.book_title}
                className="relative p-3 min-w-[200px] max-w-[240px] flex-shrink-0 cursor-pointer hover:shadow-md transition-shadow
                  bg-gradient-to-br from-primary-50/60 to-white dark:from-primary-900/20 dark:to-zinc-800"
                onClick={() => {
                  const book = books.find((b) => b.name === p.book_title);
                  if (book) handleContinue(book.serial);
                }}
              >
                <button
                  onClick={(e) => handleDeleteProgress(e, p.book_title)}
                  className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full flex items-center justify-center
                    text-gray-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 text-xs leading-none"
                  title="删除阅读记录"
                >
                  ×
                </button>
                <p className="font-medium text-gray-800 dark:text-zinc-200 text-sm line-clamp-1 pr-4">{p.book_title}</p>
                <p className="text-xs text-gray-400 mt-1">
                  进度 {p.current_chapter}/{p.total_chapters} 章
                </p>
                <p className="text-[10px] text-gray-300 dark:text-zinc-600 mt-1">
                  {new Date(p.updated_at).toLocaleDateString('zh-CN')}
                </p>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* 搜索 */}
      <input
        value={keyword}
        onChange={(e) => setKeyword(e.target.value)}
        placeholder="搜索编号、书名或作者…"
        className="w-full sm:w-72 px-3 py-2 text-sm border border-gray-200 rounded-lg mb-5 bg-white
          focus:outline-none focus:ring-2 focus:ring-primary-300
          dark:bg-zinc-800 dark:border-zinc-600 dark:text-zinc-200"
      />

      {loading ? (
        <div className="py-20"><Spinner /></div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <span className="text-4xl">📖</span>
          <p className="mt-2 text-sm">{keyword ? '没有匹配的书目' : '知识库暂不可用，请稍后再试'}</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {paged.map((b) => (
              <Link
                key={`${b.serial}-${b.name}`}
                to="/app/listen"
                state={{ bookSerial: b.serial }}
                className="no-underline"
              >
                <Card className="p-4 h-full cursor-pointer hover:shadow-md transition-shadow">
                  <div className="flex items-start gap-2.5">
                  <span
                    className="flex-shrink-0 px-1.5 py-0.5 rounded-md text-xs font-semibold
                      bg-primary-50 text-primary-700 dark:bg-primary-900/30 dark:text-primary-400"
                    style={{ fontVariantNumeric: 'tabular-nums' }}
                  >
                    {parseInt(b.serial, 10) || b.serial}
                  </span>
                  <div className="min-w-0">
                    <h3 className="font-medium text-gray-800 dark:text-zinc-200 text-sm leading-snug line-clamp-2">
                      {b.name}
                    </h3>
                    <div className="flex items-center gap-2 mt-1.5 text-xs text-gray-400 dark:text-zinc-500">
                      {b.author && <span className="truncate">✍️ {b.author}</span>}
                      {b.chapters > 1 && <span className="flex-shrink-0">{b.chapters} 章</span>}
                    </div>
                  </div>
                </div>
                </Card>
              </Link>
            ))}
          </div>

          {/* 分页 */}
          {filtered.length > PAGE_SIZE && (
            <div className="mt-6 flex items-center justify-between text-sm">
              <div className="text-xs text-gray-400">
                共 {filtered.length} 本 · 第 {safePage} / {totalPages} 页
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setPage(1)}
                  disabled={safePage === 1}
                  className="px-2.5 py-1.5 rounded-md text-gray-600 hover:bg-gray-100 disabled:opacity-30 disabled:hover:bg-transparent"
                  title="首页"
                >«</button>
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={safePage === 1}
                  className="px-3 py-1.5 rounded-md text-gray-600 hover:bg-gray-100 disabled:opacity-30 disabled:hover:bg-transparent"
                >‹ 上一页</button>
                <span className="px-3 py-1.5 text-gray-800 font-medium">
                  {safePage} / {totalPages}
                </span>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={safePage === totalPages}
                  className="px-3 py-1.5 rounded-md text-gray-600 hover:bg-gray-100 disabled:opacity-30 disabled:hover:bg-transparent"
                >下一页 ›</button>
                <button
                  onClick={() => setPage(totalPages)}
                  disabled={safePage === totalPages}
                  className="px-2.5 py-1.5 rounded-md text-gray-600 hover:bg-gray-100 disabled:opacity-30 disabled:hover:bg-transparent"
                  title="末页"
                >»</button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
