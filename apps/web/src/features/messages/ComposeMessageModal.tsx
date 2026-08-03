import { useEffect } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { FormField } from '@/components/ui/FormField';
import { Select } from '@/components/ui/Select';
import { Textarea } from '@/components/ui/Textarea';
import { useToast } from '@/components/ui/useToast';
import { ApiError } from '@/lib/api';
import { useMessageRecipients, useSendMessage } from './api';

const MAX_BODY_LENGTH = 2000;

const schema = z.object({
  toUserId: z.string().min(1, 'Choose a recipient'),
  body: z
    .string()
    .min(1, 'Write a message before sending')
    .max(MAX_BODY_LENGTH, `Message must be ${MAX_BODY_LENGTH} characters or fewer`),
});

type FormValues = z.infer<typeof schema>;

export interface ComposeMessageModalProps {
  open: boolean;
  onClose: () => void;
  defaultRecipientId?: string;
  onSent: () => void;
}

export function ComposeMessageModal({ open, onClose, defaultRecipientId, onSent }: ComposeMessageModalProps) {
  const { toast } = useToast();
  const { data: recipients, isLoading: recipientsLoading } = useMessageRecipients();
  const sendMessage = useSendMessage();

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { toUserId: defaultRecipientId ?? '', body: '' },
  });

  useEffect(() => {
    if (open) reset({ toUserId: defaultRecipientId ?? '', body: '' });
  }, [open, defaultRecipientId, reset]);

  // Recipients load asynchronously; if the modal opened with a preselected
  // recipient before the <option> list was ready, the native <select> falls
  // back to the placeholder. Re-apply the preselected id once options exist.
  useEffect(() => {
    if (open && defaultRecipientId && recipients?.some((recipient) => recipient.id === defaultRecipientId)) {
      setValue('toUserId', defaultRecipientId);
    }
  }, [open, defaultRecipientId, recipients, setValue]);

  const bodyValue = watch('body') ?? '';

  async function onSubmit(values: FormValues) {
    try {
      await sendMessage.mutateAsync(values);
      toast({ title: 'Message sent', variant: 'success' });
      onSent();
      onClose();
    } catch (error) {
      toast({
        title: 'Could not send message',
        description: error instanceof ApiError ? error.message : 'Please try again.',
        variant: 'error',
      });
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="New message" description="Send an internal message to a teammate.">
      <form onSubmit={(event) => void handleSubmit(onSubmit)(event)} className="space-y-4" noValidate>
        <FormField label="To" error={errors.toUserId?.message} required>
          <Select disabled={recipientsLoading} {...register('toUserId')}>
            <option value="">{recipientsLoading ? 'Loading recipients…' : 'Select a recipient'}</option>
            {recipients?.map((recipient) => (
              <option key={recipient.id} value={recipient.id}>
                {recipient.name} ({recipient.email})
              </option>
            ))}
          </Select>
        </FormField>

        <FormField label="Message" error={errors.body?.message} required>
          <Textarea rows={5} maxLength={MAX_BODY_LENGTH} {...register('body')} />
        </FormField>
        <p className="-mt-2 text-right text-xs text-fg-muted" aria-live="polite">
          {bodyValue.length} / {MAX_BODY_LENGTH}
        </p>

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" loading={isSubmitting}>
            Send message
          </Button>
        </div>
      </form>
    </Modal>
  );
}
