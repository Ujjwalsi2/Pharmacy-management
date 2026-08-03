import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  Barcode as BarcodeIcon,
  Building2,
  CalendarClock,
  Pencil,
  Receipt,
  ShoppingCart,
  Trash2,
  Warehouse,
} from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { Badge, StatusBadge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { ErrorState } from '@/components/ui/ErrorState';
import { Skeleton } from '@/components/ui/Skeleton';
import { useToast } from '@/components/ui/useToast';
import { useAuth } from '@/features/auth/useAuth';
import { ApiError } from '@/lib/api';
import { formatCurrency, formatDate, formatDateTime } from '@/lib/format';
import type { DrugType } from '@/types/api';
import { useCompaniesAll } from '@/features/companies/api';
import { useDeleteDrug, useDrug, useDrugs } from '@/features/drugs/api';
import { usePurchases } from '@/features/purchases/api';
import { PurchaseFormModal } from '@/features/purchases/PurchaseFormModal';
import { useSalesList } from '@/features/sales/api';

function daysUntil(dateStr: string): number {
  const target = new Date(dateStr);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  target.setHours(0, 0, 0, 0);
  return Math.round((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

function expiryToneClass(days: number): string {
  if (days < 0) return 'text-danger';
  if (days <= 90) return 'text-warning';
  return 'text-fg';
}

function typeLabel(type: DrugType): string {
  return type.charAt(0) + type.slice(1).toLowerCase();
}

function DetailSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-24 w-full" />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Skeleton className="h-28 w-full" />
        <Skeleton className="h-28 w-full" />
        <Skeleton className="h-28 w-full" />
        <Skeleton className="h-28 w-full" />
      </div>
      <Skeleton className="h-48 w-full" />
      <Skeleton className="h-48 w-full" />
    </div>
  );
}

export default function DrugDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';

  const [purchaseOpen, setPurchaseOpen] = useState(false);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);

  const { data: drug, isLoading, isError, error, refetch } = useDrug(id);
  const deleteDrug = useDeleteDrug();
  const { data: companiesData } = useCompaniesAll();
  const { data: drugsData } = useDrugs({ page: 1, pageSize: 100, sort: 'name:asc' });
  const { data: purchasesData } = usePurchases({ page: 1, pageSize: 100, sort: 'createdAt:desc' });
  const { data: salesData } = useSalesList({ page: 1, pageSize: 50, sort: 'createdAt:desc' });

  const companies = companiesData?.data ?? [];
  const drugs = drugsData?.data ?? [];

  const drugPurchases = useMemo(() => {
    if (!purchasesData || !id) return [];
    return purchasesData.data
      .flatMap((purchase) =>
        purchase.items
          .filter((item) => item.drugId === id)
          .map((item) => ({ purchase, item })),
      )
      .slice(0, 10);
  }, [purchasesData, id]);

  const drugSales = useMemo(() => {
    if (!salesData || !id) return [];
    return salesData.data
      .flatMap((sale) => sale.items.filter((item) => item.drugId === id).map((item) => ({ sale, item })))
      .slice(0, 10);
  }, [salesData, id]);

  const is404 = isError && error instanceof ApiError && error.code === 'NOT_FOUND';

  async function confirmDelete() {
    if (!drug) return;
    try {
      await deleteDrug.mutateAsync(drug.id);
      toast({ title: 'Drug deleted', description: `${drug.name} was removed from the catalog.`, variant: 'success' });
      setConfirmDeleteOpen(false);
      void navigate('/inventory');
    } catch (err) {
      const friendly =
        err instanceof ApiError && err.code === 'CONFLICT'
          ? `${drug.name} has been sold before and can't be deleted. It is referenced by existing sales.`
          : err instanceof ApiError
            ? err.message
            : 'Something went wrong. Please try again.';
      toast({ title: 'Could not delete drug', description: friendly, variant: 'error' });
      setConfirmDeleteOpen(false);
    }
  }

  if (isLoading) {
    return (
      <>
        <PageHeader title="Drug detail" />
        <DetailSkeleton />
      </>
    );
  }

  if (isError || !drug) {
    return (
      <>
        <PageHeader
          title="Drug detail"
          actions={
            <Button
              type="button"
              variant="secondary"
              size="sm"
              leftIcon={<ArrowLeft className="h-4 w-4" aria-hidden="true" />}
              onClick={() => void navigate('/inventory')}
            >
              Back to inventory
            </Button>
          }
        />
        <ErrorState
          title={is404 ? 'Drug not found' : 'Something went wrong'}
          description={
            is404
              ? "This drug doesn't exist or may have been removed from the catalog."
              : 'We could not load this drug. Please try again.'
          }
          onRetry={is404 ? undefined : () => void refetch()}
        />
      </>
    );
  }

  const expiryDays = daysUntil(drug.expirationDate);
  const margin = drug.costPrice > 0 ? ((drug.sellingPrice - drug.costPrice) / drug.costPrice) * 100 : 0;

  return (
    <>
      <PageHeader
        title={drug.name}
        description={drug.dose || undefined}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              leftIcon={<ArrowLeft className="h-4 w-4" aria-hidden="true" />}
              onClick={() => void navigate('/inventory')}
            >
              Back to inventory
            </Button>
            {isAdmin && (
              <>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  leftIcon={<ShoppingCart className="h-4 w-4" aria-hidden="true" />}
                  onClick={() => setPurchaseOpen(true)}
                >
                  Record purchase
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  leftIcon={<Pencil className="h-4 w-4" aria-hidden="true" />}
                  onClick={() => void navigate(`/inventory?edit=${drug.id}`)}
                >
                  Edit
                </Button>
                <Button
                  type="button"
                  variant="danger"
                  size="sm"
                  leftIcon={<Trash2 className="h-4 w-4" aria-hidden="true" />}
                  onClick={() => setConfirmDeleteOpen(true)}
                >
                  Delete
                </Button>
              </>
            )}
          </div>
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <StatusBadge status={drug.status} />
        <Badge variant="neutral">{typeLabel(drug.type)}</Badge>
        <span className="flex items-center gap-1 text-xs text-fg-muted">
          <BarcodeIcon className="h-3.5 w-3.5" aria-hidden="true" />
          <span className="font-mono">{drug.barcode}</span>
        </span>
        {drug.code && <span className="text-xs text-fg-muted">Code: {drug.code}</span>}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-fg-muted">Pricing</p>
            <p className="tabular-nums mt-1 text-base font-semibold text-fg">{formatCurrency(drug.sellingPrice)}</p>
            <p className="tabular-nums text-xs text-fg-muted">Cost {formatCurrency(drug.costPrice)}</p>
            <p className={`tabular-nums text-xs ${margin < 0 ? 'text-danger' : 'text-fg-muted'}`}>
              Margin {margin.toFixed(1)}%
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-fg-muted">Stock</p>
            <p className="tabular-nums mt-1 text-base font-semibold text-fg">{drug.quantity} units</p>
            <p className="text-xs text-fg-muted">Reorder at {drug.reorderLevel}</p>
            <p className="flex items-center gap-1 text-xs text-fg-muted">
              <Warehouse className="h-3.5 w-3.5" aria-hidden="true" />
              {drug.place || 'No shelf recorded'}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-fg-muted">Dates</p>
            <p className="mt-1 text-sm text-fg">Produced {formatDate(drug.productionDate)}</p>
            <p className={`flex items-center gap-1 text-sm ${expiryToneClass(expiryDays)}`}>
              <CalendarClock className="h-3.5 w-3.5" aria-hidden="true" />
              Expires {formatDate(drug.expirationDate)}
            </p>
            <p className={`text-xs ${expiryToneClass(expiryDays)}`}>
              {expiryDays < 0 ? `Expired ${Math.abs(expiryDays)} days ago` : `${expiryDays} days left`}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-fg-muted">Supplier</p>
            <Link
              to="/companies"
              className="mt-1 flex items-center gap-1 text-base font-semibold text-fg hover:text-primary hover:underline"
            >
              <Building2 className="h-4 w-4" aria-hidden="true" />
              {drug.company.name}
            </Link>
          </CardContent>
        </Card>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Receipt className="h-4 w-4 text-fg-muted" aria-hidden="true" />
              Recent sales
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {drugSales.length === 0 ? (
              <p className="px-5 py-6 text-sm text-fg-muted">
                No recent sales of this drug found in the last 50 invoices.
              </p>
            ) : (
              <ul className="divide-y divide-border">
                {drugSales.map(({ sale, item }) => (
                  <li key={item.id} className="flex items-center justify-between gap-3 px-5 py-3 text-sm">
                    <div>
                      <Link to={`/sales/${sale.id}`} className="font-medium text-fg hover:text-primary hover:underline">
                        {sale.invoiceNo}
                      </Link>
                      <p className="text-xs text-fg-muted">{formatDateTime(sale.createdAt)}</p>
                    </div>
                    <div className="text-right">
                      <p className="tabular-nums text-fg">{item.quantity} units</p>
                      <p className="tabular-nums text-xs text-fg-muted">{formatCurrency(item.amount)}</p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShoppingCart className="h-4 w-4 text-fg-muted" aria-hidden="true" />
              Purchase history
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {drugPurchases.length === 0 ? (
              <p className="px-5 py-6 text-sm text-fg-muted">
                No purchases of this drug found in the most recent orders.
              </p>
            ) : (
              <ul className="divide-y divide-border">
                {drugPurchases.map(({ purchase, item }) => (
                  <li key={item.id} className="flex items-center justify-between gap-3 px-5 py-3 text-sm">
                    <div>
                      <Link
                        to={`/purchases/${purchase.id}`}
                        className="font-medium text-fg hover:text-primary hover:underline"
                      >
                        {purchase.reference}
                      </Link>
                      <p className="text-xs text-fg-muted">{formatDateTime(purchase.createdAt)}</p>
                    </div>
                    <div className="text-right">
                      <p className="tabular-nums text-fg">{item.quantity} units</p>
                      <p className="tabular-nums text-xs text-fg-muted">{formatCurrency(item.amount)}</p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      {isAdmin && (
        <>
          <PurchaseFormModal
            open={purchaseOpen}
            onClose={() => setPurchaseOpen(false)}
            companies={companies}
            drugs={drugs}
            initialCompanyId={drug.companyId}
            initialDrugId={drug.id}
          />

          <ConfirmDialog
            open={confirmDeleteOpen}
            title="Delete drug?"
            description={`${drug.name} will be permanently removed from the catalog. This can't be undone.`}
            confirmLabel="Delete"
            confirmVariant="danger"
            loading={deleteDrug.isPending}
            onConfirm={() => void confirmDelete()}
            onCancel={() => setConfirmDeleteOpen(false)}
          />
        </>
      )}
    </>
  );
}
