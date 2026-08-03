import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Mail,
  Pencil,
  ShieldCheck,
  UserCog,
  UserMinus,
  UserPlus,
  UserRoundCheck,
  Users as UsersIcon,
} from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { Pagination } from '@/components/ui/Pagination';
import { SearchInput } from '@/components/ui/SearchInput';
import { Select } from '@/components/ui/Select';
import { Skeleton } from '@/components/ui/Skeleton';
import type { TableColumn } from '@/components/ui/Table';
import { Table } from '@/components/ui/Table';
import { StatCard } from '@/components/ui/StatCard';
import { useToast } from '@/components/ui/useToast';
import { useAuth } from '@/features/auth/useAuth';
import { useListQuery } from '@/hooks/useListQuery';
import { ApiError } from '@/lib/api';
import { formatCurrency, formatDate } from '@/lib/format';
import type { Role, User } from '@/types/api';
import { useSetUserActive, useUsers, useUsersSummary } from '@/features/users/api';
import { UserFormModal } from '@/features/users/UserFormModal';

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  const first = parts[0]?.[0] ?? '';
  const last = parts.length > 1 ? parts[parts.length - 1]?.[0] ?? '' : '';
  return (first + last).toUpperCase();
}

function RoleBadge({ role }: { role: Role }) {
  return role === 'ADMIN' ? (
    <Badge variant="info" className="gap-1">
      <ShieldCheck className="h-3 w-3" aria-hidden="true" /> Admin
    </Badge>
  ) : (
    <Badge variant="neutral" className="gap-1">
      <UserCog className="h-3 w-3" aria-hidden="true" /> Pharmacist
    </Badge>
  );
}

function TableSkeleton() {
  return (
    <div className="space-y-2 p-4">
      {Array.from({ length: 6 }).map((_, index) => (
        <Skeleton key={index} className="h-12 w-full" />
      ))}
    </div>
  );
}

export default function UsersPage() {
  const { user: currentUser } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const listQuery = useListQuery({ defaultSort: 'name:asc' });
  const { state, params, setSearch, setPage, toggleSort } = listQuery;

  const [roleFilter, setRoleFilter] = useState<Role | ''>('');
  const [activeFilter, setActiveFilter] = useState<'true' | 'false' | ''>('');
  const [formOpen, setFormOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [pendingToggle, setPendingToggle] = useState<User | null>(null);

  const hasFilters = Boolean(params.search) || roleFilter !== '' || activeFilter !== '';

  const listParams = useMemo(
    () => ({
      page: params.page,
      pageSize: params.pageSize,
      search: params.search,
      sort: params.sort,
      role: roleFilter,
      active: activeFilter,
    }),
    [params.page, params.pageSize, params.search, params.sort, roleFilter, activeFilter],
  );

  const { data, isLoading, isError, refetch, isFetching } = useUsers(listParams);
  const { data: summaryData } = useUsersSummary();
  const setUserActive = useSetUserActive();

  const summary = useMemo(() => {
    const rows = summaryData?.data ?? [];
    return {
      total: rows.length,
      admins: rows.filter((row) => row.role === 'ADMIN').length,
      pharmacists: rows.filter((row) => row.role === 'PHARMACIST').length,
      inactive: rows.filter((row) => !row.active).length,
    };
  }, [summaryData]);

  function openCreate() {
    setEditingUser(null);
    setFormOpen(true);
  }

  function openEdit(user: User) {
    setEditingUser(user);
    setFormOpen(true);
  }

  async function confirmToggleActive() {
    if (!pendingToggle) return;
    const nextActive = !pendingToggle.active;
    try {
      await setUserActive.mutateAsync({ id: pendingToggle.id, active: nextActive });
      toast({
        title: nextActive ? 'User reactivated' : 'User deactivated',
        description: `${pendingToggle.name} is now ${nextActive ? 'active' : 'inactive'}.`,
        variant: 'success',
      });
      setPendingToggle(null);
    } catch (error) {
      const friendly =
        error instanceof ApiError && error.code === 'CONFLICT'
          ? 'You cannot deactivate your own account.'
          : error instanceof ApiError
            ? error.message
            : 'Something went wrong. Please try again.';
      toast({ title: 'Could not update user', description: friendly, variant: 'error' });
      setPendingToggle(null);
    }
  }

  const columns: TableColumn<User>[] = [
    {
      key: 'name',
      header: 'Name',
      sortable: true,
      render: (row) => (
        <div className="flex items-center gap-3">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
            {initials(row.name)}
          </span>
          <div>
            <p className="font-medium text-fg">
              {row.name}
              {row.id === currentUser?.id && <span className="ml-1.5 text-xs font-normal text-fg-muted">(You)</span>}
            </p>
            <p className="text-xs text-fg-muted">{row.email}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'role',
      header: 'Role',
      render: (row) => <RoleBadge role={row.role} />,
    },
    {
      key: 'phone',
      header: 'Phone',
      render: (row) => row.phone || <span className="text-fg-muted">—</span>,
    },
    {
      key: 'salary',
      header: 'Salary',
      align: 'right',
      sortable: true,
      render: (row) => (
        <span className="tabular-nums">{row.salary != null ? formatCurrency(row.salary) : '—'}</span>
      ),
    },
    {
      key: 'active',
      header: 'Status',
      render: (row) => (
        <Badge variant={row.active ? 'success' : 'danger'}>{row.active ? 'Active' : 'Inactive'}</Badge>
      ),
    },
    {
      key: 'createdAt',
      header: 'Joined',
      sortable: true,
      render: (row) => formatDate(row.createdAt),
    },
  ];

  const rows = data?.data ?? [];

  return (
    <>
      <PageHeader
        title="Users"
        description="Manage staff accounts, roles and access."
        actions={
          <Button onClick={openCreate} leftIcon={<UserPlus className="h-4 w-4" aria-hidden="true" />}>
            Add user
          </Button>
        }
      />

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total staff" value={summary.total} icon={<UsersIcon className="h-4 w-4" aria-hidden="true" />} />
        <StatCard label="Admins" value={summary.admins} icon={<ShieldCheck className="h-4 w-4" aria-hidden="true" />} />
        <StatCard label="Pharmacists" value={summary.pharmacists} icon={<UserCog className="h-4 w-4" aria-hidden="true" />} />
        <StatCard label="Inactive" value={summary.inactive} icon={<UserMinus className="h-4 w-4" aria-hidden="true" />} />
      </div>

      <Card>
        <div className="border-b border-border p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <SearchInput
              value={state.search}
              onChange={setSearch}
              placeholder="Search by name or email…"
              aria-label="Search users"
              className="sm:max-w-xs"
            />
            <Select
              value={roleFilter}
              onChange={(event) => setRoleFilter(event.target.value as Role | '')}
              aria-label="Filter by role"
              className="sm:w-40"
            >
              <option value="">All roles</option>
              <option value="ADMIN">Admin</option>
              <option value="PHARMACIST">Pharmacist</option>
            </Select>
            <Select
              value={activeFilter}
              onChange={(event) => setActiveFilter(event.target.value as 'true' | 'false' | '')}
              aria-label="Filter by status"
              className="sm:w-40"
            >
              <option value="">All statuses</option>
              <option value="true">Active</option>
              <option value="false">Inactive</option>
            </Select>
          </div>
        </div>

        {isLoading ? (
          <TableSkeleton />
        ) : isError ? (
          <ErrorState onRetry={() => void refetch()} description="We could not load users. Please try again." />
        ) : rows.length === 0 ? (
          <EmptyState
            icon={<UsersIcon className="h-6 w-6" aria-hidden="true" />}
            title={hasFilters ? 'No users match your filters' : 'No staff yet'}
            description={
              hasFilters
                ? 'Try adjusting your search or filters.'
                : 'Add your first staff account to get started.'
            }
            action={
              !hasFilters && (
                <Button size="sm" onClick={openCreate} leftIcon={<UserPlus className="h-4 w-4" aria-hidden="true" />}>
                  Add user
                </Button>
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
              rowActions={(row) => (
                <div className="flex items-center justify-end gap-1">
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
                    aria-label={`Message ${row.name}`}
                    onClick={() => void navigate(`/messages?to=${row.id}&compose=1`)}
                  >
                    <Mail className="h-4 w-4" aria-hidden="true" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    aria-label={row.active ? `Deactivate ${row.name}` : `Reactivate ${row.name}`}
                    onClick={() => setPendingToggle(row)}
                  >
                    {row.active ? (
                      <UserMinus className="h-4 w-4 text-danger" aria-hidden="true" />
                    ) : (
                      <UserRoundCheck className="h-4 w-4 text-success" aria-hidden="true" />
                    )}
                  </Button>
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

      <UserFormModal open={formOpen} onClose={() => setFormOpen(false)} user={editingUser} />

      <ConfirmDialog
        open={Boolean(pendingToggle)}
        title={pendingToggle?.active ? 'Deactivate user?' : 'Reactivate user?'}
        description={
          pendingToggle?.active
            ? `${pendingToggle?.name} will lose access to MediTrack. You can reactivate them later.`
            : `${pendingToggle?.name} will regain access to MediTrack.`
        }
        confirmLabel={pendingToggle?.active ? 'Deactivate' : 'Reactivate'}
        confirmVariant={pendingToggle?.active ? 'danger' : 'primary'}
        loading={setUserActive.isPending}
        onConfirm={() => void confirmToggleActive()}
        onCancel={() => setPendingToggle(null)}
      />
    </>
  );
}
