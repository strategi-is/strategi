import { cn } from '@/lib/utils';
import { forwardRef, InputHTMLAttributes, TextareaHTMLAttributes } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  labelClassName?: string;
  error?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, labelClassName, error, ...props }, ref) => {
    return (
      <div className="space-y-1">
        {label && (
          <label className={cn('block text-sm font-medium text-gray-700 dark:text-white/80', labelClassName)}>{label}</label>
        )}
        <input
          ref={ref}
          className={cn(
            'block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-400 shadow-sm transition-colors focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500 disabled:bg-gray-50 disabled:text-gray-500 dark:bg-white/10 dark:border-white/20 dark:text-white dark:placeholder-white/40 dark:focus:border-orange-400 dark:focus:ring-orange-400',
            error && 'border-red-500 focus:border-red-500 focus:ring-red-500',
            className,
          )}
          {...props}
        />
        {error && <p className="text-xs text-red-600 dark:text-red-400">{error}</p>}
      </div>
    );
  },
);
Input.displayName = 'Input';

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  labelClassName?: string;
  error?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, label, labelClassName, error, ...props }, ref) => {
    return (
      <div className="space-y-1">
        {label && (
          <label className={cn('block text-sm font-medium text-gray-700 dark:text-white/80', labelClassName)}>{label}</label>
        )}
        <textarea
          ref={ref}
          className={cn(
            'block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-400 shadow-sm transition-colors focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500 disabled:bg-gray-50 disabled:text-gray-500 resize-y dark:bg-white/10 dark:border-white/20 dark:text-white dark:placeholder-white/40 dark:focus:border-orange-400 dark:focus:ring-orange-400',
            error && 'border-red-500 focus:border-red-500 focus:ring-red-500',
            className,
          )}
          {...props}
        />
        {error && <p className="text-xs text-red-600 dark:text-red-400">{error}</p>}
      </div>
    );
  },
);
Textarea.displayName = 'Textarea';
