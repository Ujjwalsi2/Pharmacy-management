import { useMemo } from 'react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { format, parseISO } from 'date-fns';
import { formatCurrency } from '@/lib/format';
import { useChartColors } from './useChartColors';
import { ChartTooltipContent } from './ChartTooltip';

export interface RevenuePoint {
  date: string;
  revenue: number;
  orders: number;
}

export interface RevenueAreaChartProps {
  data: RevenuePoint[];
  height?: number;
}

/** 30-day revenue trend, gradient-filled area chart using the primary token. */
export function RevenueAreaChart({ data, height = 260 }: RevenueAreaChartProps) {
  const colors = useChartColors();
  const gradientId = useMemo(() => `revenue-gradient-${Math.random().toString(36).slice(2)}`, []);

  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={colors.primary} stopOpacity={0.35} />
            <stop offset="100%" stopColor={colors.primary} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid vertical={false} stroke={colors.border} strokeDasharray="3 3" />
        <XAxis
          dataKey="date"
          tickFormatter={(value: string) => format(parseISO(value), 'd MMM')}
          tick={{ fill: colors.fgMuted, fontSize: 11 }}
          axisLine={{ stroke: colors.border }}
          tickLine={false}
          minTickGap={24}
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
              formatLabel={(value) => format(parseISO(value), 'dd MMM yyyy')}
              rows={(payload) => {
                const point = payload?.[0]?.payload as RevenuePoint | undefined;
                if (!point) return [];
                return [
                  { label: 'Revenue', value: formatCurrency(point.revenue), color: colors.primary },
                  { label: 'Orders', value: point.orders },
                ];
              }}
            />
          }
        />
        <Area
          type="monotone"
          dataKey="revenue"
          stroke={colors.primary}
          strokeWidth={2}
          fill={`url(#${gradientId})`}
          activeDot={{ r: 4 }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
