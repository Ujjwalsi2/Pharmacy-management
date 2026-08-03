import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Minus, Plus, ScanLine, ShoppingCart, Trash2 } from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { FormField } from '@/components/ui/FormField';
import { SearchInput } from '@/components/ui/SearchInput';
import { StatusBadge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { Skeleton } from '@/components/ui/Skeleton';
import { Modal } from '@/components/ui/Modal';
import { Tooltip } from '@/components/ui/Tooltip';
import { useToast } from '@/components/ui/useToast';
import { formatCurrency } from '@/lib/format';
import { ApiError } from '@/lib/api';
import { useDrugSearch } from '@/features/drugs/api';
import { useBarcodeLookup, useCreateSale } from '@/features/sales/api';
import { useCart } from '@/features/sales/useCart';
import { unsellableReason } from '@/features/sales/cartReducer';
import type { Drug, PaymentMode } from '@/types/api';

const PAYMENT_MODES: { value: PaymentMode; label: string }[] = [
  { value: 'CASH', label: 'Cash' },
  { value: 'CARD', label: 'Card' },
  { value: 'UPI', label: 'UPI' },
];

function DrugResultCard({ drug, onAdd }: { drug: Drug; onAdd: (drug: Drug) => void }) {
  const reason = unsellableReason(drug);
  const disabled = Boolean(reason);

  const button = (
    <button
      type="button"
      disabled={disabled}
      onClick={() => onAdd(drug)}
      className="flex w-full flex-col items-start gap-1 rounded-[var(--radius-card)] border border-border bg-surface p-3.5 text-left transition-colors duration-150 ease-out hover:border-primary/50 hover:bg-surface-muted disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:border-border disabled:hover:bg-surface"
    >
      <div className="flex w-full items-start justify-between gap-2">
        <span className="font-medium text-fg">{drug.name}</span>
        <StatusBadge status={drug.status} />
      </div>
      <span className="text-xs text-fg-muted">
        {drug.dose} &middot; {drug.company.name}
      </span>
      <div className="mt-1 flex w-full items-center justify-between">
        <span className="tabular-nums text-sm font-semibold text-fg">{formatCurrency(drug.sellingPrice)}</span>
        <span className="tabular-nums text-xs text-fg-muted">{drug.quantity} in stock</span>
      </div>
    </button>
  );

  if (!disabled) return button;

  return <Tooltip content={reason}>{button}</Tooltip>;
}

export default function PosPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const barcodeRef = useRef<HTMLInputElement>(null);

  const [barcode, setBarcode] = useState('');
  const [search, setSearch] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [paymentMode, setPaymentMode] = useState<PaymentMode>('CASH');
  const [inlineError, setInlineError] = useState<string | null>(null);
  const [completedInvoice, setCompletedInvoice] = useState<{ id: string; invoiceNo: string } | null>(null);

  const cart = useCart();
  const barcodeLookup = useBarcodeLookup();
  const drugSearch = useDrugSearch(search);
  const createSale = useCreateSale();

  useEffect(() => {
    barcodeRef.current?.focus();
  }, []);

  function handleAdd(drug: Drug) {
    const result = cart.addDrug(drug);
    if (!result.ok) {
      toast({ title: 'Cannot add to cart', description: result.reason, variant: 'error' });
      return;
    }
    setInlineError(null);
    toast({ title: `${drug.name} added`, variant: 'success', durationMs: 1500 });
  }

  async function handleBarcodeSubmit() {
    const code = barcode.trim();
    if (!code) return;
    try {
      const drug = await barcodeLookup.mutateAsync(code);
      handleAdd(drug);
      setBarcode('');
    } catch (error) {
      const message =
        error instanceof ApiError && error.code === 'NOT_FOUND'
          ? `No drug found for barcode "${code}"`
          : error instanceof ApiError
            ? error.message
            : 'Barcode lookup failed';
      toast({ title: 'Unknown barcode', description: message, variant: 'error' });
    } finally {
      barcodeRef.current?.focus();
    }
  }

  async function handleCompleteSale() {
    setInlineError(null);
    try {
      const sale = await createSale.mutateAsync({
        customerName: customerName.trim() || undefined,
        customerPhone: customerPhone.trim() || undefined,
        paymentMode,
        discount: cart.discount,
        taxRate: cart.taxRate,
        items: cart.lines.map((line) => ({ drugId: line.drugId, quantity: line.quantity })),
      });
      setCompletedInvoice({ id: sale.id, invoiceNo: sale.invoiceNo });
    } catch (error) {
      const message =
        error instanceof ApiError
          ? error.message
          : 'Could not complete the sale. Please try again.';
      setInlineError(message);
      toast({
        title: error instanceof ApiError && error.code === 'INSUFFICIENT_STOCK' ? 'Insufficient stock' : 'Sale failed',
        description: message,
        variant: 'error',
      });
    }
  }

  function handleNewSale() {
    cart.clear();
    setCustomerName('');
    setCustomerPhone('');
    setPaymentMode('CASH');
    setCompletedInvoice(null);
    setBarcode('');
    barcodeRef.current?.focus();
  }

  const searchResults = drugSearch.data?.data ?? [];

  return (
    <>
      <PageHeader title="Point of Sale" description="Scan or search for drugs, build a cart and check out." />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.4fr_1fr]">
        {/* Left: scan + search */}
        <div className="space-y-4">
          <Card className="p-4">
            <FormField label="Scan barcode" hint="Focus stays here — scan a barcode or press Enter to add.">
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <ScanLine
                    className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-fg-muted"
                    aria-hidden="true"
                  />
                  <Input
                    ref={barcodeRef}
                    value={barcode}
                    onChange={(event) => setBarcode(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') {
                        event.preventDefault();
                        void handleBarcodeSubmit();
                      }
                    }}
                    placeholder="Scan or type a barcode, then press Enter…"
                    className="pl-9"
                    autoComplete="off"
                  />
                </div>
                <Button type="button" onClick={() => void handleBarcodeSubmit()} loading={barcodeLookup.isPending}>
                  Add
                </Button>
              </div>
            </FormField>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Search catalog</CardTitle>
            </CardHeader>
            <CardContent>
              <SearchInput value={search} onChange={setSearch} placeholder="Search by name, barcode or code…" />

              <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                {drugSearch.isFetching && search.trim().length > 0 && (
                  <>
                    {Array.from({ length: 4 }).map((_, index) => (
                      <Skeleton key={index} className="h-24 w-full" />
                    ))}
                  </>
                )}
                {!drugSearch.isFetching &&
                  searchResults.map((drug) => <DrugResultCard key={drug.id} drug={drug} onAdd={handleAdd} />)}
              </div>

              {!drugSearch.isFetching && search.trim().length > 0 && searchResults.length === 0 && (
                <EmptyState title="No matching drugs" description="Try a different name, barcode or code." />
              )}
              {search.trim().length === 0 && (
                <p className="mt-4 text-center text-sm text-fg-muted">
                  Start typing to search the catalog, or use the barcode scanner above.
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right: cart + checkout */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Cart</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {cart.isEmpty ? (
                <EmptyState
                  icon={<ShoppingCart className="h-5 w-5" aria-hidden="true" />}
                  title="Cart is empty"
                  description="Scan a barcode or search for a drug to get started."
                  className="py-10"
                />
              ) : (
                <ul className="divide-y divide-border">
                  {cart.lines.map((line) => (
                    <li key={line.drugId} className="flex items-start justify-between gap-3 px-4 py-3">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-fg">{line.name}</p>
                        <p className="text-xs text-fg-muted">
                          {line.dose} &middot; {formatCurrency(line.unitPrice)} each
                        </p>
                        <p className="mt-0.5 text-xs text-fg-muted">max {line.availableStock} in stock</p>
                        <div className="mt-2 flex items-center gap-1.5">
                          <Button
                            type="button"
                            variant="secondary"
                            size="sm"
                            aria-label={`Decrease quantity of ${line.name}`}
                            onClick={() => cart.setLineQuantity(line.drugId, line.quantity - 1)}
                            className="h-7 w-7 p-0"
                          >
                            <Minus className="h-3.5 w-3.5" aria-hidden="true" />
                          </Button>
                          <input
                            type="number"
                            inputMode="numeric"
                            min={1}
                            max={line.availableStock}
                            value={line.quantity}
                            onChange={(event) => cart.setLineQuantity(line.drugId, Number(event.target.value) || 1)}
                            aria-label={`Quantity of ${line.name}`}
                            className="tabular-nums h-7 w-14 rounded-[var(--radius-control)] border border-border bg-surface text-center text-sm text-fg"
                          />
                          <Button
                            type="button"
                            variant="secondary"
                            size="sm"
                            aria-label={`Increase quantity of ${line.name}`}
                            onClick={() => cart.setLineQuantity(line.drugId, line.quantity + 1)}
                            className="h-7 w-7 p-0"
                            disabled={line.quantity >= line.availableStock}
                          >
                            <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                          </Button>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <span className="tabular-nums text-sm font-semibold text-fg">
                          {formatCurrency(line.unitPrice * line.quantity)}
                        </span>
                        <button
                          type="button"
                          onClick={() => cart.removeLine(line.drugId)}
                          aria-label={`Remove ${line.name} from cart`}
                          className="rounded p-1 text-fg-muted transition-colors duration-150 ease-out hover:bg-danger/10 hover:text-danger"
                        >
                          <Trash2 className="h-4 w-4" aria-hidden="true" />
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Customer &amp; payment</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <FormField label="Customer name">
                  <Input
                    value={customerName}
                    onChange={(event) => setCustomerName(event.target.value)}
                    placeholder="Walk-in"
                  />
                </FormField>
                <FormField label="Customer phone">
                  <Input value={customerPhone} onChange={(event) => setCustomerPhone(event.target.value)} />
                </FormField>
              </div>

              <div>
                <Label>Payment mode</Label>
                <div role="radiogroup" aria-label="Payment mode" className="mt-1.5 grid grid-cols-3 gap-1.5 rounded-[var(--radius-control)] bg-surface-muted p-1">
                  {PAYMENT_MODES.map((mode) => (
                    <button
                      key={mode.value}
                      type="button"
                      role="radio"
                      aria-checked={paymentMode === mode.value}
                      onClick={() => setPaymentMode(mode.value)}
                      className={`rounded-[calc(var(--radius-control)-2px)] px-3 py-1.5 text-sm font-medium transition-colors duration-150 ease-out ${
                        paymentMode === mode.value ? 'bg-surface text-fg shadow-sm' : 'text-fg-muted hover:text-fg'
                      }`}
                    >
                      {mode.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <FormField label="Discount (₹)">
                  <Input
                    type="number"
                    min={0}
                    step="0.01"
                    value={cart.discount}
                    onChange={(event) => cart.setDiscount(Math.max(0, Number(event.target.value) || 0))}
                  />
                </FormField>
                <FormField label="Tax rate (%)">
                  <Input
                    type="number"
                    min={0}
                    step="0.01"
                    value={cart.taxRate}
                    onChange={(event) => cart.setTaxRate(Math.max(0, Number(event.target.value) || 0))}
                  />
                </FormField>
              </div>

              <div className="space-y-1.5 rounded-[var(--radius-control)] border border-border bg-surface-muted p-3.5 text-sm">
                <div className="flex justify-between text-fg-muted">
                  <span>Subtotal</span>
                  <span className="tabular-nums">{formatCurrency(cart.totals.subtotal)}</span>
                </div>
                <div className="flex justify-between text-fg-muted">
                  <span>Discount</span>
                  <span className="tabular-nums">-{formatCurrency(cart.totals.discount)}</span>
                </div>
                <div className="flex justify-between text-fg-muted">
                  <span>Tax ({cart.taxRate}%)</span>
                  <span className="tabular-nums">{formatCurrency(cart.totals.tax)}</span>
                </div>
                <div className="mt-1 flex justify-between border-t border-border pt-1.5 text-base font-semibold text-fg">
                  <span>Total</span>
                  <span className="tabular-nums">{formatCurrency(cart.totals.total)}</span>
                </div>
              </div>

              {inlineError && (
                <p role="alert" className="rounded-[var(--radius-control)] border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">
                  {inlineError}
                </p>
              )}

              <Button
                type="button"
                className="w-full"
                size="md"
                disabled={cart.isEmpty}
                loading={createSale.isPending}
                onClick={() => void handleCompleteSale()}
              >
                Complete sale
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      <Modal
        open={Boolean(completedInvoice)}
        onClose={handleNewSale}
        title="Sale completed"
        description={completedInvoice ? `Invoice ${completedInvoice.invoiceNo} has been recorded.` : undefined}
        footer={
          completedInvoice && (
            <>
              <Button type="button" variant="secondary" onClick={handleNewSale}>
                New sale
              </Button>
              <Button type="button" onClick={() => void navigate(`/sales/${completedInvoice.id}`)}>
                View invoice
              </Button>
            </>
          )
        }
      >
        {completedInvoice && (
          <div className="flex flex-col items-center gap-2 py-4 text-center">
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-success/10 text-success">
              <ShoppingCart className="h-6 w-6" aria-hidden="true" />
            </span>
            <p className="text-lg font-semibold text-fg">{completedInvoice.invoiceNo}</p>
            <p className="text-sm text-fg-muted">Total charged: {formatCurrency(cart.totals.total)}</p>
          </div>
        )}
      </Modal>
    </>
  );
}
