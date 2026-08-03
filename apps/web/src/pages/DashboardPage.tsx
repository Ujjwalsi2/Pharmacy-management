import { Link } from 'react-router-dom';
import { cn } from '@/lib/cn';
import {
  AlertTriangle,
  Banknote,
  Building2,
  CalendarClock,
  IndianRupee,
  PackageX,
  Pill,
  Plus,
  Receipt,
  ShoppingCart,
  Users,
  Warehouse,
} from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { StatCard } from '@/components/ui/StatCard';
import { Skeleton } from '@/components/ui/Skeleton';
import { ErrorState } from '@/components/ui/ErrorState';
import { EmptyState } from '@/components/ui/EmptyState';
import { formatCurrency, formatDateTime, formatNumber } from '@/lib/format';
import { RevenueAreaChart, TopDrugsBarChart } from '@/components/charts';
import { useDashboardSummary } from '@/features/dashboard/api';

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <Card key={index} className="p-5">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="mt-3 h-7 w-32" />
          </Card>
        ))}
      </div>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <Skeleton className="h-5 w-40" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-64 w-full" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <Skeleton className="h-5 w-32" />
          </CardHeader>
          <CardContent className="space-y-3">
            {Array.from({ length: 3 }).map((_, index) => (
              <Skeleton key={index} className="h-16 w-full" />
            ))}
          </CardContent>
        </Card>
      </div>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <Skeleton className="h-5 w-36" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-56 w-full" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <Skeleton className="h-5 w-36" />
          </CardHeader>
          <CardContent className="space-y-2">
            {Array.from({ length: 5 }).map((_, index) => (
              <Skeleton key={index} className="h-10 w-full" />
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

const LINK_BUTTON_BASE =
  'inline-flex h-10 items-center justify-center gap-2 rounded-[var(--radius-control)] px-4 text-sm font-medium transition-[background-color,opacity] duration-150 ease-out';

export default function DashboardPage() {
  const { data, isLoading, isError, refetch, isFetching } = useDashboardSummary();

  return (
    <>
      <PageHeader
        title="Dashboard"
        description="A live overview of today's sales, inventory health and top performers."
        actions={
          <>
            <Link
              to="/purchases"
              className={cn(LINK_BUTTON_BASE, 'border border-border bg-surface text-fg hover:bg-surface-muted')}
            >
              <Receipt className="h-4 w-4" aria-hidden="true" />
              Record purchase
            </Link>
            <Link to="/pos" className={cn(LINK_BUTTON_BASE, 'bg-primary text-primary-fg hover:opacity-90')}>
              <Plus className="h-4 w-4" aria-hidden="true" />
              New sale
            </Link>
          </>
        }
      />

      {isLoading && <DashboardSkeleton />}

      {isError && !isLoading && (
        <Card>
          <ErrorState
            description="We could not load the dashboard summary. Please try again."
            onRetry={() => void refetch()}
          />
        </Card>
      )}

      {data && (
        <div className="space-y-6" aria-busy={isFetching || undefined}>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              label="Revenue today"
              value={<span className="tabular-nums">{formatCurrency(data.revenueToday)}</span>}
              icon={<IndianRupee className="h-4.5 w-4.5" aria-hidden="true" />}
            />
            <StatCard
              label="Revenue this month"
              value={<span className="tabular-nums">{formatCurrency(data.revenueMonth)}</span>}
              icon={<Banknote className="h-4.5 w-4.5" aria-hidden="true" />}
            />
            <StatCard
              label="Orders today"
              value={<span className="tabular-nums">{formatNumber(data.ordersToday)}</span>}
              icon={<ShoppingCart className="h-4.5 w-4.5" aria-hidden="true" />}
            />
            <StatCard
              label="Orders this month"
              value={<span className="tabular-nums">{formatNumber(data.ordersMonth)}</span>}
              icon={<Receipt className="h-4.5 w-4.5" aria-hidden="true" />}
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <StatCard
              label="Inventory value"
              value={<span className="tabular-nums">{formatCurrency(data.inventoryValue)}</span>}
              icon={<Warehouse className="h-4.5 w-4.5" aria-hidden="true" />}
            />
            <StatCard
              label="Drugs / Companies"
              value={
                <span className="tabular-nums">
                  {formatNumber(data.drugCount)} / {formatNumber(data.companyCount)}
                </span>
              }
              icon={<Pill className="h-4.5 w-4.5" aria-hidden="true" />}
            />
            <StatCard
              label="Team members"
              value={<span className="tabular-nums">{formatNumber(data.userCount)}</span>}
              icon={<Users className="h-4.5 w-4.5" aria-hidden="true" />}
            />
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Revenue — last 30 days</CardTitle>
              </CardHeader>
              <CardContent>
                <RevenueAreaChart data={data.revenueTrend} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Alerts</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Link
                  to="/inventory?status=LOW_STOCK"
                  className="flex items-center justify-between gap-3 rounded-[var(--radius-control)] border border-border bg-warning/5 px-4 py-3 transition-colors duration-150 ease-out hover:bg-warning/10"
                >
                  <span className="flex items-center gap-2 text-sm font-medium text-fg">
                    <PackageX className="h-4 w-4 text-warning" aria-hidden="true" />
                    Low stock
                  </span>
                  <span className="tabular-nums text-lg font-semibold text-warning">{data.alerts.lowStock}</span>
                </Link>
                <Link
                  to="/inventory?status=EXPIRING_SOON"
                  className="flex items-center justify-between gap-3 rounded-[var(--radius-control)] border border-border bg-warning/5 px-4 py-3 transition-colors duration-150 ease-out hover:bg-warning/10"
                >
                  <span className="flex items-center gap-2 text-sm font-medium text-fg">
                    <CalendarClock className="h-4 w-4 text-warning" aria-hidden="true" />
                    Expiring soon
                  </span>
                  <span className="tabular-nums text-lg font-semibold text-warning">{data.alerts.expiringSoon}</span>
                </Link>
                <Link
                  to="/inventory?status=EXPIRED"
                  className="flex items-center justify-between gap-3 rounded-[var(--radius-control)] border border-border bg-danger/5 px-4 py-3 transition-colors duration-150 ease-out hover:bg-danger/10"
                >
                  <span className="flex items-center gap-2 text-sm font-medium text-fg">
                    <AlertTriangle className="h-4 w-4 text-danger" aria-hidden="true" />
                    Expired
                  </span>
                  <span className="tabular-nums text-lg font-semibold text-danger">{data.alerts.expired}</span>
                </Link>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Top-selling drugs</CardTitle>
              </CardHeader>
              <CardContent>
                {data.topDrugs.length === 0 ? (
                  <EmptyState
                    icon={<Pill className="h-5 w-5" aria-hidden="true" />}
                    title="No sales yet"
                    description="Top sellers will appear once invoices are recorded."
                  />
                ) : (
                  <TopDrugsBarChart
                    data={data.topDrugs.map((drug) => ({ name: drug.name, units: drug.units, revenue: drug.revenue }))}
                  />
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Recent sales</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {data.recentSales.length === 0 ? (
                  <EmptyState
                    icon={<Receipt className="h-5 w-5" aria-hidden="true" />}
                    title="No recent sales"
                    description="New invoices from the POS will show up here."
                    className="py-10"
                  />
                ) : (
                  <ul className="divide-y divide-border">
                    {data.recentSales.map((sale) => (
                      <li key={sale.id}>
                        <Link
                          to={`/sales/${sale.id}`}
                          className="flex items-center justify-between gap-3 px-5 py-3 transition-colors duration-150 ease-out hover:bg-surface-muted/60"
                        >
                          <span className="min-w-0">
                            <span className="block truncate text-sm font-medium text-fg">{sale.invoiceNo}</span>
                            <span className="block truncate text-xs text-fg-muted">{sale.customerName}</span>
                          </span>
                          <span className="flex flex-col items-end gap-0.5">
                            <span className="tabular-nums text-sm font-semibold text-fg">
                              {formatCurrency(sale.total)}
                            </span>
                            <span className="text-xs text-fg-muted">{formatDateTime(sale.createdAt)}</span>
                          </span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          </div>

          <Card className="flex flex-col items-start gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
                <Building2 className="h-5 w-5" aria-hidden="true" />
              </span>
              <div>
                <p className="text-sm font-semibold text-fg">Quick actions</p>
                <p className="text-xs text-fg-muted">Jump straight into the operational screens you use most.</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link
                to="/pos"
                className="inline-flex h-10 items-center justify-center gap-2 rounded-[var(--radius-control)] bg-primary px-4 text-sm font-medium text-primary-fg transition-opacity duration-150 ease-out hover:opacity-90"
              >
                <Plus className="h-4 w-4" aria-hidden="true" />
                New sale
              </Link>
              <Link
                to="/purchases"
                className="inline-flex h-10 items-center justify-center gap-2 rounded-[var(--radius-control)] border border-border bg-surface px-4 text-sm font-medium text-fg transition-colors duration-150 ease-out hover:bg-surface-muted"
              >
                <Receipt className="h-4 w-4" aria-hidden="true" />
                Record purchase
              </Link>
            </div>
          </Card>
        </div>
      )}
    </>
  );
}
