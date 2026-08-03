import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import { formatCurrency } from '@/lib/format';
import { useChartColors } from './useChartColors';
import { ChartTooltipContent } from './ChartTooltip';

export interface InventoryDonutDatum {
  type: string;
  retailValue: number;
}

export interface InventoryDonutChartProps {
  data: InventoryDonutDatum[];
  height?: number;
}

/** Donut chart of retail inventory value by drug type. */
export function InventoryDonutChart({ data, height = 240 }: InventoryDonutChartProps) {
  const colors = useChartColors();
  const palette = [colors.primary, colors.accent, colors.info, colors.success, colors.warning, colors.danger];

  return (
    <ResponsiveContainer width="100%" height={height}>
      <PieChart>
        <Tooltip
          content={
            <ChartTooltipContent
              rows={(payload) => {
                const point = payload?.[0]?.payload as InventoryDonutDatum | undefined;
                if (!point) return [];
                return [{ label: point.type, value: formatCurrency(point.retailValue) }];
              }}
            />
          }
        />
        <Pie
          data={data}
          dataKey="retailValue"
          nameKey="type"
          innerRadius="60%"
          outerRadius="90%"
          paddingAngle={2}
          strokeWidth={0}
        >
          {data.map((entry, index) => (
            <Cell key={entry.type} fill={palette[index % palette.length]} />
          ))}
        </Pie>
      </PieChart>
    </ResponsiveContainer>
  );
}
