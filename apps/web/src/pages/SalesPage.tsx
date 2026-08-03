import { useCallback, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Receipt } from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card } from '@/components/ui/Card';
import { SearchInput } from '@/components/ui/SearchInput';
import { Select } from '@/components/ui/Select';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Table } from '@/components/ui/Table';
import type { TableColumn } from '@/components/ui/Table';
import { Pagination } from '@/components/ui/Pagination';
import { Skeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { StatusBadge } from '@/components/ui/Badge';
import { useListQuery } from '@/hooks/useListQuery';
import { formatCurrency, formatDateTime } from '@/lib/format';
import { useAuth } from '@/features/auth/useAuth';
import { useSalesList } from '@/features/sales/api';
import type { PaymentMode, Sale } from '@/types/api';

const PAYMENT_MODES = ['CASH', 'CARD', 'UPI'] as const;

/**
 * Small local URL-param helpers for the `from`/`to`/`paymentMode` filters
 * that `useListQuery` (shared, out of scope for this page) does not manage.
 * Kept file-local rather than extending the shared hook.
 */
function useDateRangeFilter() {
  const [searchParams, setSearchParams] = useSearchParams();
  const value = { from: searchParams.get('from') ?? '', to: searchParams.get('to') ?? '' };
  const setValue = useCallback(
    (next: { from: string; to: string }) => {
      setSearchParams(
        (prev) => {
          const nextParams = new URLSearchParams(prev);
          if (next.from) nextParams.set('from', next.from);
          else nextParams.delete('from');
          if (next.to) nextParams.set('to', next.to);
          else nextParams.delete('to');
          nextParams.delete('page');
          return nextParams;
        },
        { replace: true },
      );
    },
    [setSearchParams],
  );
  return [value, setValue] as const;
}

function usePaymentModeFilter() {
  const [searchParams, setSearchParams] = useSearchParams();
  const value = searchParams.get('paymentMode') ?? '';
  const setValue = useCallback(
    (next: string) => {
      setSearchParams(
        (prev) => {
          const nextParams = new URLSearchParams(prev);
          if (next) nextParams.set('paymentMode', next);
          else nextParams.delete('paymentMode');
          nextParams.delete('page');
          return nextParams;
        },
        { replace: true },
      );
    },
    [setSearchParams],
  );
  return [value as PaymentMode | '', setValue] as const;
}

export default function SalesPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { state, params, setPage, setSearch, toggleSort } = useListQuery({ defaultSort: 'createdAt:desc' });
  const [dateRange, setDateRange] = useDateRangeFilter();
  const [paymentMode, setPaymentMode] = usePaymentModeFilter();

  const { data, isLoading, isError, refetch, isFetching } = useSalesList({
    page: params.page,
    pageSize: params.pageSize,
    search: params.search,
    sort: params.sort,
    from: dateRange.from || undefined,
    to: dateRange.to || undefined,
    paymentMode: paymentMode || undefined,
  });

  const columns = useMemo<TableColumn<Sale>[]>(
    () => [
      { key: 'invoiceNo', header: 'Invoice #', sortable: true },
      {
        key: 'createdAt',
        header: 'Date',
        sortable: true,
        render: (row) => formatDateTime(row.createdAt),
      },
      { key: 'customerName', header: 'Customer', render: (row) => row.customerName || 'Walk-in' },
      { key: 'user', header: 'Cashier', render: (row) => row.user.name },
      {
        key: 'paymentMode',
        header: 'Payment',
        render: (row) => <StatusBadge status={row.paymentMode} />,
      },
      { key: 'items', header: 'Items', align: 'right', render: (row) => row.items.length },
      {
        key: 'total',
        header: 'Total',
        align: 'right',
        sortable: true,
        className: 'tabular-nums font-medium',
        render: (row) => formatCurrency(row.total),
      },
    ],
    [],
  );

  return (
    <>
      <PageHeader title="Sales" description="Invoice history across the pharmacy." />

      <Card className="p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
          <div className="flex-1 sm:min-w-[220px]">
            <Label htmlFor="sales-search">Search</Label>
            <SearchInput
              value={state.search}
              onChange={setSearch}
              placeholder="Invoice number or customer…"
              aria-label="Search sales"
            />
          </div>
          <div className="sm:w-40">
            <Label htmlFor="sales-from">From</Label>
            <Input
              id="sales-from"
              type="date"
              value={dateRange.from}
              onChange={(event) => setDateRange({ ...dateRange, from: event.target.value })}
            />
          </div>
          <div className="sm:w-40">
            <Label htmlFor="sales-to">To</Label>
            <Input
              id="sales-to"
              type="date"
              value={dateRange.to}
              onChange={(event) => setDateRange({ ...dateRange, to: event.target.value })}
            />
          </div>
          <div className="sm:w-40">
            <Label htmlFor="sales-payment-mode">Payment mode</Label>
            <Select
              id="sales-payment-mode"
              value={paymentMode}
              onChange={(event) => setPaymentMode(event.target.value)}
            >
              <option value="">All modes</option>
              {PAYMENT_MODES.map((mode) => (
                <option key={mode} value={mode}>
                  {mode}
                </option>
              ))}
            </Select>
          </div>
        </div>
        {user?.role === 'ADMIN' && (
          <p className="mt-2 text-xs text-fg-muted">Showing sales from every cashier. Pharmacists only see their own.</p>
        )}
      </Card>

      <div className="mt-4">
        {isLoading && (
          <Card className="p-4">
            <div className="space-y-2">
              {Array.from({ length: 8 }).map((_, index) => (
                <Skeleton key={index} className="h-11 w-full" />
              ))}
            </div>
          </Card>
        )}

        {isError && !isLoading && (
          <Card>
            <ErrorState description="We could not load sales. Please try again." onRetry={() => void refetch()} />
          </Card>
        )}

        {data && (
          <>
            {data.data.length === 0 ? (
              <Card>
                <EmptyState
                  icon={<Receipt className="h-5 w-5" aria-hidden="true" />}
                  title="No sales found"
                  description="Try adjusting your search or filters, or record a new sale from the POS."
                />
              </Card>
            ) : (
              <div aria-busy={isFetching || undefined}>
                <Table
                  columns={columns}
                  data={data.data}
                  getRowKey={(row) => row.id}
                  sortField={state.sortField}
                  sortDirection={state.sortDirection}
                  onSort={toggleSort}
                  onRowClick={(row) => void navigate(`/sales/${row.id}`)}
                />
                <Pagination page={data.page} pageSize={data.pageSize} total={data.total} onPageChange={setPage} />
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
}
