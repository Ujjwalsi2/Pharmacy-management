import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import {
  AlertTriangle,
  Barcode as BarcodeIcon,
  CalendarClock,
  Eye,
  PackageX,
  Pencil,
  Plus,
  Trash2,
} from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { Badge, StatusBadge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { FormField } from '@/components/ui/FormField';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { Pagination } from '@/components/ui/Pagination';
import { SearchInput } from '@/components/ui/SearchInput';
import { Select } from '@/components/ui/Select';
import { Skeleton } from '@/components/ui/Skeleton';
import type { TableColumn } from '@/components/ui/Table';
import { Table } from '@/components/ui/Table';
import { useToast } from '@/components/ui/useToast';
import { useAuth } from '@/features/auth/useAuth';
import { useListQuery } from '@/hooks/useListQuery';
import { ApiError } from '@/lib/api';
import { formatCurrency, formatDate } from '@/lib/format';
import type { Drug, DrugStatus, DrugType } from '@/types/api';
import { useCompaniesAll } from '@/features/companies/api';
import { useCreateDrug, useDeleteDrug, useDrugAlerts, useDrugs, useUpdateDrug } from '@/features/drugs/api';
import type { DrugInput, DrugsListParams } from '@/features/drugs/api';

const DRUG_TYPES: DrugType[] = ['TABLET', 'CAPSULE', 'SYRUP', 'INJECTION', 'OINTMENT', 'DROPS', 'INHALER', 'OTHER'];

const STATUS_OPTIONS: { value: DrugStatus; label: string }[] = [
  { value: 'IN_STOCK', label: 'In stock' },
  { value: 'LOW_STOCK', label: 'Low stock' },
  { value: 'EXPIRING_SOON', label: 'Expiring soon' },
  { value: 'OUT_OF_STOCK', label: 'Out of stock' },
  { value: 'EXPIRED', label: 'Expired' },
];

// eslint-disable-next-line react-refresh/only-export-components -- exported for unit testing (InventoryPage.helpers.test.ts)
export function typeLabel(type: DrugType): string {
  return type.charAt(0) + type.slice(1).toLowerCase();
}

// eslint-disable-next-line react-refresh/only-export-components -- exported for unit testing (InventoryPage.helpers.test.ts)
export function daysUntil(dateStr: string): number {
  const target = new Date(dateStr);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  target.setHours(0, 0, 0, 0);
  return Math.round((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

// eslint-disable-next-line react-refresh/only-export-components -- exported for unit testing (InventoryPage.helpers.test.ts)
export function expiryClassName(dateStr: string): string {
  const days = daysUntil(dateStr);
  if (days < 0) return 'text-danger font-medium';
  if (days <= 90) return 'text-warning font-medium';
  return 'text-fg';
}

function StockBar({ quantity, reorderLevel }: { quantity: number; reorderLevel: number }) {
  const ratio = reorderLevel > 0 ? quantity / (reorderLevel * 2) : quantity > 0 ? 1 : 0;
  const pct = Math.max(4, Math.min(100, Math.round(ratio * 100)));
  const color = quantity === 0 ? 'bg-danger' : quantity <= reorderLevel ? 'bg-warning' : 'bg-success';
  return (
    <div className="mt-1 h-1.5 w-16 overflow-hidden rounded-full bg-surface-muted" aria-hidden="true">
      <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
    </div>
  );
}

function TableSkeleton() {
  return (
    <div className="space-y-2 p-4">
      {Array.from({ length: 8 }).map((_, index) => (
        <Skeleton key={index} className="h-12 w-full" />
      ))}
    </div>
  );
}

const drugFormSchema = z
  .object({
    name: z.string().min(1, 'Name is required'),
    barcode: z.string().min(1, 'Barcode is required'),
    type: z.enum(['TABLET', 'CAPSULE', 'SYRUP', 'INJECTION', 'OINTMENT', 'DROPS', 'INHALER', 'OTHER']),
    dose: z.string().optional(),
    code: z.string().optional(),
    costPrice: z
      .string()
      .min(1, 'Required')
      .refine((v) => !Number.isNaN(Number(v)) && Number(v) >= 0, 'Must be a non-negative number'),
    sellingPrice: z
      .string()
      .min(1, 'Required')
      .refine((v) => !Number.isNaN(Number(v)) && Number(v) >= 0, 'Must be a non-negative number'),
    companyId: z.string().min(1, 'Pick a supplier'),
    productionDate: z.string().min(1, 'Required'),
    expirationDate: z.string().min(1, 'Required'),
    place: z.string().optional(),
    quantity: z
      .string()
      .optional()
      .refine((v) => !v || (Number.isInteger(Number(v)) && Number(v) >= 0), 'Must be a non-negative whole number'),
    reorderLevel: z
      .string()
      .optional()
      .refine((v) => !v || (Number.isInteger(Number(v)) && Number(v) >= 0), 'Must be a non-negative whole number'),
  })
  .refine((values) => new Date(values.expirationDate) > new Date(values.productionDate), {
    message: 'Expiration date must be after the production date',
    path: ['expirationDate'],
  });

type DrugFormValues = z.infer<typeof drugFormSchema>;

function toFormValues(drug?: Drug | null): DrugFormValues {
  return {
    name: drug?.name ?? '',
    barcode: drug?.barcode ?? '',
    type: drug?.type ?? 'TABLET',
    dose: drug?.dose ?? '',
    code: drug?.code ?? '',
    costPrice: drug ? String(drug.costPrice) : '',
    sellingPrice: drug ? String(drug.sellingPrice) : '',
    companyId: drug?.companyId ?? '',
    productionDate: drug?.productionDate ?? '',
    expirationDate: drug?.expirationDate ?? '',
    place: drug?.place ?? '',
    quantity: drug ? String(drug.quantity) : '0',
    reorderLevel: drug ? String(drug.reorderLevel) : '10',
  };
}

interface DrugFormModalProps {
  open: boolean;
  onClose: () => void;
  companies: { id: string; name: string }[];
  drug?: Drug | null;
}

function DrugFormModal({ open, onClose, companies, drug }: DrugFormModalProps) {
  const isEdit = Boolean(drug);
  const { toast } = useToast();
  const createDrug = useCreateDrug();
  const updateDrug = useUpdateDrug();

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<DrugFormValues>({
    resolver: zodResolver(drugFormSchema),
    defaultValues: toFormValues(drug),
  });

  useEffect(() => {
    if (open) reset(toFormValues(drug));
  }, [open, drug, reset]);

  const costPrice = Number(watch('costPrice'));
  const sellingPrice = Number(watch('sellingPrice'));
  const showMarginWarning =
    Number.isFinite(costPrice) && Number.isFinite(sellingPrice) && costPrice > 0 && sellingPrice < costPrice;

  async function onSubmit(values: DrugFormValues) {
    const payload: DrugInput = {
      name: values.name,
      barcode: values.barcode,
      type: values.type,
      dose: values.dose || undefined,
      code: values.code || undefined,
      costPrice: Number(values.costPrice),
      sellingPrice: Number(values.sellingPrice),
      companyId: values.companyId,
      productionDate: values.productionDate,
      expirationDate: values.expirationDate,
      place: values.place || undefined,
      quantity: values.quantity ? Number(values.quantity) : 0,
      reorderLevel: values.reorderLevel ? Number(values.reorderLevel) : 10,
    };

    try {
      if (isEdit && drug) {
        await updateDrug.mutateAsync({ id: drug.id, input: payload });
        toast({ title: 'Drug updated', description: `${values.name}'s details were saved.`, variant: 'success' });
      } else {
        await createDrug.mutateAsync(payload);
        toast({ title: 'Drug added', description: `${values.name} was added to the catalog.`, variant: 'success' });
      }
      onClose();
    } catch (error) {
      if (error instanceof ApiError && error.code === 'CONFLICT') {
        setError('barcode', { message: 'A drug with this barcode already exists' });
        return;
      }
      toast({
        title: isEdit ? 'Could not update drug' : 'Could not add drug',
        description: error instanceof ApiError ? error.message : 'Please try again.',
        variant: 'error',
      });
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? 'Edit drug' : 'Add drug'}
      description={isEdit ? `Update ${drug?.name ?? 'this drug'}'s catalog entry.` : 'Add a new drug to the catalog.'}
      className="max-w-2xl"
    >
      <form onSubmit={(event) => void handleSubmit(onSubmit)(event)} className="space-y-4" noValidate>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormField label="Name" error={errors.name?.message} required>
            <Input {...register('name')} />
          </FormField>
          <FormField label="Barcode" error={errors.barcode?.message} required>
            <Input className="font-mono" {...register('barcode')} />
          </FormField>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <FormField label="Type" error={errors.type?.message} required>
            <Select {...register('type')}>
              {DRUG_TYPES.map((type) => (
                <option key={type} value={type}>
                  {typeLabel(type)}
                </option>
              ))}
            </Select>
          </FormField>
          <FormField label="Dose" error={errors.dose?.message}>
            <Input placeholder="e.g. 500mg" {...register('dose')} />
          </FormField>
          <FormField label="Code" error={errors.code?.message}>
            <Input {...register('code')} />
          </FormField>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormField label="Cost price (INR)" error={errors.costPrice?.message} required>
            <Input type="number" min={0} step="0.01" inputMode="decimal" {...register('costPrice')} />
          </FormField>
          <FormField
            label="Selling price (INR)"
            error={errors.sellingPrice?.message}
            required
            hint={showMarginWarning ? 'Selling price is below cost price — margin will be negative.' : undefined}
          >
            <Input type="number" min={0} step="0.01" inputMode="decimal" {...register('sellingPrice')} />
          </FormField>
        </div>

        <FormField label="Supplier" error={errors.companyId?.message} required>
          <Select {...register('companyId')}>
            <option value="">Select a supplier…</option>
            {companies.map((company) => (
              <option key={company.id} value={company.id}>
                {company.name}
              </option>
            ))}
          </Select>
        </FormField>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormField label="Production date" error={errors.productionDate?.message} required>
            <Input type="date" {...register('productionDate')} />
          </FormField>
          <FormField label="Expiration date" error={errors.expirationDate?.message} required>
            <Input type="date" {...register('expirationDate')} />
          </FormField>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <FormField label="Shelf / place" error={errors.place?.message}>
            <Input placeholder="e.g. N-Right" {...register('place')} />
          </FormField>
          <FormField label="Quantity" error={errors.quantity?.message}>
            <Input type="number" min={0} step={1} inputMode="numeric" {...register('quantity')} />
          </FormField>
          <FormField label="Reorder level" error={errors.reorderLevel?.message}>
            <Input type="number" min={0} step={1} inputMode="numeric" {...register('reorderLevel')} />
          </FormField>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" loading={isSubmitting}>
            {isEdit ? 'Save changes' : 'Add drug'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

export default function InventoryPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';
  const navigate = useNavigate();
  const { toast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const listQuery = useListQuery({ defaultSort: 'name:asc' });
  const { state, params, setSearch, setPage, toggleSort } = listQuery;

  const statusFilter = (searchParams.get('status') as DrugStatus | null) ?? '';
  const companyFilter = searchParams.get('companyId') ?? '';
  const typeFilter = (searchParams.get('type') as DrugType | null) ?? '';

  const [formOpen, setFormOpen] = useState(false);
  const [editingDrug, setEditingDrug] = useState<Drug | null>(null);
  const [pendingDelete, setPendingDelete] = useState<Drug | null>(null);
  const editId = searchParams.get('edit');

  function updateFilters(patch: Record<string, string | null>) {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        for (const [key, value] of Object.entries(patch)) {
          if (value === null || value === '') next.delete(key);
          else next.set(key, value);
        }
        next.delete('page');
        return next;
      },
      { replace: true },
    );
  }

  function toggleStatusChip(status: DrugStatus) {
    updateFilters({ status: statusFilter === status ? null : status });
  }

  const hasFilters = Boolean(params.search) || statusFilter !== '' || companyFilter !== '' || typeFilter !== '';

  function clearFilters() {
    setSearch('');
    updateFilters({ status: null, companyId: null, type: null });
  }

  const listParams = useMemo(
    (): DrugsListParams => ({
      page: params.page,
      pageSize: params.pageSize,
      search: params.search,
      sort: params.sort,
      status: statusFilter,
      companyId: companyFilter,
      type: typeFilter,
    }),
    [params.page, params.pageSize, params.search, params.sort, statusFilter, companyFilter, typeFilter],
  );

  const { data, isLoading, isError, refetch, isFetching } = useDrugs(listParams);
  const { data: alertsData } = useDrugAlerts();
  const { data: companiesData } = useCompaniesAll();
  const deleteDrug = useDeleteDrug();

  const companies = companiesData?.data ?? [];
  const rows = data?.data ?? [];
  const alerts = alertsData ?? { lowStock: [], expiringSoon: [], expired: [] };

  // Deep-link support: DrugDetailPage's "Edit" button navigates here with
  // `?edit={id}` since the edit form lives only in this page. Once the
  // catalog page loads the target drug, auto-open the edit modal for it and
  // strip the param so a refresh doesn't reopen it.
  useEffect(() => {
    if (!editId) return;
    const target = rows.find((row) => row.id === editId);
    if (target) {
      setEditingDrug(target);
      setFormOpen(true);
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          next.delete('edit');
          return next;
        },
        { replace: true },
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editId, rows]);

  function openCreate() {
    setEditingDrug(null);
    setFormOpen(true);
  }

  function openEdit(drug: Drug) {
    setEditingDrug(drug);
    setFormOpen(true);
  }

  async function confirmDelete() {
    if (!pendingDelete) return;
    try {
      await deleteDrug.mutateAsync(pendingDelete.id);
      toast({ title: 'Drug deleted', description: `${pendingDelete.name} was removed from the catalog.`, variant: 'success' });
      setPendingDelete(null);
    } catch (error) {
      const friendly =
        error instanceof ApiError && error.code === 'CONFLICT'
          ? `${pendingDelete.name} has been sold before and can't be deleted. It is referenced by existing sales.`
          : error instanceof ApiError
            ? error.message
            : 'Something went wrong. Please try again.';
      toast({ title: 'Could not delete drug', description: friendly, variant: 'error' });
      setPendingDelete(null);
    }
  }

  const columns: TableColumn<Drug>[] = [
    {
      key: 'name',
      header: 'Name',
      sortable: true,
      render: (row) => (
        <div>
          <p className="font-medium text-fg">{row.name}</p>
          <p className="text-xs text-fg-muted">{row.dose || '—'}</p>
        </div>
      ),
    },
    {
      key: 'barcode',
      header: 'Barcode',
      render: (row) => (
        <span className="flex items-center gap-1.5 font-mono text-xs text-fg-muted">
          <BarcodeIcon className="h-3.5 w-3.5" aria-hidden="true" />
          {row.barcode}
        </span>
      ),
    },
    {
      key: 'type',
      header: 'Type',
      render: (row) => <Badge variant="neutral">{typeLabel(row.type)}</Badge>,
    },
    {
      key: 'company',
      header: 'Company',
      render: (row) => row.company.name,
    },
    {
      key: 'quantity',
      header: 'Stock',
      align: 'right',
      sortable: true,
      render: (row) => (
        <div className="flex flex-col items-end">
          <span className="tabular-nums">{row.quantity}</span>
          <StockBar quantity={row.quantity} reorderLevel={row.reorderLevel} />
        </div>
      ),
    },
    {
      key: 'costPrice',
      header: 'Cost',
      align: 'right',
      render: (row) => <span className="tabular-nums">{formatCurrency(row.costPrice)}</span>,
    },
    {
      key: 'sellingPrice',
      header: 'Selling',
      align: 'right',
      sortable: true,
      render: (row) => <span className="tabular-nums font-medium text-fg">{formatCurrency(row.sellingPrice)}</span>,
    },
    {
      key: 'expirationDate',
      header: 'Expiry',
      sortable: true,
      render: (row) => <span className={expiryClassName(row.expirationDate)}>{formatDate(row.expirationDate)}</span>,
    },
    {
      key: 'status',
      header: 'Status',
      render: (row) => <StatusBadge status={row.status} />,
    },
  ];

  return (
    <>
      <PageHeader
        title="Inventory"
        description="Drug catalog with stock levels, pricing and expiry."
        actions={
          isAdmin && (
            <Button onClick={openCreate} leftIcon={<Plus className="h-4 w-4" aria-hidden="true" />}>
              Add drug
            </Button>
          )
        }
      />

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <button
          type="button"
          onClick={() => toggleStatusChip('LOW_STOCK')}
          className={`flex items-center gap-3 rounded-[var(--radius-card)] border p-4 text-left transition-colors duration-150 ease-out ${
            statusFilter === 'LOW_STOCK' ? 'border-warning bg-warning/10' : 'border-border bg-surface hover:bg-surface-muted'
          }`}
        >
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-warning/10 text-warning">
            <PackageX className="h-4 w-4" aria-hidden="true" />
          </span>
          <span>
            <span className="block text-2xl font-semibold tabular-nums text-fg">{alerts.lowStock.length}</span>
            <span className="block text-xs text-fg-muted">Low stock</span>
          </span>
        </button>
        <button
          type="button"
          onClick={() => toggleStatusChip('EXPIRING_SOON')}
          className={`flex items-center gap-3 rounded-[var(--radius-card)] border p-4 text-left transition-colors duration-150 ease-out ${
            statusFilter === 'EXPIRING_SOON' ? 'border-warning bg-warning/10' : 'border-border bg-surface hover:bg-surface-muted'
          }`}
        >
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-warning/10 text-warning">
            <CalendarClock className="h-4 w-4" aria-hidden="true" />
          </span>
          <span>
            <span className="block text-2xl font-semibold tabular-nums text-fg">{alerts.expiringSoon.length}</span>
            <span className="block text-xs text-fg-muted">Expiring soon</span>
          </span>
        </button>
        <button
          type="button"
          onClick={() => toggleStatusChip('EXPIRED')}
          className={`flex items-center gap-3 rounded-[var(--radius-card)] border p-4 text-left transition-colors duration-150 ease-out ${
            statusFilter === 'EXPIRED' ? 'border-danger bg-danger/10' : 'border-border bg-surface hover:bg-surface-muted'
          }`}
        >
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-danger/10 text-danger">
            <AlertTriangle className="h-4 w-4" aria-hidden="true" />
          </span>
          <span>
            <span className="block text-2xl font-semibold tabular-nums text-fg">{alerts.expired.length}</span>
            <span className="block text-xs text-fg-muted">Expired</span>
          </span>
        </button>
      </div>

      <Card>
        <div className="border-b border-border p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
            <SearchInput
              value={state.search}
              onChange={setSearch}
              placeholder="Search by name, barcode or code…"
              aria-label="Search drugs"
              className="sm:max-w-xs"
            />
            <Select
              value={statusFilter}
              onChange={(event) => updateFilters({ status: event.target.value || null })}
              aria-label="Filter by status"
              className="sm:w-44"
            >
              <option value="">All statuses</option>
              {STATUS_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
            <Select
              value={companyFilter}
              onChange={(event) => updateFilters({ companyId: event.target.value || null })}
              aria-label="Filter by company"
              className="sm:w-44"
            >
              <option value="">All companies</option>
              {companies.map((company) => (
                <option key={company.id} value={company.id}>
                  {company.name}
                </option>
              ))}
            </Select>
            <Select
              value={typeFilter}
              onChange={(event) => updateFilters({ type: event.target.value || null })}
              aria-label="Filter by type"
              className="sm:w-40"
            >
              <option value="">All types</option>
              {DRUG_TYPES.map((type) => (
                <option key={type} value={type}>
                  {typeLabel(type)}
                </option>
              ))}
            </Select>
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
          <ErrorState onRetry={() => void refetch()} description="We could not load the drug catalog. Please try again." />
        ) : rows.length === 0 ? (
          <EmptyState
            icon={<PackageX className="h-6 w-6" aria-hidden="true" />}
            title={hasFilters ? 'No drugs match your filters' : 'No drugs yet'}
            description={
              hasFilters
                ? 'Try adjusting your search or filters.'
                : isAdmin
                  ? 'Add your first drug to start tracking inventory.'
                  : 'Drugs will appear here once an admin adds them to the catalog.'
            }
            action={
              hasFilters ? (
                <Button size="sm" variant="secondary" onClick={clearFilters}>
                  Clear filters
                </Button>
              ) : (
                isAdmin && (
                  <Button size="sm" onClick={openCreate} leftIcon={<Plus className="h-4 w-4" aria-hidden="true" />}>
                    Add drug
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
              onRowClick={(row) => void navigate(`/inventory/${row.id}`)}
              rowActions={(row) => (
                <div className="flex items-center justify-end gap-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    aria-label={`View ${row.name}`}
                    onClick={() => void navigate(`/inventory/${row.id}`)}
                  >
                    <Eye className="h-4 w-4" aria-hidden="true" />
                  </Button>
                  {isAdmin && (
                    <>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        aria-label={`Edit ${row.name}`}
                        onClick={() => openEdit(row)}
                      >
                        <Pencil className="h-4 w-4" aria-hidden="true" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        aria-label={`Delete ${row.name}`}
                        onClick={() => setPendingDelete(row)}
                      >
                        <Trash2 className="h-4 w-4 text-danger" aria-hidden="true" />
                      </Button>
                    </>
                  )}
                </div>
              )}
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
        <>
          <DrugFormModal open={formOpen} onClose={() => setFormOpen(false)} companies={companies} drug={editingDrug} />

          <ConfirmDialog
            open={Boolean(pendingDelete)}
            title="Delete drug?"
            description={`${pendingDelete?.name ?? 'This drug'} will be permanently removed from the catalog. This can't be undone.`}
            confirmLabel="Delete"
            confirmVariant="danger"
            loading={deleteDrug.isPending}
            onConfirm={() => void confirmDelete()}
            onCancel={() => setPendingDelete(null)}
          />
        </>
      )}
    </>
  );
}
