import { forwardRef, useId } from 'react';
import type { InputHTMLAttributes } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, className = '', id, ...props }, ref) => {
    const reactId = useId();
    const inputId = id || label?.replace(/\s+/g, '-').toLowerCase() || reactId;
    return (
      <div className="w-full">
        {label && (
          <label htmlFor={inputId} className="block text-sm font-medium text-gray-600 mb-1">
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          className={`w-full px-3 py-2 text-sm border rounded-xl bg-white shadow-sm
            placeholder:text-gray-400
            focus:outline-none focus:ring-2 focus:ring-primary-400/60 focus:border-primary-400 focus:shadow-md
            disabled:bg-gray-50 disabled:text-gray-400
            dark:bg-zinc-800 dark:border-zinc-600 dark:text-zinc-200 dark:disabled:bg-zinc-700
            transition-shadow duration-150
            ${error ? 'border-red-400 focus:ring-red-400' : 'border-gray-200/80 dark:border-zinc-600'}
            ${className}`}
          {...props}
        />
        {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
      </div>
    );
  },
);

Input.displayName = 'Input';
