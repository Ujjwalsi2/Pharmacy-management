import { format, subDays } from 'date-fns';

export interface DateRangeValue {
  from: string;
  to: string;
}

export function isoDate(date: Date): string {
  return format(date, 'yyyy-MM-dd');
}

export function defaultDateRange(): DateRangeValue {
  const today = new Date();
  return { from: isoDate(subDays(today, 29)), to: isoDate(today) };
}
