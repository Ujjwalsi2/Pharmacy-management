import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { formatCurrency, formatNumber } from '@/lib/format';
import { useChartColors } from './useChartColors';
import { ChartTooltipContent } from './ChartTooltip';

export interface TopDrugBarDatum {
  name: string;
  units: number;
  revenue: number;
}

export interface TopDrugsBarChartProps {
  data: TopDrugBarDatum[];
  height?: number;
}

/** Horizontal bar chart ranking drugs by units sold, revenue shown in the tooltip. */
export function TopDrugsBarChart({ data, height = 260 }: TopDrugsBarChartProps) {
  const colors = useChartColors();

  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} layout="vertical" margin={{ top: 4, right: 16, left: 8, bottom: 4 }}>
        <CartesianGrid horizontal={false} stroke={colors.border} strokeDasharray="3 3" />
        <XAxis
          type="number"
          tick={{ fill: colors.fgMuted, fontSize: 11 }}
          axisLine={false}
          tickLine={false}
          tickFormatter={(value: number) => formatNumber(value)}
        />
        <YAxis
          type="category"
          dataKey="name"
          width={96}
          tick={{ fill: colors.fg, fontSize: 12 }}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip
          cursor={{ fill: colors.border, opacity: 0.3 }}
          content={
            <ChartTooltipContent
              rows={(payload) => {
                const point = payload?.[0]?.payload as TopDrugBarDatum | undefined;
                if (!point) return [];
                return [
                  { label: 'Units sold', value: formatNumber(point.units), color: colors.primary },
                  { label: 'Revenue', value: formatCurrency(point.revenue) },
                ];
              }}
            />
          }
        />
        <Bar dataKey="units" radius={[0, 6, 6, 0]} maxBarSize={22}>
          {data.map((entry) => (
            <Cell key={entry.name} fill={colors.primary} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
