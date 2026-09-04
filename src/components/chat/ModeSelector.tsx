import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useChatStore } from '../../stores/chatStore';

const MODE_CONFIG: Record<string, { emoji: string; label: string }> = {
  science: { emoji: '📚', label: '心理科普' },
  counseling: { emoji: '🌳', label: '心理树洞' },
  assessment: { emoji: '📋', label: '心理评估' },
  reading: { emoji: '📖', label: '阅读模式' },
};

interface ModeSelectorProps {
  current: string;
}

export function ModeSelector({ current }: ModeSelectorProps) {
  const { modes, fetchModes } = useChatStore();

  useEffect(() => {
    fetchModes();
  }, [fetchModes]);

  // Build mode list from API or fallback to defaults
  const items =
    modes.length > 0
      ? modes.map((m) => ({
          value: m.value,
          label: m.label,
        }))
      : Object.entries(MODE_CONFIG).map(([value, { emoji, label }]) => ({
          value,
          label: `${emoji} ${label}`,
        }));

  return (
    <div className="flex gap-1.5 overflow-x-auto scrollbar-none">
      {items.map((m) => {
        const isActive = m.value === current;
        return (
          <Link
            key={m.value}
            to={`/app/chat/${m.value}`}
            className={`flex-shrink-0 px-3 py-1.5 text-xs rounded-full font-medium transition-colors no-underline
              ${isActive
                ? 'bg-primary-100 text-primary-700 border border-primary-200'
                : 'bg-white text-gray-500 border border-gray-200 hover:bg-gray-50'
              }`}
          >
            {m.label}
          </Link>
        );
      })}
    </div>
  );
}
