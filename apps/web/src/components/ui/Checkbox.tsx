import { forwardRef } from 'react';
import type { InputHTMLAttributes } from 'react';
import { Check } from 'lucide-react';
import { cn } from '@/lib/cn';

export type CheckboxProps = InputHTMLAttributes<HTMLInputElement>;

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(function Checkbox(
  { className, ...props },
  ref,
) {
  return (
    <span className="relative inline-flex h-5 w-5 shrink-0 items-center justify-center">
      <input
        ref={ref}
        type="checkbox"
        className={cn(
          'peer h-5 w-5 shrink-0 cursor-pointer appearance-none rounded-[6px] border border-border bg-surface transition-colors duration-150 ease-out checked:border-primary checked:bg-primary disabled:cursor-not-allowed disabled:opacity-50',
          className,
        )}
        {...props}
      />
      <Check
        aria-hidden="true"
        className="pointer-events-none absolute h-3.5 w-3.5 scale-0 text-primary-fg transition-transform duration-150 ease-out peer-checked:scale-100"
      />
    </span>
  );
});
