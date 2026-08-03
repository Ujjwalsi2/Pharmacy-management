import { useEffect, useMemo } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useFieldArray, useForm } from 'react-hook-form';
import { z } from 'zod';
import { useNavigate } from 'react-router-dom';
import { Plus, Trash2 } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { FormField } from '@/components/ui/FormField';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Textarea } from '@/components/ui/Textarea';
import { useToast } from '@/components/ui/useToast';
import { ApiError } from '@/lib/api';
import { formatCurrency } from '@/lib/format';
import type { Company, Drug } from '@/types/api';
import { useCreatePurchase } from './api';
import { round2 } from './money';

const lineSchema = z.object({
  drugId: z.string().min(1, 'Pick a drug'),
  quantity: z
    .string()
    .min(1, 'Required')
    .refine((value) => Number.isInteger(Number(value)) && Number(value) > 0, 'Must be a positive whole number'),
  unitCost: z
    .string()
    .min(1, 'Required')
    .refine((value) => !Number.isNaN(Number(value)) && Number(value) > 0, 'Must be a positive number'),
});

const purchaseSchema = z.object({
  companyId: z.string().min(1, 'Pick a supplier'),
  notes: z.string().optional(),
  items: z.array(lineSchema).min(1, 'Add at least one line item'),
});

type FormValues = z.infer<typeof purchaseSchema>;

const emptyLine = { drugId: '', quantity: '', unitCost: '' };

export interface PurchaseFormModalProps {
  open: boolean;
  onClose: () => void;
  companies: Company[];
  drugs: Drug[];
  /** Preselects a supplier + drug, e.g. when launched from a drug's detail page. */
  initialCompanyId?: string;
  initialDrugId?: string;
}

export function PurchaseFormModal({
  open,
  onClose,
  companies,
  drugs,
  initialCompanyId,
  initialDrugId,
}: PurchaseFormModalProps) {
  const { toast } = useToast();
  const navigate = useNavigate();
  const createPurchase = useCreatePurchase();

  const {
    register,
    control,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(purchaseSchema),
    defaultValues: {
      companyId: initialCompanyId ?? '',
      notes: '',
      items: [{ ...emptyLine, drugId: initialDrugId ?? '' }],
    },
  });

  const { fields, append, remove } = useFieldArray({ control, name: 'items' });

  useEffect(() => {
    if (open) {
      reset({
        companyId: initialCompanyId ?? '',
        notes: '',
        items: [{ ...emptyLine, drugId: initialDrugId ?? '' }],
      });
    }
  }, [open, initialCompanyId, initialDrugId, reset]);

  const selectedCompanyId = watch('companyId');
  const lineValues = watch('items');

  const drugsForCompany = useMemo(() => {
    if (!selectedCompanyId) return drugs;
    const scoped = drugs.filter((drug) => drug.companyId === selectedCompanyId);
    return scoped.length > 0 ? scoped : drugs;
  }, [drugs, selectedCompanyId]);

  const drugById = useMemo(() => new Map(drugs.map((drug) => [drug.id, drug])), [drugs]);

  const grandTotal = useMemo(() => {
    return round2(
      lineValues.reduce((sum, line) => {
        const quantity = Number(line.quantity);
        const unitCost = Number(line.unitCost);
        if (!Number.isFinite(quantity) || !Number.isFinite(unitCost)) return sum;
        return sum + quantity * unitCost;
      }, 0),
    );
  }, [lineValues]);

  async function onSubmit(values: FormValues) {
    const payload = {
      companyId: values.companyId,
      notes: values.notes || undefined,
      items: values.items.map((line) => ({
        drugId: line.drugId,
        quantity: Number(line.quantity),
        unitCost: Number(line.unitCost),
      })),
    };

    try {
      const purchase = await createPurchase.mutateAsync(payload);
      toast({
        title: 'Purchase recorded',
        description: `${purchase.reference} was created and stock levels were updated.`,
        variant: 'success',
        durationMs: 6000,
      });
      onClose();
      void navigate(`/purchases/${purchase.id}`);
    } catch (error) {
      toast({
        title: 'Could not record purchase',
        description: error instanceof ApiError ? error.message : 'Please try again.',
        variant: 'error',
      });
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Record purchase"
      description="Log stock received from a supplier. Drug quantities are incremented automatically."
      className="max-w-2xl"
    >
      <form onSubmit={(event) => void handleSubmit(onSubmit)(event)} className="space-y-4" noValidate>
        <FormField label="Supplier" error={errors.companyId?.message} required>
          <Select {...register('companyId')} aria-invalid={Boolean(errors.companyId)}>
            <option value="">Select a supplier…</option>
            {companies.map((company) => (
              <option key={company.id} value={company.id}>
                {company.name}
              </option>
            ))}
          </Select>
        </FormField>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-fg">Line items</p>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              leftIcon={<Plus className="h-4 w-4" aria-hidden="true" />}
              onClick={() => append({ ...emptyLine })}
            >
              Add line
            </Button>
          </div>
          {errors.items?.root?.message && (
            <p role="alert" className="text-xs text-danger">
              {errors.items.root.message}
            </p>
          )}
          {errors.items?.message && (
            <p role="alert" className="text-xs text-danger">
              {errors.items.message}
            </p>
          )}

          <div className="space-y-3">
            {fields.map((field, index) => {
              const line = lineValues[index];
              const drug = line?.drugId ? drugById.get(line.drugId) : undefined;
              const quantity = Number(line?.quantity);
              const unitCost = Number(line?.unitCost);
              const amount =
                Number.isFinite(quantity) && Number.isFinite(unitCost) ? round2(quantity * unitCost) : 0;
              const lineErrors = errors.items?.[index];

              return (
                <div key={field.id} className="rounded-[var(--radius-control)] border border-border p-3">
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-[2fr_1fr_1fr_auto]">
                    <FormField label="Drug" error={lineErrors?.drugId?.message}>
                      <Select {...register(`items.${index}.drugId`)} aria-invalid={Boolean(lineErrors?.drugId)}>
                        <option value="">Select a drug…</option>
                        {drugsForCompany.map((option) => (
                          <option key={option.id} value={option.id}>
                            {option.name} · {option.dose}
                          </option>
                        ))}
                      </Select>
                    </FormField>
                    <FormField label="Quantity" error={lineErrors?.quantity?.message}>
                      <Input
                        type="number"
                        min={1}
                        step={1}
                        inputMode="numeric"
                        {...register(`items.${index}.quantity`)}
                        aria-invalid={Boolean(lineErrors?.quantity)}
                      />
                    </FormField>
                    <FormField label="Unit cost" error={lineErrors?.unitCost?.message}>
                      <Input
                        type="number"
                        min={0}
                        step="0.01"
                        inputMode="decimal"
                        {...register(`items.${index}.unitCost`)}
                        aria-invalid={Boolean(lineErrors?.unitCost)}
                      />
                    </FormField>
                    <div className="flex items-end justify-end pb-0.5">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        aria-label={`Remove line ${index + 1}`}
                        disabled={fields.length <= 1}
                        onClick={() => remove(index)}
                      >
                        <Trash2 className="h-4 w-4 text-danger" aria-hidden="true" />
                      </Button>
                    </div>
                  </div>
                  <p className="mt-1 text-right text-xs tabular-nums text-fg-muted">
                    Amount: <span className="font-medium text-fg">{formatCurrency(amount)}</span>
                    {drug && drug.costPrice !== unitCost && Number.isFinite(unitCost) && (
                      <span className="ml-2 text-fg-muted">(usual cost {formatCurrency(drug.costPrice)})</span>
                    )}
                  </p>
                </div>
              );
            })}
          </div>
        </div>

        <FormField label="Notes" error={errors.notes?.message}>
          <Textarea rows={2} placeholder="Optional notes for this purchase order" {...register('notes')} />
        </FormField>

        <div className="flex items-center justify-between rounded-[var(--radius-control)] bg-surface-muted px-3 py-2.5">
          <span className="text-sm font-medium text-fg-muted">Grand total</span>
          <span className="tabular-nums text-lg font-semibold text-fg">{formatCurrency(grandTotal)}</span>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" loading={isSubmitting}>
            Record purchase
          </Button>
        </div>
      </form>
    </Modal>
  );
}
