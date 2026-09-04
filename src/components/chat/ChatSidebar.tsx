import { useEffect } from 'react';
import { useChatStore } from '../../stores/chatStore';
import { Button } from '../ui/Button';

export function ChatSidebar() {
  const { sessions, currentSessionId, fetchSessions, selectSession, createSession, deleteSession } =
    useChatStore();

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  return (
    <div className="flex flex-col h-full border-r border-gray-100 bg-white w-56 flex-shrink-0">
      <div className="p-3 border-b border-gray-100">
        <Button
          size="sm"
          className="w-full"
          onClick={() => createSession()}
        >
          + 新对话
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
        {sessions.length === 0 ? (
          <p className="text-xs text-gray-400 text-center py-6">暂无对话记录</p>
        ) : (
          sessions.map((s) => {
            const isActive = s.id === currentSessionId;
            return (
              <div
                key={s.id}
                className={`group flex items-center justify-between px-3 py-2 rounded-lg text-sm cursor-pointer transition-colors
                  ${isActive ? 'bg-primary-50 text-primary-700' : 'text-gray-600 hover:bg-gray-50'}`}
                onClick={() => selectSession(s.id!)}
              >
                <span className="truncate flex-1">{s.title || `对话 #${s.id}`}</span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (confirm('删除这个对话？')) deleteSession(s.id!);
                  }}
                  className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 ml-1 flex-shrink-0"
                >
                  <svg width="14" height="14" viewBox="0 0 20 20" fill="currentColor">
                    <path
                      fillRule="evenodd"
                      d="M6 2a1 1 0 00-1 1v1H3a1 1 0 000 2h1v11a2 2 0 002 2h8a2 2 0 002-2V6h1a1 1 0 100-2h-2V3a1 1 0 00-1-1H6zm2 1h4v1H8V3zm-1 4a1 1 0 011 1v6a1 1 0 11-2 0V8a1 1 0 011-1zm5 1a1 1 0 10-2 0v6a1 1 0 102 0V8z"
                      clipRule="evenodd"
                    />
                  </svg>
                </button>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
