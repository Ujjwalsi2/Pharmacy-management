import { useEffect } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { FormField } from '@/components/ui/FormField';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Textarea } from '@/components/ui/Textarea';
import { useToast } from '@/components/ui/useToast';
import { ApiError } from '@/lib/api';
import type { User } from '@/types/api';
import { useCreateUser, useUpdateUser } from './api';

const baseSchema = {
  name: z.string().min(1, 'Name is required'),
  email: z.string().min(1, 'Email is required').email('Enter a valid email address'),
  role: z.enum(['ADMIN', 'PHARMACIST']),
  phone: z.string().optional(),
  address: z.string().optional(),
  dob: z.string().optional(),
  salary: z
    .string()
    .optional()
    .refine((value) => !value || (!Number.isNaN(Number(value)) && Number(value) >= 0), {
      message: 'Salary must be a non-negative number',
    }),
};

const createSchema = z.object({
  ...baseSchema,
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Include at least one uppercase letter')
    .regex(/[0-9]/, 'Include at least one number'),
});

const editSchema = z.object({ ...baseSchema });

type CreateFormValues = z.infer<typeof createSchema>;
type FormValues = CreateFormValues & Partial<Pick<CreateFormValues, 'password'>>;

export interface UserFormModalProps {
  open: boolean;
  onClose: () => void;
  /** Present when editing; absent when creating. */
  user?: User | null;
}

function toDefaultValues(user?: User | null): FormValues {
  return {
    name: user?.name ?? '',
    email: user?.email ?? '',
    password: '',
    role: user?.role ?? 'PHARMACIST',
    phone: user?.phone ?? '',
    address: user?.address ?? '',
    dob: user?.dob ?? '',
    salary: user?.salary != null ? String(user.salary) : '',
  };
}

function passwordStrength(password: string): { label: string; variant: 'danger' | 'warning' | 'success' } {
  let score = 0;
  if (password.length >= 8) score += 1;
  if (password.length >= 12) score += 1;
  if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score += 1;
  if (/[0-9]/.test(password)) score += 1;
  if (/[^A-Za-z0-9]/.test(password)) score += 1;
  if (score <= 2) return { label: 'Weak', variant: 'danger' };
  if (score <= 3) return { label: 'Okay', variant: 'warning' };
  return { label: 'Strong', variant: 'success' };
}

export function UserFormModal({ open, onClose, user }: UserFormModalProps) {
  const isEdit = Boolean(user);
  const { toast } = useToast();
  const createUser = useCreateUser();
  const updateUser = useUpdateUser();

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(isEdit ? editSchema : createSchema),
    defaultValues: toDefaultValues(user),
  });

  useEffect(() => {
    if (open) reset(toDefaultValues(user));
  }, [open, user, reset]);

  const passwordValue = watch('password') ?? '';
  const strength = passwordValue.length > 0 ? passwordStrength(passwordValue) : null;

  async function onSubmit(values: FormValues) {
    const salary = values.salary === '' || values.salary === undefined ? undefined : Number(values.salary);
    const payload = {
      name: values.name,
      email: values.email,
      role: values.role,
      phone: values.phone || undefined,
      address: values.address || undefined,
      dob: values.dob || undefined,
      salary,
    };

    try {
      if (isEdit && user) {
        await updateUser.mutateAsync({ id: user.id, input: payload });
        toast({ title: 'User updated', description: `${values.name}'s details were saved.`, variant: 'success' });
      } else {
        await createUser.mutateAsync({ ...payload, password: values.password ?? '' });
        toast({ title: 'User created', description: `${values.name} can now sign in.`, variant: 'success' });
      }
      onClose();
    } catch (error) {
      if (error instanceof ApiError && error.code === 'CONFLICT') {
        setError('email', { message: 'A user with this email already exists' });
        return;
      }
      toast({
        title: isEdit ? 'Could not update user' : 'Could not create user',
        description: error instanceof ApiError ? error.message : 'Please try again.',
        variant: 'error',
      });
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? 'Edit user' : 'Add user'}
      description={
        isEdit
          ? `Update ${user?.name ?? 'this staff member'}'s profile.`
          : 'Create a new staff account with sign-in credentials.'
      }
    >
      <form onSubmit={(event) => void handleSubmit(onSubmit)(event)} className="space-y-4" noValidate>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormField label="Full name" error={errors.name?.message} required>
            <Input autoComplete="name" {...register('name')} />
          </FormField>
          <FormField label="Email" error={errors.email?.message} required>
            <Input type="email" autoComplete="email" {...register('email')} />
          </FormField>
        </div>

        {!isEdit && (
          <FormField
            label="Password"
            error={errors.password?.message}
            required
            hint={
              strength
                ? `Strength: ${strength.label}`
                : 'At least 8 characters, one uppercase letter and one number.'
            }
          >
            <Input type="password" autoComplete="new-password" {...register('password')} />
          </FormField>
        )}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormField label="Role" error={errors.role?.message} required>
            <Select {...register('role')}>
              <option value="PHARMACIST">Pharmacist</option>
              <option value="ADMIN">Admin</option>
            </Select>
          </FormField>
          <FormField label="Phone" error={errors.phone?.message}>
            <Input autoComplete="tel" {...register('phone')} />
          </FormField>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormField label="Date of birth" error={errors.dob?.message}>
            <Input type="date" {...register('dob')} />
          </FormField>
          <FormField label="Salary (INR)" error={errors.salary?.message}>
            <Input type="number" min={0} step="0.01" inputMode="decimal" {...register('salary')} />
          </FormField>
        </div>

        <FormField label="Address" error={errors.address?.message}>
          <Textarea rows={2} {...register('address')} />
        </FormField>

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" loading={isSubmitting}>
            {isEdit ? 'Save changes' : 'Create user'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
