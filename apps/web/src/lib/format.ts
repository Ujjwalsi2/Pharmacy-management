import {
  format,
  formatDistanceToNow,
  isValid,
  parseISO,
} from 'date-fns';

function toDate(value: string | Date): Date {
  return value instanceof Date ? value : parseISO(value);
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

export function formatNumber(value: number): string {
  return new Intl.NumberFormat('en-IN').format(value);
}

export function formatDate(value: string | Date): string {
  const date = toDate(value);
  if (!isValid(date)) return '—';
  return format(date, 'dd MMM yyyy');
}

export function formatDateTime(value: string | Date): string {
  const date = toDate(value);
  if (!isValid(date)) return '—';
  return format(date, 'dd MMM yyyy, h:mm a');
}

export function formatRelative(value: string | Date): string {
  const date = toDate(value);
  if (!isValid(date)) return '—';
  return formatDistanceToNow(date, { addSuffix: true });
}
