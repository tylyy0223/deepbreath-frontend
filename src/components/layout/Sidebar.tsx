import { useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../../stores/authStore';
import { useCheckInStore } from '../../stores/checkinStore';

export function Sidebar({ onClose }: { onClose?: () => void }) {
  const { t } = useTranslation();
  const isAdmin = useAuthStore((s) => s.user?.role === 'admin');
  const { status, fetchStatus } = useCheckInStore();
  const notChecked = status && !status.checked_today;

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  const CHAT_MODES = [
    { to: '/app/chat/science', label: t('chat.science'), icon: '📚' },
    { to: '/app/chat/counseling', label: t('chat.counseling'), icon: '🌳' },
    { to: '/app/chat/assessment', label: t('chat.assessment'), icon: '📋' },
    { to: '/app/chat/reading', label: t('chat.reading'), icon: '📖' },
  ];

  const CONTENT = [
    { to: '/app/knowledge', label: t('nav.knowledge', '知识库'), icon: '📚' },
    { to: '/app/community', label: t('nav.community'), icon: '💬' },
  ];

  const TOOLS = [
    { to: '/app/checkin', label: t('nav.checkin', '每日签到'), icon: '📅', id: 'checkin' },
    { to: '/app/breath', label: t('nav.breath'), icon: '🫁' },
    { to: '/app/diary', label: t('nav.diary'), icon: '📔' },
    { to: '/app/report', label: t('nav.report'), icon: '📊' },
    { to: '/app/scales', label: t('nav.scales'), icon: '📝' },
  ];

  const ACCOUNT = [
    { to: '/app/sessions', label: t('nav.sessions'), icon: '📁' },
    { to: '/app/credits', label: t('nav.credits'), icon: '💎' },
  ];

  function NavSection({ items }: { items: typeof CHAT_MODES }) {
    return (
      <>
        {items.map((item) => {
          const isCheckinUnchecked = (item as any).id === 'checkin' && notChecked;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end
              onClick={onClose}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors no-underline
                ${isActive ? 'bg-primary-50 text-primary-700 dark:bg-primary-900/30 dark:text-primary-400' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-800 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-200'}
                ${isCheckinUnchecked ? 'animate-blink' : ''}`
              }
            >
              <span className="text-lg">{item.icon}</span>
              {item.label}
            </NavLink>
          );
        })}
      </>
    );
  }

  return (
    <aside className="flex flex-col h-full bg-white border-r border-gray-100 dark:bg-zinc-900 dark:border-zinc-700">
      {/* Logo */}
      <div className="p-5 border-b border-gray-100 dark:border-zinc-700">
        <NavLink to="/app/chat/science" className="flex items-center gap-3 no-underline" onClick={onClose}>
          <span className="text-2xl">🍃</span>
          <div>
            <div className="font-semibold text-gray-800 dark:text-zinc-200 text-sm">DeepBreath</div>
            <div className="text-xs text-gray-400 dark:text-zinc-500">深呼吸</div>
          </div>
        </NavLink>
      </div>

      {/* Nav */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        <NavLink
          to="/app/dashboard"
          end
          onClick={onClose}
          className={({ isActive }) =>
            `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors no-underline
            ${isActive ? 'bg-primary-50 text-primary-700 dark:bg-primary-900/30 dark:text-primary-400' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-800 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-200'}`
          }
        >
          <span className="text-lg">🏠</span>
          {t('nav.dashboard', '工作台')}
        </NavLink>

        <p className="px-3 py-1 text-xs font-medium text-gray-400 dark:text-zinc-500 uppercase tracking-wide">
          {t('nav.chat', 'AI Chat')}
        </p>
        <NavSection items={CHAT_MODES} />

        <div className="my-3 border-t border-gray-100 dark:border-zinc-700" />

        <p className="px-3 py-1 text-xs font-medium text-gray-400 dark:text-zinc-500 uppercase tracking-wide">
          {t('nav.content', '内容')}
        </p>
        <NavSection items={CONTENT} />

        <div className="my-3 border-t border-gray-100 dark:border-zinc-700" />

        <p className="px-3 py-1 text-xs font-medium text-gray-400 dark:text-zinc-500 uppercase tracking-wide">
          {t('nav.tools', '工具')}
        </p>
        <NavSection items={TOOLS} />

        <div className="my-3 border-t border-gray-100 dark:border-zinc-700" />

        <p className="px-3 py-1 text-xs font-medium text-gray-400 dark:text-zinc-500 uppercase tracking-wide">
          {t('nav.account', '账户')}
        </p>
        <NavSection items={ACCOUNT} />
      </nav>

      {/* Footer */}
      <div className="border-t border-gray-100 dark:border-zinc-700 p-3">
        {isAdmin && (
          <NavLink
            to="/app/admin"
            onClick={onClose}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors no-underline
              ${isActive ? 'bg-primary-50 text-primary-700 dark:bg-primary-900/30 dark:text-primary-400' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-800 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-200'}`
            }
          >
            <span className="text-lg">🛠</span>
            {t('nav.admin')}
          </NavLink>
        )}
        <NavLink
          to="/app/settings"
          onClick={onClose}
          className={({ isActive }) =>
            `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors no-underline
            ${isActive ? 'bg-primary-50 text-primary-700 dark:bg-primary-900/30 dark:text-primary-400' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-800 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-200'}`
          }
        >
          <span className="text-lg">⚙️</span>
          {t('nav.settings')}
        </NavLink>
      </div>
    </aside>
  );
}
