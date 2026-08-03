import { useState } from 'react';
import { BarChart3, Package, TrendingUp } from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { StatCard } from '@/components/ui/StatCard';
import { Select } from '@/components/ui/Select';
import { Label } from '@/components/ui/Label';
import { Table } from '@/components/ui/Table';
import type { TableColumn } from '@/components/ui/Table';
import { Skeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/Tabs';
import { formatCurrency, formatNumber } from '@/lib/format';
import { SalesTrendChart, TopDrugsBarChart, InventoryDonutChart } from '@/components/charts';
import { DateRangeControl } from '@/features/reports/DateRangeControl';
import { defaultDateRange } from '@/features/reports/dateRange';
import { useInventoryValueReport, useSalesReport, useTopDrugsReport } from '@/features/reports/api';
import type { GroupBy } from '@/features/reports/api';
import type { InventoryValueByType, SalesReportPoint, TopDrugSummary } from '@/types/api';

function SalesOverTimeSection() {
  const [range, setRange] = useState(defaultDateRange);
  const [groupBy, setGroupBy] = useState<GroupBy>('day');
  const { data, isLoading, isError, refetch } = useSalesReport(range, groupBy);

  const columns: TableColumn<SalesReportPoint>[] = [
    { key: 'period', header: 'Period' },
    { key: 'orders', header: 'Orders', align: 'right', className: 'tabular-nums' },
    { key: 'units', header: 'Units', align: 'right', className: 'tabular-nums' },
    {
      key: 'revenue',
      header: 'Revenue',
      align: 'right',
      className: 'tabular-nums font-medium',
      render: (row) => formatCurrency(row.revenue),
    },
  ];

  return (
    <div className="space-y-4">
      <Card className="p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <DateRangeControl value={range} onChange={setRange} />
          <div className="sm:w-40">
            <Label htmlFor="sales-groupby">Group by</Label>
            <Select id="sales-groupby" value={groupBy} onChange={(event) => setGroupBy(event.target.value as GroupBy)}>
              <option value="day">Day</option>
              <option value="month">Month</option>
            </Select>
          </div>
        </div>
      </Card>

      {isLoading && (
        <Card>
          <CardContent>
            <Skeleton className="h-72 w-full" />
          </CardContent>
        </Card>
      )}

      {isError && !isLoading && (
        <Card>
          <ErrorState description="We could not load the sales report." onRetry={() => void refetch()} />
        </Card>
      )}

      {data && (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <StatCard label="Total revenue" value={formatCurrency(data.totals.revenue)} />
            <StatCard label="Total orders" value={formatNumber(data.totals.orders)} />
            <StatCard label="Units sold" value={formatNumber(data.totals.units)} />
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Revenue over time</CardTitle>
            </CardHeader>
            <CardContent>
              {data.data.length === 0 ? (
                <EmptyState
                  icon={<TrendingUp className="h-5 w-5" aria-hidden="true" />}
                  title="No sales in this range"
                  description="Try widening the date range."
                />
              ) : (
                <SalesTrendChart data={data.data} />
              )}
            </CardContent>
          </Card>

          {data.data.length > 0 && (
            <Card>
              <CardContent className="p-0">
                <Table columns={columns} data={data.data} getRowKey={(row) => row.period} />
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}

function TopDrugsSection() {
  const [range, setRange] = useState(defaultDateRange);
  const [limit, setLimit] = useState(5);
  const { data, isLoading, isError, refetch } = useTopDrugsReport(range, limit);

  const columns: TableColumn<TopDrugSummary>[] = [
    { key: 'name', header: 'Drug' },
    { key: 'units', header: 'Units sold', align: 'right', className: 'tabular-nums' },
    {
      key: 'revenue',
      header: 'Revenue',
      align: 'right',
      className: 'tabular-nums font-medium',
      render: (row) => formatCurrency(row.revenue),
    },
  ];

  return (
    <div className="space-y-4">
      <Card className="p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <DateRangeControl value={range} onChange={setRange} />
          <div className="sm:w-40">
            <Label htmlFor="top-drugs-limit">Show top</Label>
            <Select id="top-drugs-limit" value={limit} onChange={(event) => setLimit(Number(event.target.value))}>
              {[5, 10, 15, 20].map((n) => (
                <option key={n} value={n}>
                  {n} drugs
                </option>
              ))}
            </Select>
          </div>
        </div>
      </Card>

      {isLoading && (
        <Card>
          <CardContent>
            <Skeleton className="h-64 w-full" />
          </CardContent>
        </Card>
      )}

      {isError && !isLoading && (
        <Card>
          <ErrorState description="We could not load the top-drugs report." onRetry={() => void refetch()} />
        </Card>
      )}

      {data && (
        <>
          {data.data.length === 0 ? (
            <Card>
              <EmptyState
                icon={<BarChart3 className="h-5 w-5" aria-hidden="true" />}
                title="No sales in this range"
                description="Try widening the date range."
              />
            </Card>
          ) : (
            <>
              <Card>
                <CardHeader>
                  <CardTitle>Top drugs by units sold</CardTitle>
                </CardHeader>
                <CardContent>
                  <TopDrugsBarChart data={data.data.map((d) => ({ name: d.name, units: d.units, revenue: d.revenue }))} />
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-0">
                  <Table columns={columns} data={data.data} getRowKey={(row) => row.drugId} />
                </CardContent>
              </Card>
            </>
          )}
        </>
      )}
    </div>
  );
}

function InventoryValueSection() {
  const { data, isLoading, isError, refetch } = useInventoryValueReport();

  const columns: TableColumn<InventoryValueByType>[] = [
    { key: 'type', header: 'Type' },
    { key: 'units', header: 'Units', align: 'right', className: 'tabular-nums' },
    {
      key: 'costValue',
      header: 'Cost value',
      align: 'right',
      className: 'tabular-nums',
      render: (row) => formatCurrency(row.costValue),
    },
    {
      key: 'retailValue',
      header: 'Retail value',
      align: 'right',
      className: 'tabular-nums font-medium',
      render: (row) => formatCurrency(row.retailValue),
    },
  ];

  if (isLoading) {
    return (
      <Card>
        <CardContent>
          <Skeleton className="h-64 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (isError || !data) {
    return (
      <Card>
        <ErrorState description="We could not load the inventory value report." onRetry={() => void refetch()} />
      </Card>
    );
  }

  const byTypeWithStock = data.byType.filter((row) => row.units > 0);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Cost value" value={formatCurrency(data.costValue)} />
        <StatCard label="Retail value" value={formatCurrency(data.retailValue)} />
        <StatCard label="Potential profit" value={formatCurrency(data.potentialProfit)} />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Retail value by type</CardTitle>
          </CardHeader>
          <CardContent>
            {byTypeWithStock.length === 0 ? (
              <EmptyState
                icon={<Package className="h-5 w-5" aria-hidden="true" />}
                title="No inventory value"
                description="Add drugs and stock to see a breakdown here."
              />
            ) : (
              <InventoryDonutChart
                data={byTypeWithStock.map((row) => ({ type: row.type, retailValue: row.retailValue }))}
              />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-0">
            <Table columns={columns} data={data.byType} getRowKey={(row) => row.type} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function ReportsPage() {
  return (
    <>
      <PageHeader title="Reports" description="Sales trends, top performers and inventory value." />
      <Tabs defaultValue="sales">
        <TabsList>
          <TabsTrigger value="sales">Sales over time</TabsTrigger>
          <TabsTrigger value="top-drugs">Top drugs</TabsTrigger>
          <TabsTrigger value="inventory">Inventory value</TabsTrigger>
        </TabsList>
        <TabsContent value="sales">
          <SalesOverTimeSection />
        </TabsContent>
        <TabsContent value="top-drugs">
          <TopDrugsSection />
        </TabsContent>
        <TabsContent value="inventory">
          <InventoryValueSection />
        </TabsContent>
      </Tabs>
    </>
  );
}
