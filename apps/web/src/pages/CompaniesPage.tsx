import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2, Mail, Package, Pencil, Phone, Plus, Trash2 } from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { Pagination } from '@/components/ui/Pagination';
import { SearchInput } from '@/components/ui/SearchInput';
import { Skeleton } from '@/components/ui/Skeleton';
import { useToast } from '@/components/ui/useToast';
import { useAuth } from '@/features/auth/useAuth';
import { useListQuery } from '@/hooks/useListQuery';
import { ApiError } from '@/lib/api';
import type { Company } from '@/types/api';
import { useCompanies, useDeleteCompany } from '@/features/companies/api';
import { CompanyFormModal } from '@/features/companies/CompanyFormModal';

function CompanyCardSkeleton() {
  return (
    <div className="rounded-[var(--radius-card)] border border-border bg-surface p-5">
      <Skeleton className="h-5 w-2/3" />
      <Skeleton className="mt-3 h-4 w-1/2" />
      <Skeleton className="mt-2 h-4 w-1/3" />
      <Skeleton className="mt-4 h-8 w-full" />
    </div>
  );
}

export default function CompaniesPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';
  const navigate = useNavigate();
  const { toast } = useToast();
  const listQuery = useListQuery({ defaultSort: 'name:asc', defaultPageSize: 12 });
  const { state, params, setSearch, setPage } = listQuery;

  const [formOpen, setFormOpen] = useState(false);
  const [editingCompany, setEditingCompany] = useState<Company | null>(null);
  const [pendingDelete, setPendingDelete] = useState<Company | null>(null);

  const listParams = useMemo(
    () => ({ page: params.page, pageSize: params.pageSize, search: params.search, sort: params.sort }),
    [params.page, params.pageSize, params.search, params.sort],
  );

  const { data, isLoading, isError, refetch, isFetching } = useCompanies(listParams);
  const deleteCompany = useDeleteCompany();

  const hasFilters = Boolean(params.search);
  const rows = data?.data ?? [];

  function openCreate() {
    setEditingCompany(null);
    setFormOpen(true);
  }

  function openEdit(company: Company) {
    setEditingCompany(company);
    setFormOpen(true);
  }

  async function confirmDelete() {
    if (!pendingDelete) return;
    try {
      await deleteCompany.mutateAsync(pendingDelete.id);
      toast({ title: 'Supplier deleted', description: `${pendingDelete.name} was removed.`, variant: 'success' });
      setPendingDelete(null);
    } catch (error) {
      const friendly =
        error instanceof ApiError && error.code === 'CONFLICT'
          ? `${pendingDelete.name} still has drugs or purchases linked to it and can't be deleted. Reassign or remove those first.`
          : error instanceof ApiError
            ? error.message
            : 'Something went wrong. Please try again.';
      toast({ title: 'Could not delete supplier', description: friendly, variant: 'error' });
      setPendingDelete(null);
    }
  }

  return (
    <>
      <PageHeader
        title="Companies"
        description="Supplier directory — the source for every drug and purchase order."
        actions={
          isAdmin && (
            <Button onClick={openCreate} leftIcon={<Plus className="h-4 w-4" aria-hidden="true" />}>
              Add supplier
            </Button>
          )
        }
      />

      <Card>
        <div className="border-b border-border p-4">
          <SearchInput
            value={state.search}
            onChange={setSearch}
            placeholder="Search suppliers by name…"
            aria-label="Search companies"
            className="sm:max-w-xs"
          />
        </div>

        <div className="p-4">
          {isLoading ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, index) => (
                <CompanyCardSkeleton key={index} />
              ))}
            </div>
          ) : isError ? (
            <ErrorState onRetry={() => void refetch()} description="We could not load suppliers. Please try again." />
          ) : rows.length === 0 ? (
            <EmptyState
              icon={<Building2 className="h-6 w-6" aria-hidden="true" />}
              title={hasFilters ? 'No suppliers match your search' : 'No suppliers yet'}
              description={
                hasFilters
                  ? 'Try a different search term.'
                  : 'Add your first supplier to start stocking drugs and recording purchases.'
              }
              action={
                !hasFilters &&
                isAdmin && (
                  <Button size="sm" onClick={openCreate} leftIcon={<Plus className="h-4 w-4" aria-hidden="true" />}>
                    Add supplier
                  </Button>
                )
              }
            />
          ) : (
            <>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {rows.map((company) => (
                  <div
                    key={company.id}
                    className="group flex flex-col justify-between rounded-[var(--radius-card)] border border-border bg-surface p-5 transition-colors duration-150 ease-out hover:border-primary/40"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-3">
                        <button
                          type="button"
                          onClick={() => void navigate(`/inventory?companyId=${company.id}`)}
                          className="text-left text-base font-semibold text-fg hover:text-primary"
                        >
                          {company.name}
                        </button>
                        <Badge variant="info" className="shrink-0 gap-1">
                          <Package className="h-3 w-3" aria-hidden="true" />
                          {company.drugCount}
                        </Badge>
                      </div>
                      <div className="mt-3 space-y-1.5 text-sm text-fg-muted">
                        {company.address && <p>{company.address}</p>}
                        {company.phone && (
                          <p className="flex items-center gap-1.5">
                            <Phone className="h-3.5 w-3.5" aria-hidden="true" /> {company.phone}
                          </p>
                        )}
                        {company.email && (
                          <p className="flex items-center gap-1.5">
                            <Mail className="h-3.5 w-3.5" aria-hidden="true" /> {company.email}
                          </p>
                        )}
                        {!company.address && !company.phone && !company.email && <p>No contact details on file.</p>}
                      </div>
                    </div>

                    <div className="mt-4 flex items-center justify-between gap-2 border-t border-border pt-3">
                      <button
                        type="button"
                        onClick={() => void navigate(`/inventory?companyId=${company.id}`)}
                        className="text-xs font-medium text-primary hover:underline"
                      >
                        View drugs
                      </button>
                      {isAdmin && (
                        <div className="flex items-center gap-1">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            aria-label={`Edit ${company.name}`}
                            onClick={() => openEdit(company)}
                          >
                            <Pencil className="h-4 w-4" aria-hidden="true" />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            aria-label={`Delete ${company.name}`}
                            onClick={() => setPendingDelete(company)}
                          >
                            <Trash2 className="h-4 w-4 text-danger" aria-hidden="true" />
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-2">
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
            <p className="pt-3 text-xs text-fg-muted" role="status">
              Refreshing…
            </p>
          )}
        </div>
      </Card>

      <CompanyFormModal open={formOpen} onClose={() => setFormOpen(false)} company={editingCompany} />

      <ConfirmDialog
        open={Boolean(pendingDelete)}
        title="Delete supplier?"
        description={`${pendingDelete?.name ?? 'This supplier'} will be permanently removed. This can't be undone.`}
        confirmLabel="Delete"
        confirmVariant="danger"
        loading={deleteCompany.isPending}
        onConfirm={() => void confirmDelete()}
        onCancel={() => setPendingDelete(null)}
      />
    </>
  );
}
