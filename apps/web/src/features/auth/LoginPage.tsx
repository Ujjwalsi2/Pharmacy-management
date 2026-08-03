import { useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { useLocation, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Pill, ShieldCheck, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { FormField } from '@/components/ui/FormField';
import { Input } from '@/components/ui/Input';
import { ApiError } from '@/lib/api';
import { useAuth } from './useAuth';

const loginSchema = z.object({
  email: z.string().min(1, 'Email is required').email('Enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
});

type LoginFormValues = z.infer<typeof loginSchema>;

const DEMO_ACCOUNTS = [
  { label: 'Admin', email: 'admin@meditrack.dev', password: 'Admin@123' },
  { label: 'Pharmacist', email: 'mark@meditrack.dev', password: 'Mark@123' },
];

interface LocationState {
  from?: { pathname: string };
}

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [showPassword, setShowPassword] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  async function onSubmit(values: LoginFormValues) {
    setApiError(null);
    try {
      await login(values.email, values.password);
      const state = location.state as LocationState | null;
      void navigate(state?.from?.pathname ?? '/', { replace: true });
    } catch (error) {
      setApiError(error instanceof ApiError ? error.message : 'Unable to sign in. Please try again.');
    }
  }

  function fillDemo(email: string, password: string) {
    setValue('email', email);
    setValue('password', password);
  }

  return (
    <div className="grid min-h-screen grid-cols-1 lg:grid-cols-2">
      <div className="relative hidden overflow-hidden bg-gradient-to-br from-primary via-primary to-accent p-10 text-primary-fg lg:flex lg:flex-col lg:justify-between">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 opacity-20"
          style={{
            backgroundImage:
              'radial-gradient(circle at 20% 20%, white 0, transparent 45%), radial-gradient(circle at 80% 0%, white 0, transparent 35%), radial-gradient(circle at 50% 90%, white 0, transparent 40%)',
          }}
        />
        <div className="relative z-10 flex items-center gap-2 text-lg font-semibold">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white/15">
            <Pill className="h-5 w-5" aria-hidden="true" />
          </span>
          MediTrack
        </div>
        <div className="relative z-10 max-w-md">
          <h1 className="text-3xl font-semibold leading-tight">
            Run your pharmacy with clarity, not chaos.
          </h1>
          <p className="mt-4 text-sm leading-relaxed text-white/85">
            MediTrack unifies inventory, purchases, point-of-sale and reporting into one calm
            workspace — so your team spends less time hunting for stock and more time helping
            patients.
          </p>
          <ul className="mt-6 space-y-3 text-sm text-white/90">
            <li className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4" aria-hidden="true" /> Role-based access for admins
              and pharmacists
            </li>
            <li className="flex items-center gap-2">
              <Sparkles className="h-4 w-4" aria-hidden="true" /> Real-time low-stock and expiry
              alerts
            </li>
          </ul>
        </div>
        <p className="relative z-10 text-xs text-white/70">
          &copy; {new Date().getFullYear()} MediTrack. Built for modern pharmacy operations.
        </p>
      </div>

      <div className="flex items-center justify-center bg-bg px-6 py-12">
        <div className="w-full max-w-sm">
          <div className="mb-8 flex items-center gap-2 text-lg font-semibold text-fg lg:hidden">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-primary-fg">
              <Pill className="h-5 w-5" aria-hidden="true" />
            </span>
            MediTrack
          </div>

          <h2 className="text-2xl font-semibold text-fg">Welcome back</h2>
          <p className="mt-1.5 text-sm text-fg-muted">Sign in to manage inventory, sales and reports.</p>

          {apiError && (
            <div role="alert" className="mt-5 rounded-[var(--radius-control)] border border-danger/30 bg-danger/10 px-3.5 py-3 text-sm text-danger">
              {apiError}
            </div>
          )}

          <form className="mt-6 space-y-4" onSubmit={(event) => void handleSubmit(onSubmit)(event)} noValidate>
            <FormField label="Email" error={errors.email?.message} required>
              <Input type="email" autoComplete="email" placeholder="you@meditrack.dev" {...register('email')} />
            </FormField>

            <FormField label="Password" error={errors.password?.message} required>
              <div className="relative">
                <Input
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  placeholder="••••••••"
                  className="pr-10"
                  {...register('password')}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded p-1 text-fg-muted hover:text-fg"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" aria-hidden="true" /> : <Eye className="h-4 w-4" aria-hidden="true" />}
                </button>
              </div>
            </FormField>

            <Button type="submit" className="w-full" loading={isSubmitting}>
              Sign in
            </Button>
          </form>

          <div className="mt-8 rounded-[var(--radius-card)] border border-border bg-surface-muted p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-fg-muted">Demo credentials</p>
            <div className="mt-2.5 space-y-2">
              {DEMO_ACCOUNTS.map((account) => (
                <button
                  key={account.email}
                  type="button"
                  onClick={() => fillDemo(account.email, account.password)}
                  className="flex w-full items-center justify-between rounded-[var(--radius-control)] border border-border bg-surface px-3 py-2 text-left text-xs transition-colors duration-150 ease-out hover:bg-surface-muted"
                >
                  <span className="font-medium text-fg">{account.label}</span>
                  <span className="tabular-nums text-fg-muted">{account.email}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
