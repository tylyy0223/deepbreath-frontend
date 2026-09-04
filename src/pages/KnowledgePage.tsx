/** 知识库 — 统一入口 (科普文章 / 经典书目 / AI 听书) */
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { useEffect } from 'react';

const TABS = [
  { to: '/app/knowledge/books', label: '📚 经典书目', fallback: '经典书目' },
  { to: '/app/knowledge/articles', label: '📰 科普文章', fallback: '科普文章' },
  { to: '/app/knowledge/listen', label: '🎧 AI 听书', fallback: 'AI 听书' },
];

export function KnowledgePage() {
  const loc = useLocation();
  // 切 tab 时回到顶部
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [loc.pathname]);

  return (
    <div>
      <div className="px-6 pt-6 pb-0">
        <h1 className="text-2xl font-semibold text-gray-800">📚 知识库</h1>
        <p className="text-sm text-gray-500 mt-1">心理学科普 · 经典书目 · AI 听书</p>
      </div>
      <div className="flex gap-1 px-6 mt-3 border-b border-gray-200">
        {TABS.map((t) => (
          <NavLink
            key={t.to}
            to={t.to}
            className={({ isActive }) =>
              `px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition ${
                isActive
                  ? 'border-emerald-500 text-emerald-600'
                  : 'border-transparent text-gray-500 hover:text-gray-800'
              }`
            }
          >
            {t.label}
          </NavLink>
        ))}
      </div>
      <Outlet />
    </div>
  );
}
