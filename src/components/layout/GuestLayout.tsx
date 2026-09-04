import type { ReactNode } from 'react';
import { Card } from '../ui/Card';

export function GuestLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-gradient-to-b from-primary-50/50 to-surface-light dark:from-zinc-800 dark:to-zinc-900 flex items-center justify-center p-4">
      <Card className="w-full max-w-md p-8">
        {/* Logo area */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary-100 mb-4">
            <span className="text-3xl">🍃</span>
          </div>
          <h1 className="text-2xl font-semibold text-gray-800">深呼吸 DeepBreath</h1>
          <p className="text-sm text-gray-400 mt-1">你的心理陪伴平台</p>
        </div>
        {children}
      </Card>

      {/* APP 下载入口（壳 APP 内不显示） */}
      {!('Capacitor' in window) && (
        <a
          href="/app/download/deepbreath-latest.apk"
          className="fixed bottom-4 left-1/2 -translate-x-1/2 text-xs text-gray-400 hover:text-primary-600 no-underline"
        >
          📲 下载安卓 APP
        </a>
      )}
    </div>
  );
}
