import { useEffect, useState } from 'react';
import { checkAppUpdate, dismissUpdate, openDownload } from '../../lib/appUpdate';
import type { AppVersionInfo } from '../../lib/appUpdate';

/** 壳 APP 内的新版本提示横幅（浏览器环境不渲染） */
export function UpdateBanner() {
  const [update, setUpdate] = useState<AppVersionInfo | null>(null);

  useEffect(() => {
    checkAppUpdate().then(setUpdate);
  }, []);

  if (!update) return null;

  return (
    <div className="fixed bottom-16 lg:bottom-4 left-1/2 -translate-x-1/2 z-50 w-[calc(100%-2rem)] max-w-md">
      <div className="flex items-center gap-3 px-4 py-3 rounded-2xl shadow-lg border
        bg-white border-primary-200 dark:bg-zinc-800 dark:border-primary-700">
        <span className="text-xl">🍃</span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-800 dark:text-zinc-200">
            发现新版本 v{update.versionName}
          </p>
          <p className="text-xs text-gray-400 truncate">{update.notes || '建议升级获得最佳体验'}</p>
        </div>
        <button
          onClick={() => openDownload(update.url)}
          className="flex-shrink-0 px-3 py-1.5 text-xs font-medium rounded-lg bg-primary-500 text-white hover:bg-primary-600"
        >
          立即更新
        </button>
        <button
          onClick={() => { dismissUpdate(update.versionCode); setUpdate(null); }}
          className="flex-shrink-0 text-gray-400 hover:text-gray-600 text-lg leading-none"
          aria-label="关闭"
        >
          ×
        </button>
      </div>
    </div>
  );
}
