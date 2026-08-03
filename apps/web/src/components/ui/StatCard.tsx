import type { ReactNode } from 'react';
import { ArrowDownRight, ArrowUpRight } from 'lucide-react';
import { cn } from '@/lib/cn';
import { Card } from './Card';

export interface StatCardProps {
  label: string;
  value: ReactNode;
  /** Positive shows an up-arrow in success color; negative shows a down-arrow in danger color. */
  delta?: number;
  deltaLabel?: string;
  icon?: ReactNode;
  /** e.g. a small Recharts sparkline. */
  sparkline?: ReactNode;
  className?: string;
}

export function StatCard({ label, value, delta, deltaLabel, icon, sparkline, className }: StatCardProps) {
  const hasDelta = typeof delta === 'number';
  const isPositive = hasDelta && delta >= 0;

  return (
    <Card className={cn('p-5', className)}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm text-fg-muted">{label}</p>
          <p className="tabular-nums mt-1.5 text-2xl font-semibold text-fg">{value}</p>
        </div>
        {icon && (
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary">
            {icon}
          </div>
        )}
      </div>
      {(hasDelta || sparkline) && (
        <div className="mt-3 flex items-center justify-between gap-3">
          {hasDelta ? (
            <span
              className={cn(
                'inline-flex items-center gap-1 text-xs font-medium',
                isPositive ? 'text-success' : 'text-danger',
              )}
            >
              {isPositive ? <ArrowUpRight className="h-3.5 w-3.5" /> : <ArrowDownRight className="h-3.5 w-3.5" />}
              {Math.abs(delta).toFixed(1)}%{deltaLabel ? ` ${deltaLabel}` : ''}
            </span>
          ) : (
            <span />
          )}
          {sparkline && <div className="h-8 w-24">{sparkline}</div>}
        </div>
      )}
    </Card>
  );
}
