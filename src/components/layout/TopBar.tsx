import { useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import { useCreditsStore } from '../../stores/creditsStore';
import { Button } from '../ui/Button';

interface TopBarProps {
  onMenuClick?: () => void;
  title?: string;
}

export function TopBar({ onMenuClick, title }: TopBarProps) {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const balance = useCreditsStore((s) => s.balance);
  const fetchBalance = useCreditsStore((s) => s.fetchBalance);

  useEffect(() => {
    if (user) fetchBalance();
  }, [user, fetchBalance]);

  const handleLogout = async () => {
    await logout();
    window.location.href = '/app/login';
  };

  return (
    <header className="flex items-center justify-between h-14 px-4 bg-white border-b border-gray-100 dark:bg-zinc-900 dark:border-zinc-700">
      <div className="flex items-center gap-3">
        {/* Mobile menu button */}
        <button
          onClick={onMenuClick}
          className="lg:hidden p-1.5 rounded-lg hover:bg-gray-100 text-gray-500"
          aria-label="Toggle menu"
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M3 5h14M3 10h14M3 15h14" />
          </svg>
        </button>
        {title && <h1 className="text-sm font-medium text-gray-700 dark:text-zinc-300">{title}</h1>}
      </div>

      <div className="flex items-center gap-3">
        {/* Credits balance */}
        {user && balance !== null && (
          <NavLink
            to="/app/credits"
            className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium no-underline transition-colors
              ${balance < 100
                ? 'bg-red-50 text-red-600 hover:bg-red-100 dark:bg-red-900/30 dark:text-red-400'
                : 'bg-primary-50 text-primary-700 hover:bg-primary-100 dark:bg-primary-900/30 dark:text-primary-400'}`}
            title={balance < 100 ? '余额偏低，点击充值' : '我的 Credits'}
          >
            💎 {balance.toLocaleString()}
          </NavLink>
        )}
        {user && (
          <div className="hidden sm:flex items-center gap-2 text-sm text-gray-500">
            <div className="w-7 h-7 rounded-full bg-primary-100 flex items-center justify-center text-xs font-medium text-primary-600">
              {user.nickname?.charAt(0) || user.email.charAt(0)}
            </div>
            <span>{user.nickname || user.email}</span>
          </div>
        )}
        <Button variant="ghost" size="sm" onClick={handleLogout}>
          退出
        </Button>
      </div>
    </header>
  );
}
