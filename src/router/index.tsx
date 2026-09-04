import { lazy, Suspense } from 'react';
import { createBrowserRouter, Navigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { RequireAuth } from '../components/auth/RequireAuth';
import { RequireAdmin } from '../components/auth/RequireAdmin';
import { Spinner } from '../components/ui/Spinner';

// P2-#16: React.lazy 按路由拆分。页面是命名导出，用 wrapper 转 default
function lazyNamed<T extends Record<string, React.ComponentType<unknown>>>(
  imp: () => Promise<T>,
  name: keyof T,
) {
  return lazy(async () => {
    const mod = await imp();
    return { default: mod[name] };
  });
}

const Lazy = (imp: () => Promise<Record<string, React.ComponentType<unknown>>>, name: string) => {
  const Comp = lazyNamed(imp, name);
  return (
    <Suspense fallback={<div className="flex items-center justify-center py-20"><Spinner /></div>}>
      <Comp />
    </Suspense>
  );
};

// 登录/注册：首屏大概率命中，eager 加载
import { LoginPage } from '../pages/LoginPage';
import { RegisterPage } from '../pages/RegisterPage';
// 聊天：核心体验，eager 加载
import { ChatPage } from '../pages/ChatPage';
// 封面介绍页（登录前展示）
import { IntroPage } from '../pages/IntroPage';
// 404
import { NotFoundPage } from '../pages/NotFoundPage';

// 首页入口：未登录显示封面，已登录跳到工作台 Dashboard
function HomeGate() {
  const isInitializing = useAuthStore((s) => s.isInitializing);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  if (isInitializing) return null; // 等待 init 完成
  if (isAuthenticated) return <Navigate to="/app/dashboard" replace />;
  return <IntroPage />;
}

export const router = createBrowserRouter([
  {
    path: '/app',
    children: [
      { path: 'login', element: <LoginPage /> },
      { path: 'register', element: <RegisterPage /> },
      { path: 'dashboard', element: <RequireAuth>{Lazy(() => import('../pages/DashboardPage'), 'DashboardPage')}</RequireAuth> },
      { path: 'chat/:mode', element: <RequireAuth><ChatPage /></RequireAuth> },
      { path: 'chat', element: <Navigate to="/app/chat/science" replace /> },

      // Lazy-loaded pages
      { path: 'breath', element: <RequireAuth>{Lazy(() => import('../pages/BreathPage'), 'BreathPage')}</RequireAuth> },
      { path: 'breath/:id', element: <RequireAuth>{Lazy(() => import('../pages/BreathSessionPage'), 'BreathSessionPage')}</RequireAuth> },
      { path: 'checkin', element: <RequireAuth>{Lazy(() => import('../pages/CheckInPage'), 'CheckInPage')}</RequireAuth> },
      { path: 'diary', element: <RequireAuth>{Lazy(() => import('../pages/DiaryPage'), 'DiaryPage')}</RequireAuth> },
      { path: 'diary/new', element: <RequireAuth>{Lazy(() => import('../pages/DiaryCreatePage'), 'DiaryCreatePage')}</RequireAuth> },
      { path: 'diary/:id/edit', element: <RequireAuth>{Lazy(() => import('../pages/DiaryEditPage'), 'DiaryEditPage')}</RequireAuth> },
      { path: 'diary/:id', element: <RequireAuth>{Lazy(() => import('../pages/DiaryDetailPage'), 'DiaryDetailPage')}</RequireAuth> },
      { path: 'articles', element: <RequireAuth><Navigate to="/app/knowledge/articles" replace /></RequireAuth> },
      { path: 'community', element: <RequireAuth>{Lazy(() => import('../pages/CommunityPage'), 'CommunityPage')}</RequireAuth> },
      { path: 'community/:id', element: <RequireAuth>{Lazy(() => import('../pages/CommunityPostPage'), 'CommunityPostPage')}</RequireAuth> },
      { path: 'sessions', element: <RequireAuth>{Lazy(() => import('../pages/SessionsPage'), 'SessionsPage')}</RequireAuth> },
      { path: 'settings', element: <RequireAuth>{Lazy(() => import('../pages/SettingsPage'), 'SettingsPage')}</RequireAuth> },
      { path: 'credits', element: <RequireAuth>{Lazy(() => import('../pages/CreditsPage'), 'CreditsPage')}</RequireAuth> },
      { path: 'scales', element: <RequireAuth>{Lazy(() => import('../pages/ScalesPage'), 'ScalesPage')}</RequireAuth> },
      { path: 'scales/:id', element: <RequireAuth>{Lazy(() => import('../pages/ScaleTestPage'), 'ScaleTestPage')}</RequireAuth> },
      { path: 'references', element: <RequireAuth><Navigate to="/app/knowledge/books" replace /></RequireAuth> },
      { path: 'listen', element: <RequireAuth><Navigate to="/app/knowledge/listen" replace /></RequireAuth> },
      { path: 'listen/:serial', element: <RequireAuth><Navigate to="/app/knowledge/listen" replace /></RequireAuth> },
      { path: 'listen/:serial/:idx', element: <RequireAuth><Navigate to="/app/knowledge/listen" replace /></RequireAuth> },
      { path: 'report', element: <RequireAuth>{Lazy(() => import('../pages/WeeklyReportPage'), 'WeeklyReportPage')}</RequireAuth> },
      { path: 'admin', element: <RequireAdmin>{Lazy(() => import('../pages/AdminPage'), 'AdminPage')}</RequireAdmin> },
      {
        path: 'knowledge',
        element: <RequireAuth>{Lazy(() => import('../pages/KnowledgePage'), 'KnowledgePage')}</RequireAuth>,
        children: [
          { index: true, element: <Navigate to="books" replace /> },
          { path: 'books', element: Lazy(() => import('../pages/ReferencesPage'), 'ReferencesPage') },
          { path: 'articles', element: Lazy(() => import('../pages/ArticlesPage'), 'ArticlesPage') },
          { path: 'listen', element: Lazy(() => import('../pages/BooksListPage'), 'BooksListPage') },
          { path: 'listen/:serial', element: Lazy(() => import('../pages/ListenIndexPage'), 'ListenIndexPage') },
          { path: 'listen/:serial/:idx', element: Lazy(() => import('../pages/ChapterPlayerPage'), 'ChapterPlayerPage') },
        ],
      },
      { index: true, element: <HomeGate /> },
    ],
  },
  { path: '*', element: <NotFoundPage /> },
]);
