import { useEffect, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';

const NAV_ITEMS = [
  { to: '/app/dashboard', label: '工作台', icon: '🏠' },
  { to: '/app/breath', label: '呼吸', icon: '🫁' },
  { to: '/app/chat/science', label: '对话', icon: '💬', center: true },
  { to: '/app/diary', label: '日记', icon: '📔' },
  { to: '/app/articles', label: '科普', icon: '📰' },
];

function isTextField(el: Element | null): boolean {
  if (!el) return false;
  const tag = el.tagName;
  return tag === 'TEXTAREA' || tag === 'INPUT' || tag === 'SELECT' || (el as HTMLElement).isContentEditable;
}

export function MobileNav() {
  const location = useLocation();
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    const onFocusIn = (e: FocusEvent) => {
      if (isTextField(e.target as Element)) setHidden(true);
    };
    const onFocusOut = () => {
      setTimeout(() => {
        if (!isTextField(document.activeElement)) setHidden(false);
      }, 120);
    };
    document.addEventListener('focusin', onFocusIn);
    document.addEventListener('focusout', onFocusOut);
    return () => {
      document.removeEventListener('focusin', onFocusIn);
      document.removeEventListener('focusout', onFocusOut);
    };
  }, []);

  if (hidden) return null;

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 dark:bg-zinc-900 dark:border-zinc-700 z-30 safe-area-bottom">
      <div className="flex items-center justify-around h-14">
        {NAV_ITEMS.map((item) => {
          const isActive = location.pathname.startsWith(item.to);
          if (item.center) {
            return (
              <NavLink
                key={item.to}
                to={item.to}
                className="relative flex flex-col items-center gap-0.5 text-xs font-medium no-underline -mt-5"
              >
                <span className="w-11 h-11 rounded-full bg-gradient-to-br from-amber-300 to-orange-400 shadow-lg shadow-orange-200/50 dark:shadow-orange-900/50 grid place-items-center text-white text-lg border-4 border-white dark:border-zinc-900">
                  {item.icon}
                </span>
                <span className={`mt-0.5 ${isActive ? 'text-primary-600' : 'text-gray-500 dark:text-zinc-400'}`}>
                  {item.label}
                </span>
              </NavLink>
            );
          }
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={`flex flex-col items-center gap-0.5 text-xs font-medium no-underline
                ${isActive ? 'text-primary-600' : 'text-gray-400'}`}
            >
              <span className="text-lg">{item.icon}</span>
              {item.label}
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
}
