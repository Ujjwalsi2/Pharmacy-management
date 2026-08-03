import { useMemo } from 'react';
import { startOfMonth, subDays } from 'date-fns';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { cn } from '@/lib/cn';
import { isoDate } from './dateRange';
import type { DateRangeValue } from './dateRange';

export interface DateRangeControlProps {
  value: DateRangeValue;
  onChange: (value: DateRangeValue) => void;
  className?: string;
}

function buildPresets(): { label: string; range: DateRangeValue }[] {
  const today = new Date();
  const todayIso = isoDate(today);
  return [
    { label: 'Today', range: { from: todayIso, to: todayIso } },
    { label: 'Last 7 days', range: { from: isoDate(subDays(today, 6)), to: todayIso } },
    { label: 'Last 30 days', range: { from: isoDate(subDays(today, 29)), to: todayIso } },
    { label: 'This month', range: { from: isoDate(startOfMonth(today)), to: todayIso } },
    { label: 'Last 90 days', range: { from: isoDate(subDays(today, 89)), to: todayIso } },
  ];
}

/**
 * Shared date-range control with quick presets, used across the Reports
 * page sections. Kept in `features/reports` (owned by this task).
 */
export function DateRangeControl({ value, onChange, className }: DateRangeControlProps) {
  const presets = useMemo(buildPresets, []);

  return (
    <div className={cn('flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end', className)}>
      <div className="flex flex-wrap gap-1.5">
        {presets.map((preset) => {
          const active = preset.range.from === value.from && preset.range.to === value.to;
          return (
            <Button
              key={preset.label}
              type="button"
              size="sm"
              variant={active ? 'primary' : 'secondary'}
              onClick={() => onChange(preset.range)}
            >
              {preset.label}
            </Button>
          );
        })}
      </div>
      <div className="flex items-end gap-2">
        <div>
          <Label htmlFor="report-range-from">From</Label>
          <Input
            id="report-range-from"
            type="date"
            value={value.from}
            max={value.to}
            onChange={(event) => onChange({ ...value, from: event.target.value })}
          />
        </div>
        <div>
          <Label htmlFor="report-range-to">To</Label>
          <Input
            id="report-range-to"
            type="date"
            value={value.to}
            min={value.from}
            onChange={(event) => onChange({ ...value, to: event.target.value })}
          />
        </div>
      </div>
    </div>
  );
}
