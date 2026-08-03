import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Pill, Printer } from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { ErrorState } from '@/components/ui/ErrorState';
import { StatusBadge } from '@/components/ui/Badge';
import { formatCurrency, formatDateTime } from '@/lib/format';
import { ApiError } from '@/lib/api';
import { useSale } from '@/features/sales/api';

/**
 * Scoped print stylesheet: hides everything except `#invoice-printable` when
 * printing. Defined locally (a `<style>` tag inside this component) because
 * the global stylesheet is out of scope for this page.
 */
const PRINT_STYLE = `
  @media print {
    body * { visibility: hidden; }
    #invoice-printable, #invoice-printable * { visibility: visible; }
    #invoice-printable {
      position: absolute;
      inset: 0;
      margin: 0;
      padding: 24px;
      box-shadow: none;
      border: none;
    }
    .no-print { display: none !important; }
  }
`;

export default function SaleDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: sale, isLoading, isError, error, refetch } = useSale(id);

  const notFound = error instanceof ApiError && error.code === 'NOT_FOUND';

  return (
    <>
      <style>{PRINT_STYLE}</style>
      <div className="no-print">
        <PageHeader
          title="Sale detail"
          description={sale ? `Invoice ${sale.invoiceNo}` : undefined}
          actions={
            <>
              <Link
                to="/sales"
                className="inline-flex h-10 items-center gap-2 rounded-[var(--radius-control)] border border-border bg-surface px-4 text-sm font-medium text-fg transition-colors duration-150 ease-out hover:bg-surface-muted"
              >
                <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                Back to sales
              </Link>
              {sale && (
                <Button leftIcon={<Printer className="h-4 w-4" aria-hidden="true" />} onClick={() => window.print()}>
                  Print invoice
                </Button>
              )}
            </>
          }
        />
      </div>

      {isLoading && (
        <Card>
          <CardContent className="space-y-4">
            <Skeleton className="h-6 w-40" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-48 w-full" />
          </CardContent>
        </Card>
      )}

      {isError && !isLoading && (
        <Card>
          <ErrorState
            title={notFound ? 'Sale not found' : 'Something went wrong'}
            description={
              notFound
                ? 'This invoice does not exist or may have been removed.'
                : 'We could not load this sale. Please try again.'
            }
            onRetry={notFound ? undefined : () => void refetch()}
          />
        </Card>
      )}

      {sale && (
        <Card id="invoice-printable" className="mx-auto max-w-3xl p-8">
          <header className="flex flex-wrap items-start justify-between gap-6 border-b border-border pb-6">
            <div className="flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-full bg-primary/10 text-primary">
                <Pill className="h-6 w-6" aria-hidden="true" />
              </span>
              <div>
                <p className="text-lg font-semibold text-fg">MediTrack Pharmacy</p>
                <p className="text-xs text-fg-muted">Modern pharmacy management platform</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm font-semibold uppercase tracking-wide text-fg-muted">Invoice</p>
              <p className="text-xl font-semibold text-fg">{sale.invoiceNo}</p>
              <p className="mt-1 text-xs text-fg-muted">{formatDateTime(sale.createdAt)}</p>
            </div>
          </header>

          <div className="grid grid-cols-1 gap-6 py-6 sm:grid-cols-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-fg-muted">Billed to</p>
              <p className="mt-1 text-sm font-medium text-fg">{sale.customerName || 'Walk-in'}</p>
              {sale.customerPhone && <p className="text-sm text-fg-muted">{sale.customerPhone}</p>}
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-fg-muted">Cashier</p>
              <p className="mt-1 text-sm font-medium text-fg">{sale.user.name}</p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-fg-muted">Payment mode</p>
              <div className="mt-1.5">
                <StatusBadge status={sale.paymentMode} />
              </div>
            </div>
          </div>

          <div className="overflow-x-auto rounded-[var(--radius-card)] border border-border">
            <table className="w-full min-w-full border-collapse text-sm">
              <thead className="bg-surface-muted">
                <tr>
                  <th scope="col" className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-fg-muted">
                    Item
                  </th>
                  <th scope="col" className="px-4 py-2.5 text-right text-xs font-semibold uppercase tracking-wide text-fg-muted">
                    Qty
                  </th>
                  <th scope="col" className="px-4 py-2.5 text-right text-xs font-semibold uppercase tracking-wide text-fg-muted">
                    Unit price
                  </th>
                  <th scope="col" className="px-4 py-2.5 text-right text-xs font-semibold uppercase tracking-wide text-fg-muted">
                    Amount
                  </th>
                </tr>
              </thead>
              <tbody>
                {sale.items.map((item) => (
                  <tr key={item.id} className="border-t border-border">
                    <td className="px-4 py-2.5">
                      <p className="font-medium text-fg">{item.name}</p>
                      <p className="text-xs text-fg-muted">{item.dose}</p>
                    </td>
                    <td className="tabular-nums px-4 py-2.5 text-right text-fg">{item.quantity}</td>
                    <td className="tabular-nums px-4 py-2.5 text-right text-fg">{formatCurrency(item.unitPrice)}</td>
                    <td className="tabular-nums px-4 py-2.5 text-right font-medium text-fg">
                      {formatCurrency(item.amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-6 flex justify-end">
            <div className="w-full max-w-xs space-y-1.5 text-sm">
              <div className="flex justify-between text-fg-muted">
                <span>Subtotal</span>
                <span className="tabular-nums">{formatCurrency(sale.subtotal)}</span>
              </div>
              <div className="flex justify-between text-fg-muted">
                <span>Discount</span>
                <span className="tabular-nums">-{formatCurrency(sale.discount)}</span>
              </div>
              <div className="flex justify-between text-fg-muted">
                <span>Tax ({sale.taxRate}%)</span>
                <span className="tabular-nums">{formatCurrency(sale.tax)}</span>
              </div>
              <div className="mt-2 flex justify-between border-t border-border pt-2 text-base font-semibold text-fg">
                <span>Total</span>
                <span className="tabular-nums">{formatCurrency(sale.total)}</span>
              </div>
            </div>
          </div>

          <p className="mt-8 text-center text-xs text-fg-muted">Thank you for choosing MediTrack Pharmacy.</p>
        </Card>
      )}
    </>
  );
}
