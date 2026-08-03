import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Barcode as BarcodeIcon, ReceiptText } from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { ErrorState } from '@/components/ui/ErrorState';
import { Skeleton } from '@/components/ui/Skeleton';
import type { TableColumn } from '@/components/ui/Table';
import { Table } from '@/components/ui/Table';
import { ApiError } from '@/lib/api';
import { formatCurrency, formatDateTime } from '@/lib/format';
import type { PurchaseItem } from '@/types/api';
import { usePurchase } from '@/features/purchases/api';

function DetailSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-24 w-full" />
      <Skeleton className="h-64 w-full" />
    </div>
  );
}

export default function PurchaseDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: purchase, isLoading, isError, error, refetch } = usePurchase(id);

  const is404 = isError && error instanceof ApiError && error.code === 'NOT_FOUND';

  const columns: TableColumn<PurchaseItem>[] = [
    {
      key: 'drug',
      header: 'Drug',
      render: (row) => (
        <div>
          <Link to={`/inventory/${row.drugId}`} className="font-medium text-fg hover:text-primary hover:underline">
            {row.drug.name}
          </Link>
          <p className="flex items-center gap-1 text-xs text-fg-muted">
            <BarcodeIcon className="h-3 w-3" aria-hidden="true" />
            <span className="font-mono">{row.drug.barcode}</span>
          </p>
        </div>
      ),
    },
    {
      key: 'quantity',
      header: 'Quantity',
      align: 'right',
      render: (row) => <span className="tabular-nums">{row.quantity}</span>,
    },
    {
      key: 'unitCost',
      header: 'Unit cost',
      align: 'right',
      render: (row) => <span className="tabular-nums">{formatCurrency(row.unitCost)}</span>,
    },
    {
      key: 'amount',
      header: 'Amount',
      align: 'right',
      render: (row) => <span className="tabular-nums font-medium text-fg">{formatCurrency(row.amount)}</span>,
    },
  ];

  return (
    <>
      <PageHeader
        title={purchase ? purchase.reference : 'Purchase detail'}
        description={purchase ? `Recorded ${formatDateTime(purchase.createdAt)}` : undefined}
        actions={
          <Button
            type="button"
            variant="secondary"
            size="sm"
            leftIcon={<ArrowLeft className="h-4 w-4" aria-hidden="true" />}
            onClick={() => void navigate('/purchases')}
          >
            Back to purchases
          </Button>
        }
      />

      {isLoading ? (
        <DetailSkeleton />
      ) : isError || !purchase ? (
        <ErrorState
          title={is404 ? 'Purchase not found' : 'Something went wrong'}
          description={
            is404
              ? "This purchase order doesn't exist or may have been removed."
              : 'We could not load this purchase. Please try again.'
          }
          onRetry={is404 ? undefined : () => void refetch()}
        />
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardContent className="p-4">
                <p className="text-xs font-medium uppercase tracking-wide text-fg-muted">Supplier</p>
                <Link
                  to={`/companies`}
                  className="mt-1 block text-base font-semibold text-fg hover:text-primary hover:underline"
                >
                  {purchase.company.name}
                </Link>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-xs font-medium uppercase tracking-wide text-fg-muted">Recorded by</p>
                <p className="mt-1 text-base font-semibold text-fg">{purchase.user.name}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-xs font-medium uppercase tracking-wide text-fg-muted">Date</p>
                <p className="mt-1 text-base font-semibold text-fg">{formatDateTime(purchase.createdAt)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-xs font-medium uppercase tracking-wide text-fg-muted">Total</p>
                <p className="tabular-nums mt-1 text-base font-semibold text-fg">{formatCurrency(purchase.total)}</p>
              </CardContent>
            </Card>
          </div>

          {purchase.notes && (
            <Card>
              <CardHeader>
                <CardTitle>Notes</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-fg-muted">{purchase.notes}</p>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ReceiptText className="h-4 w-4 text-fg-muted" aria-hidden="true" />
                Line items
              </CardTitle>
            </CardHeader>
            <Table columns={columns} data={purchase.items} getRowKey={(row) => row.id} />
            <div className="flex justify-end border-t border-border px-5 py-4">
              <div className="w-full max-w-xs space-y-1 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-fg-muted">Total</span>
                  <span className="tabular-nums text-base font-semibold text-fg">{formatCurrency(purchase.total)}</span>
                </div>
              </div>
            </div>
          </Card>
        </div>
      )}
    </>
  );
}
