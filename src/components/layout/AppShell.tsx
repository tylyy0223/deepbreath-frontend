import { useState, useCallback, type ReactNode } from 'react';
import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';
import { MobileNav } from './MobileNav';
import { UpdateBanner } from './UpdateBanner';
import { MoodQuickEntry } from './MoodQuickEntry';
import { useNetworkStatus } from '../../hooks/useNetworkStatus';

export function AppShell({ children }: { children: ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const isOnline = useNetworkStatus();

  const closeSidebar = useCallback(() => setSidebarOpen(false), []);

  return (
    <div className="flex h-screen h-dvh bg-surface-light dark:bg-zinc-900">
      {/* Desktop sidebar */}
      <div className="hidden lg:flex w-60 flex-shrink-0">
        <Sidebar />
      </div>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div
            className="absolute inset-0 bg-black/30"
            onClick={closeSidebar}
          />
          <div className="absolute left-0 top-0 bottom-0 w-60 z-50 shadow-xl">
            <Sidebar onClose={closeSidebar} />
          </div>
        </div>
      )}

      {/* Main area */}
      <div className="flex flex-col flex-1 min-w-0">
        <TopBar onMenuClick={() => setSidebarOpen(true)} />
        {!isOnline && (
          <div className="px-4 py-1.5 text-xs text-center bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 border-b border-amber-200 dark:border-amber-800">
            ⚡ 当前离线——部分功能可能不可用
          </div>
        )}
        <main className="flex-1 overflow-auto p-4 lg:p-6 pb-20 lg:pb-6">
          {children}
        </main>
        <MobileNav />
      </div>

      {/* 壳 APP 新版本提示（浏览器不渲染） */}
      <UpdateBanner />

      {/* 情绪快速入口 */}
      <MoodQuickEntry />
    </div>
  );
}
