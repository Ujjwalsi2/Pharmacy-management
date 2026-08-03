import type { ReactNode } from 'react';
import type { TooltipProps } from 'recharts';
import type { NameType, ValueType } from 'recharts/types/component/DefaultTooltipContent';
import { useChartColors } from './useChartColors';

export interface ChartTooltipRow {
  label: string;
  value: ReactNode;
  color?: string;
}

export interface CustomTooltipContentProps extends TooltipProps<ValueType, NameType> {
  /** Formats the (usually date/period) label shown at the top of the tooltip. */
  formatLabel?: (label: string) => string;
  /** Overrides the default `payload -> rows` mapping. */
  rows?: (payload: TooltipProps<ValueType, NameType>['payload']) => ChartTooltipRow[];
}

/**
 * A themed Recharts tooltip that reads surface/border/fg tokens so it looks
 * correct in both light and dark mode (Recharts' default tooltip hardcodes
 * colors, which would break dark mode).
 */
export function ChartTooltipContent({ active, payload, label, formatLabel, rows }: CustomTooltipContentProps) {
  const colors = useChartColors();
  if (!active || !payload || payload.length === 0) return null;

  const items: ChartTooltipRow[] = rows
    ? rows(payload)
    : payload.map((entry) => ({
        label: String(entry.name ?? ''),
        value: typeof entry.value === 'number' ? entry.value.toLocaleString('en-IN') : String(entry.value ?? ''),
        color: typeof entry.color === 'string' ? entry.color : undefined,
      }));

  return (
    <div
      className="rounded-[var(--radius-control)] border px-3 py-2 text-xs shadow-[var(--shadow-card)]"
      style={{ backgroundColor: colors.surface, borderColor: colors.border, color: colors.fg }}
    >
      {label !== undefined && (
        <p className="mb-1 font-semibold" style={{ color: colors.fg }}>
          {formatLabel ? formatLabel(String(label)) : String(label)}
        </p>
      )}
      <div className="space-y-0.5">
        {items.map((item, index) => (
          <div key={`${item.label}-${index}`} className="flex items-center gap-2">
            {item.color && (
              <span
                aria-hidden="true"
                className="inline-block h-2 w-2 rounded-full"
                style={{ backgroundColor: item.color }}
              />
            )}
            <span style={{ color: colors.fgMuted }}>{item.label}:</span>
            <span className="tabular-nums font-medium" style={{ color: colors.fg }}>
              {item.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
