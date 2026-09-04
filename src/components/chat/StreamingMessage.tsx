export function StreamingMessage({ content }: { content: string }) {
  if (!content) {
    return (
      <div className="flex justify-start">
        <div className="bg-white border border-gray-100 rounded-2xl rounded-bl-md px-5 py-3 shadow-sm dark:bg-zinc-800 dark:border-zinc-700">
          <div className="flex items-center gap-2">
            <div className="flex gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-primary-400 animate-pulse-soft" />
              <span className="w-2.5 h-2.5 rounded-full bg-primary-400 animate-pulse-soft" style={{ animationDelay: '0.2s' }} />
              <span className="w-2.5 h-2.5 rounded-full bg-primary-400 animate-pulse-soft" style={{ animationDelay: '0.4s' }} />
            </div>
            <span className="text-xs text-gray-400 dark:text-zinc-500">思考中...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex justify-start">
      <div className="max-w-[80%] px-4 py-2.5 rounded-2xl rounded-bl-md text-sm leading-relaxed whitespace-pre-wrap break-words bg-white border border-gray-100 text-gray-700 shadow-sm dark:bg-zinc-800 dark:border-zinc-700 dark:text-zinc-300">
        {content}
        <span className="inline-block w-1.5 h-4 ml-0.5 bg-primary-400 rounded-sm animate-blink align-text-bottom" />
      </div>
    </div>
  );
}
