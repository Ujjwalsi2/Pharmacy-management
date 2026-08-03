import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Activity, Check, Info, Laptop, Moon, ShieldCheck, Sun, UserCog } from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { useTheme } from '@/components/layout/useTheme';
import type { Theme } from '@/components/layout/ThemeContext';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { ErrorState } from '@/components/ui/ErrorState';
import { FormField } from '@/components/ui/FormField';
import { Input } from '@/components/ui/Input';
import { Skeleton } from '@/components/ui/Skeleton';
import { useToast } from '@/components/ui/useToast';
import { authApi } from '@/features/auth/api';
import { useAuth } from '@/features/auth/useAuth';
import { ApiError } from '@/lib/api';
import { formatDate } from '@/lib/format';

const API_URL = import.meta.env.VITE_API_URL ?? '/api';

const passwordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Current password is required'),
    newPassword: z.string().min(8, 'New password must be at least 8 characters'),
    confirmPassword: z.string().min(1, 'Please confirm your new password'),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  })
  .refine((data) => data.newPassword !== data.currentPassword, {
    message: 'New password must be different from your current password',
    path: ['newPassword'],
  });

type PasswordFormValues = z.infer<typeof passwordSchema>;

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  const first = parts[0]?.[0] ?? '';
  const last = parts.length > 1 ? parts[parts.length - 1]?.[0] ?? '' : '';
  return (first + last).toUpperCase();
}

function ThemeTile({
  value,
  label,
  icon: Icon,
  active,
  onSelect,
}: {
  value: Theme;
  label: string;
  icon: typeof Sun;
  active: boolean;
  onSelect: (value: Theme) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onSelect(value)}
      aria-pressed={active}
      className={`relative flex flex-col items-center gap-2 rounded-[var(--radius-control)] border p-4 text-sm font-medium transition-colors duration-150 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-bg ${
        active ? 'border-primary bg-primary/5 text-primary' : 'border-border text-fg-muted hover:bg-surface-muted'
      }`}
    >
      {active && (
        <span className="absolute right-2 top-2 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-fg">
          <Check className="h-3 w-3" aria-hidden="true" />
        </span>
      )}
      <span
        className={`flex h-12 w-full items-center justify-center rounded-[8px] ${
          value === 'dark' ? 'bg-slate-900' : value === 'light' ? 'bg-white border border-border' : 'bg-gradient-to-br from-white to-slate-900'
        }`}
      >
        <Icon className={`h-5 w-5 ${value === 'light' ? 'text-slate-900' : value === 'dark' ? 'text-white' : 'text-slate-500'}`} aria-hidden="true" />
      </span>
      {label}
    </button>
  );
}

function ProfileCard() {
  const { data: profile, isLoading, isError, refetch } = useQuery({
    queryKey: ['auth', 'me'],
    queryFn: authApi.me,
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Profile</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-12 w-12 rounded-full" />
            <Skeleton className="h-4 w-48" />
            <Skeleton className="h-4 w-64" />
          </div>
        ) : isError || !profile ? (
          <ErrorState onRetry={() => void refetch()} description="We could not load your profile." />
        ) : (
          <div>
            <div className="flex items-center gap-4">
              <span className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-lg font-semibold text-primary">
                {initials(profile.name)}
              </span>
              <div>
                <p className="text-base font-semibold text-fg">{profile.name}</p>
                <p className="text-sm text-fg-muted">{profile.email}</p>
              </div>
              <Badge variant={profile.role === 'ADMIN' ? 'info' : 'neutral'} className="ml-auto gap-1">
                <ShieldCheck className="h-3 w-3" aria-hidden="true" />
                {profile.role === 'ADMIN' ? 'Admin' : 'Pharmacist'}
              </Badge>
            </div>

            <dl className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-fg-muted">Phone</dt>
                <dd className="mt-1 text-sm text-fg">{profile.phone || '—'}</dd>
              </div>
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-fg-muted">Date of birth</dt>
                <dd className="mt-1 text-sm text-fg">{profile.dob ? formatDate(profile.dob) : '—'}</dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="text-xs font-semibold uppercase tracking-wide text-fg-muted">Address</dt>
                <dd className="mt-1 text-sm text-fg">{profile.address || '—'}</dd>
              </div>
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-fg-muted">Joined</dt>
                <dd className="mt-1 text-sm text-fg">{formatDate(profile.createdAt)}</dd>
              </div>
            </dl>

            <div className="mt-5 flex items-start gap-2 rounded-[var(--radius-control)] border border-border bg-surface-muted px-3.5 py-3 text-xs text-fg-muted">
              <UserCog className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
              <p>
                Profile fields can only be changed by an administrator (
                <code className="rounded bg-surface px-1 py-0.5">PATCH /users/:id</code> is admin-only). Ask an
                admin to update these details on the Users page.
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function SecurityCard() {
  const { changePassword } = useAuth();
  const { toast } = useToast();
  const [apiError, setApiError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<PasswordFormValues>({
    resolver: zodResolver(passwordSchema),
    defaultValues: { currentPassword: '', newPassword: '', confirmPassword: '' },
  });

  async function onSubmit(values: PasswordFormValues) {
    setApiError(null);
    try {
      await changePassword(values.currentPassword, values.newPassword);
      toast({ title: 'Password updated', description: 'Use your new password next time you sign in.', variant: 'success' });
      reset();
    } catch (error) {
      setApiError(
        error instanceof ApiError
          ? error.code === 'UNAUTHORIZED' || error.code === 'VALIDATION_ERROR'
            ? 'Your current password is incorrect.'
            : error.message
          : 'Unable to update password. Please try again.',
      );
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Security</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={(event) => void handleSubmit(onSubmit)(event)} className="space-y-4" noValidate>
          {apiError && (
            <div role="alert" className="rounded-[var(--radius-control)] border border-danger/30 bg-danger/10 px-3.5 py-2.5 text-sm text-danger">
              {apiError}
            </div>
          )}
          <FormField label="Current password" error={errors.currentPassword?.message} required>
            <Input type="password" autoComplete="current-password" {...register('currentPassword')} />
          </FormField>
          <FormField label="New password" error={errors.newPassword?.message} required>
            <Input type="password" autoComplete="new-password" {...register('newPassword')} />
          </FormField>
          <FormField label="Confirm new password" error={errors.confirmPassword?.message} required>
            <Input type="password" autoComplete="new-password" {...register('confirmPassword')} />
          </FormField>
          <div className="flex justify-end pt-1">
            <Button type="submit" loading={isSubmitting}>
              Update password
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

function AppearanceCard() {
  const { theme, setTheme, resolvedTheme } = useTheme();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Appearance</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="mb-4 text-sm text-fg-muted">
          Currently using <span className="font-medium text-fg">{resolvedTheme}</span> mode.
        </p>
        <div className="grid grid-cols-3 gap-3">
          <ThemeTile value="light" label="Light" icon={Sun} active={theme === 'light'} onSelect={setTheme} />
          <ThemeTile value="dark" label="Dark" icon={Moon} active={theme === 'dark'} onSelect={setTheme} />
          <ThemeTile value="system" label="System" icon={Laptop} active={theme === 'system'} onSelect={setTheme} />
        </div>
      </CardContent>
    </Card>
  );
}

function AboutCard() {
  const { data: health, isLoading } = useQuery({
    queryKey: ['health'],
    queryFn: () => fetch(`${API_URL}/health`).then((res) => {
      if (!res.ok) throw new Error('Health check failed');
      return res.json() as Promise<{ status: string; uptime: number }>;
    }),
    retry: 0,
    refetchInterval: 30_000,
  });

  const isUp = Boolean(health && health.status === 'ok');

  return (
    <Card>
      <CardHeader>
        <CardTitle>About</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <div className="flex items-center justify-between">
          <span className="text-fg-muted">Product</span>
          <span className="font-medium text-fg">MediTrack</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-fg-muted">Version</span>
          <span className="font-medium text-fg tabular-nums">1.0.0</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-fg-muted">API base URL</span>
          <span className="font-mono text-xs text-fg">{API_URL}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-1.5 text-fg-muted">
            <Activity className="h-3.5 w-3.5" aria-hidden="true" /> API status
          </span>
          {isLoading ? (
            <Skeleton className="h-5 w-16" />
          ) : (
            <Badge variant={isUp ? 'success' : 'danger'}>{isUp ? 'Operational' : 'Down'}</Badge>
          )}
        </div>
        <a
          href={`${API_URL}/health`}
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-1.5 pt-1 text-xs text-primary hover:underline"
        >
          <Info className="h-3.5 w-3.5" aria-hidden="true" /> View health endpoint
        </a>
      </CardContent>
    </Card>
  );
}

export default function SettingsPage() {
  return (
    <>
      <PageHeader title="Settings" description="Manage your profile, security and preferences." />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="space-y-6">
          <ProfileCard />
          <SecurityCard />
        </div>
        <div className="space-y-6">
          <AppearanceCard />
          <AboutCard />
        </div>
      </div>
    </>
  );
}
