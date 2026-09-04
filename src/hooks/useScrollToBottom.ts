import { useEffect, useRef } from 'react';

export function useScrollToBottom(deps: unknown[]) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (ref.current) {
      ref.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, deps);

  return ref;
}
