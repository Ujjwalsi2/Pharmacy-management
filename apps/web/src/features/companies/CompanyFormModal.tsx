import { useEffect } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { FormField } from '@/components/ui/FormField';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { useToast } from '@/components/ui/useToast';
import { ApiError } from '@/lib/api';
import type { Company } from '@/types/api';
import { useCreateCompany, useUpdateCompany } from './api';

const companySchema = z.object({
  name: z.string().min(1, 'Name is required'),
  address: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().optional().refine((value) => !value || z.string().email().safeParse(value).success, {
    message: 'Enter a valid email address',
  }),
});

type FormValues = z.infer<typeof companySchema>;

export interface CompanyFormModalProps {
  open: boolean;
  onClose: () => void;
  /** Present when editing; absent when creating. */
  company?: Company | null;
}

function toDefaultValues(company?: Company | null): FormValues {
  return {
    name: company?.name ?? '',
    address: company?.address ?? '',
    phone: company?.phone ?? '',
    email: company?.email ?? '',
  };
}

export function CompanyFormModal({ open, onClose, company }: CompanyFormModalProps) {
  const isEdit = Boolean(company);
  const { toast } = useToast();
  const createCompany = useCreateCompany();
  const updateCompany = useUpdateCompany();

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(companySchema),
    defaultValues: toDefaultValues(company),
  });

  useEffect(() => {
    if (open) reset(toDefaultValues(company));
  }, [open, company, reset]);

  async function onSubmit(values: FormValues) {
    const payload = {
      name: values.name,
      address: values.address || undefined,
      phone: values.phone || undefined,
      email: values.email || undefined,
    };

    try {
      if (isEdit && company) {
        await updateCompany.mutateAsync({ id: company.id, input: payload });
        toast({ title: 'Supplier updated', description: `${values.name}'s details were saved.`, variant: 'success' });
      } else {
        await createCompany.mutateAsync(payload);
        toast({ title: 'Supplier added', description: `${values.name} is now available for drugs and purchases.`, variant: 'success' });
      }
      onClose();
    } catch (error) {
      if (error instanceof ApiError && error.code === 'CONFLICT') {
        setError('name', { message: 'A supplier with this name already exists' });
        return;
      }
      toast({
        title: isEdit ? 'Could not update supplier' : 'Could not add supplier',
        description: error instanceof ApiError ? error.message : 'Please try again.',
        variant: 'error',
      });
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? 'Edit supplier' : 'Add supplier'}
      description={
        isEdit ? `Update ${company?.name ?? 'this supplier'}'s contact details.` : 'Add a new supplier company.'
      }
    >
      <form onSubmit={(event) => void handleSubmit(onSubmit)(event)} className="space-y-4" noValidate>
        <FormField label="Company name" error={errors.name?.message} required>
          <Input autoComplete="organization" {...register('name')} />
        </FormField>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormField label="Phone" error={errors.phone?.message}>
            <Input autoComplete="tel" {...register('phone')} />
          </FormField>
          <FormField label="Email" error={errors.email?.message}>
            <Input type="email" autoComplete="email" {...register('email')} />
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
            {isEdit ? 'Save changes' : 'Add supplier'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
