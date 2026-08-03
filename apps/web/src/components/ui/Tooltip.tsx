import { useId, useState } from 'react';
import type { ReactElement, ReactNode } from 'react';
import { cloneElement, isValidElement } from 'react';
import { cn } from '@/lib/cn';

export interface TooltipProps {
  content: ReactNode;
  children: ReactElement<{
    'aria-describedby'?: string;
    onFocus?: (...args: unknown[]) => void;
    onBlur?: (...args: unknown[]) => void;
    onMouseEnter?: (...args: unknown[]) => void;
    onMouseLeave?: (...args: unknown[]) => void;
  }>;
  side?: 'top' | 'bottom';
}

export function Tooltip({ content, children, side = 'top' }: TooltipProps) {
  const [open, setOpen] = useState(false);
  const id = useId();

  if (!isValidElement(children)) return children;

  const trigger = cloneElement(children, {
    'aria-describedby': id,
    onFocus: () => setOpen(true),
    onBlur: () => setOpen(false),
    onMouseEnter: () => setOpen(true),
    onMouseLeave: () => setOpen(false),
  });

  return (
    <span className="relative inline-flex">
      {trigger}
      <span
        role="tooltip"
        id={id}
        className={cn(
          'pointer-events-none absolute left-1/2 z-50 -translate-x-1/2 whitespace-nowrap rounded-[6px] bg-fg px-2 py-1 text-xs font-medium text-bg opacity-0 transition-opacity duration-150 ease-out',
          side === 'top' ? 'bottom-full mb-2' : 'top-full mt-2',
          open && 'opacity-100',
        )}
      >
        {content}
      </span>
    </span>
  );
}
