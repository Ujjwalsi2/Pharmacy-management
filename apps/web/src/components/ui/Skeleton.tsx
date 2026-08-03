import type { HTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

export type SkeletonProps = HTMLAttributes<HTMLDivElement>;

/** A pulsing placeholder block, sized via className, to prevent layout shift while loading. */
export function Skeleton({ className, ...props }: SkeletonProps) {
  return (
    <div
      aria-hidden="true"
      className={cn('animate-pulse rounded-[var(--radius-control)] bg-surface-muted', className)}
      {...props}
    />
  );
}
