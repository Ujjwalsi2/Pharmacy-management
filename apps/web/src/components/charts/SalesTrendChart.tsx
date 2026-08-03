import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { useMemo } from 'react';
import { formatCurrency, formatNumber } from '@/lib/format';
import { useChartColors } from './useChartColors';
import { ChartTooltipContent } from './ChartTooltip';

export interface SalesTrendDatum {
  period: string;
  revenue: number;
  orders: number;
  units: number;
}

export interface SalesTrendChartProps {
  data: SalesTrendDatum[];
  height?: number;
}

/** Revenue-over-time area chart used by the Reports > Sales section. */
export function SalesTrendChart({ data, height = 300 }: SalesTrendChartProps) {
  const colors = useChartColors();
  const gradientId = useMemo(() => `sales-trend-gradient-${Math.random().toString(36).slice(2)}`, []);

  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={colors.accent} stopOpacity={0.35} />
            <stop offset="100%" stopColor={colors.accent} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid vertical={false} stroke={colors.border} strokeDasharray="3 3" />
        <XAxis
          dataKey="period"
          tick={{ fill: colors.fgMuted, fontSize: 11 }}
          axisLine={{ stroke: colors.border }}
          tickLine={false}
          minTickGap={16}
        />
        <YAxis
          tick={{ fill: colors.fgMuted, fontSize: 11 }}
          axisLine={false}
          tickLine={false}
          width={56}
          tickFormatter={(value: number) => `₹${Intl.NumberFormat('en-IN', { notation: 'compact' }).format(value)}`}
        />
        <Tooltip
          content={
            <ChartTooltipContent
              rows={(payload) => {
                const point = payload?.[0]?.payload as SalesTrendDatum | undefined;
                if (!point) return [];
                return [
                  { label: 'Revenue', value: formatCurrency(point.revenue), color: colors.accent },
                  { label: 'Orders', value: formatNumber(point.orders) },
                  { label: 'Units', value: formatNumber(point.units) },
                ];
              }}
            />
          }
        />
        <Area
          type="monotone"
          dataKey="revenue"
          stroke={colors.accent}
          strokeWidth={2}
          fill={`url(#${gradientId})`}
          activeDot={{ r: 4 }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
