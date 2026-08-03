import type { HTMLAttributes } from 'react';
import { cn } from '@/lib/cn';
import type { DrugStatus, PaymentMode } from '@/types/api';

export type BadgeVariant = 'neutral' | 'success' | 'warning' | 'danger' | 'info';

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
}

const VARIANT_CLASSES: Record<BadgeVariant, string> = {
  neutral: 'bg-surface-muted text-fg-muted',
  success: 'bg-success/10 text-success',
  warning: 'bg-warning/10 text-warning',
  danger: 'bg-danger/10 text-danger',
  info: 'bg-info/10 text-info',
};

export function Badge({ variant = 'neutral', className, ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-[var(--radius-pill)] px-2.5 py-1 text-xs font-medium',
        VARIANT_CLASSES[variant],
        className,
      )}
      {...props}
    />
  );
}

const DRUG_STATUS_CONFIG: Record<DrugStatus, { label: string; variant: BadgeVariant }> = {
  IN_STOCK: { label: 'In stock', variant: 'success' },
  LOW_STOCK: { label: 'Low stock', variant: 'warning' },
  EXPIRING_SOON: { label: 'Expiring soon', variant: 'warning' },
  OUT_OF_STOCK: { label: 'Out of stock', variant: 'danger' },
  EXPIRED: { label: 'Expired', variant: 'danger' },
};

const PAYMENT_MODE_CONFIG: Record<PaymentMode, { label: string; variant: BadgeVariant }> = {
  CASH: { label: 'Cash', variant: 'neutral' },
  CARD: { label: 'Card', variant: 'info' },
  UPI: { label: 'UPI', variant: 'success' },
};

export interface StatusBadgeProps extends Omit<HTMLAttributes<HTMLSpanElement>, 'children'> {
  status: DrugStatus | PaymentMode;
}

function isDrugStatus(status: DrugStatus | PaymentMode): status is DrugStatus {
  return status in DRUG_STATUS_CONFIG;
}

/** Maps a drug status or payment mode enum value to a labeled, colored `Badge`. */
export function StatusBadge({ status, className, ...props }: StatusBadgeProps) {
  const config = isDrugStatus(status) ? DRUG_STATUS_CONFIG[status] : PAYMENT_MODE_CONFIG[status];
  return (
    <Badge variant={config.variant} className={className} {...props}>
      {config.label}
    </Badge>
  );
}
