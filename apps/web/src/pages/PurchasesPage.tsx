import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Receipt, ReceiptText } from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { Input } from '@/components/ui/Input';
import { Pagination } from '@/components/ui/Pagination';
import { SearchInput } from '@/components/ui/SearchInput';
import { Select } from '@/components/ui/Select';
import { Skeleton } from '@/components/ui/Skeleton';
import type { TableColumn } from '@/components/ui/Table';
import { Table } from '@/components/ui/Table';
import { useAuth } from '@/features/auth/useAuth';
import { useListQuery } from '@/hooks/useListQuery';
import { formatCurrency, formatDate } from '@/lib/format';
import type { Purchase } from '@/types/api';
import { useCompaniesAll } from '@/features/companies/api';
import { useDrugs } from '@/features/drugs/api';
import { usePurchases } from '@/features/purchases/api';
import { PurchaseFormModal } from '@/features/purchases/PurchaseFormModal';

function TableSkeleton() {
  return (
    <div className="space-y-2 p-4">
      {Array.from({ length: 6 }).map((_, index) => (
        <Skeleton key={index} className="h-12 w-full" />
      ))}
    </div>
  );
}

export default function PurchasesPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';
  const navigate = useNavigate();
  const listQuery = useListQuery({ defaultSort: 'createdAt:desc' });
  const { state, params, setSearch, setPage, toggleSort } = listQuery;

  const [companyFilter, setCompanyFilter] = useState('');
  const [fromFilter, setFromFilter] = useState('');
  const [toFilter, setToFilter] = useState('');
  const [formOpen, setFormOpen] = useState(false);

  const hasFilters = Boolean(params.search) || companyFilter !== '' || fromFilter !== '' || toFilter !== '';

  const listParams = useMemo(
    () => ({
      page: params.page,
      pageSize: params.pageSize,
      search: params.search,
      sort: params.sort,
      companyId: companyFilter,
      from: fromFilter || undefined,
      to: toFilter || undefined,
    }),
    [params.page, params.pageSize, params.search, params.sort, companyFilter, fromFilter, toFilter],
  );

  const { data, isLoading, isError, refetch, isFetching } = usePurchases(listParams);
  const { data: companiesData } = useCompaniesAll();
  const { data: drugsData } = useDrugs({ page: 1, pageSize: 100, sort: 'name:asc' });

  const companies = companiesData?.data ?? [];
  const drugs = drugsData?.data ?? [];
  const rows = data?.data ?? [];

  function clearFilters() {
    setCompanyFilter('');
    setFromFilter('');
    setToFilter('');
    listQuery.setSearch('');
  }

  const columns: TableColumn<Purchase>[] = [
    {
      key: 'reference',
      header: 'Reference',
      render: (row) => <span className="font-medium text-fg">{row.reference}</span>,
    },
    {
      key: 'createdAt',
      header: 'Date',
      sortable: true,
      render: (row) => formatDate(row.createdAt),
    },
    {
      key: 'company',
      header: 'Supplier',
      render: (row) => row.company.name,
    },
    {
      key: 'items',
      header: 'Items',
      align: 'right',
      render: (row) => <span className="tabular-nums">{row.items.length}</span>,
    },
    {
      key: 'total',
      header: 'Total',
      align: 'right',
      sortable: true,
      render: (row) => <span className="tabular-nums font-medium text-fg">{formatCurrency(row.total)}</span>,
    },
    {
      key: 'user',
      header: 'Recorded by',
      render: (row) => row.user.name,
    },
  ];

  return (
    <>
      <PageHeader
        title="Purchases"
        description="Stock-in records from suppliers."
        actions={
          isAdmin && (
            <Button onClick={() => setFormOpen(true)} leftIcon={<Receipt className="h-4 w-4" aria-hidden="true" />}>
              Record purchase
            </Button>
          )
        }
      />

      <Card>
        <div className="border-b border-border p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
            <SearchInput
              value={state.search}
              onChange={setSearch}
              placeholder="Search by reference or supplier…"
              aria-label="Search purchases"
              className="sm:max-w-xs"
            />
            <Select
              value={companyFilter}
              onChange={(event) => setCompanyFilter(event.target.value)}
              aria-label="Filter by supplier"
              className="sm:w-48"
            >
              <option value="">All suppliers</option>
              {companies.map((company) => (
                <option key={company.id} value={company.id}>
                  {company.name}
                </option>
              ))}
            </Select>
            <Input
              type="date"
              value={fromFilter}
              onChange={(event) => setFromFilter(event.target.value)}
              aria-label="From date"
              className="sm:w-40"
            />
            <Input
              type="date"
              value={toFilter}
              onChange={(event) => setToFilter(event.target.value)}
              aria-label="To date"
              className="sm:w-40"
            />
            {hasFilters && (
              <Button type="button" variant="ghost" size="sm" onClick={clearFilters}>
                Clear filters
              </Button>
            )}
          </div>
        </div>

        {isLoading ? (
          <TableSkeleton />
        ) : isError ? (
          <ErrorState onRetry={() => void refetch()} description="We could not load purchases. Please try again." />
        ) : rows.length === 0 ? (
          <EmptyState
            icon={<ReceiptText className="h-6 w-6" aria-hidden="true" />}
            title={hasFilters ? 'No purchases match your filters' : 'No purchases recorded yet'}
            description={
              hasFilters
                ? 'Try adjusting your search, supplier or date range.'
                : isAdmin
                  ? 'Record your first purchase to bring stock in.'
                  : 'Purchases will appear here once an admin records stock-in orders.'
            }
            action={
              hasFilters ? (
                <Button size="sm" variant="secondary" onClick={clearFilters}>
                  Clear filters
                </Button>
              ) : (
                isAdmin && (
                  <Button size="sm" onClick={() => setFormOpen(true)} leftIcon={<Receipt className="h-4 w-4" aria-hidden="true" />}>
                    Record purchase
                  </Button>
                )
              )
            }
          />
        ) : (
          <>
            <Table
              columns={columns}
              data={rows}
              getRowKey={(row) => row.id}
              sortField={state.sortField}
              sortDirection={state.sortDirection}
              onSort={toggleSort}
              onRowClick={(row) => void navigate(`/purchases/${row.id}`)}
            />
            <div className="px-4">
              <Pagination
                page={data?.page ?? state.page}
                pageSize={data?.pageSize ?? state.pageSize}
                total={data?.total ?? 0}
                onPageChange={setPage}
              />
            </div>
          </>
        )}
        {isFetching && !isLoading && (
          <p className="px-4 pb-3 text-xs text-fg-muted" role="status">
            Refreshing…
          </p>
        )}
      </Card>

      {isAdmin && (
        <PurchaseFormModal open={formOpen} onClose={() => setFormOpen(false)} companies={companies} drugs={drugs} />
      )}
    </>
  );
}
