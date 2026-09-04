import { forwardRef } from 'react';
import type { HTMLAttributes } from 'react';

export const Card = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className = '', children, ...props }, ref) => (
    <div
      ref={ref}
      className={`bg-white rounded-2xl border border-gray-100/80 shadow-card transition-shadow duration-200
        hover:shadow-card-hover
        dark:bg-zinc-800 dark:border-zinc-700/50 ${className}`}
      {...props}
    >
      {children}
    </div>
  ),
);

Card.displayName = 'Card';
