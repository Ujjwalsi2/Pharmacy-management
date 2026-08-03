import { useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { FormField } from '@/components/ui/FormField';
import { Input } from '@/components/ui/Input';
import { useToast } from '@/components/ui/useToast';
import { ApiError } from '@/lib/api';
import { useAuth } from '@/features/auth/useAuth';

const schema = z
  .object({
    currentPassword: z.string().min(1, 'Current password is required'),
    newPassword: z.string().min(8, 'New password must be at least 8 characters'),
    confirmPassword: z.string().min(1, 'Please confirm your new password'),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

type FormValues = z.infer<typeof schema>;

export interface ChangePasswordModalProps {
  open: boolean;
  onClose: () => void;
}

export function ChangePasswordModal({ open, onClose }: ChangePasswordModalProps) {
  const { changePassword } = useAuth();
  const { toast } = useToast();
  const [apiError, setApiError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { currentPassword: '', newPassword: '', confirmPassword: '' },
  });

  async function onSubmit(values: FormValues) {
    setApiError(null);
    try {
      await changePassword(values.currentPassword, values.newPassword);
      toast({ title: 'Password updated', variant: 'success' });
      reset();
      onClose();
    } catch (error) {
      setApiError(error instanceof ApiError ? error.message : 'Unable to update password.');
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Change password" description="Update the password for your account.">
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
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" loading={isSubmitting}>
            Update password
          </Button>
        </div>
      </form>
    </Modal>
  );
}
