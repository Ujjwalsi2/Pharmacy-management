import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { Package, Search } from 'lucide-react';
import { cn } from '@/lib/cn';
import { formatCurrency } from '@/lib/format';
import { useDebounce } from '@/hooks/useDebounce';
import { useDrugSearch } from '@/features/drugs/api';
import { NAV_GROUPS } from './nav';

export interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
}

/** Global ⌘K palette: fuzzy-jumps to pages and searches drugs via GET /drugs?search=. */
export function CommandPalette({ open, onClose }: CommandPaletteProps) {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const debouncedQuery = useDebounce(query, 300);
  const { data, isFetching } = useDrugSearch(debouncedQuery);

  useEffect(() => {
    if (open) {
      setQuery('');
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  const pageMatches = useMemo(() => {
    const allItems = NAV_GROUPS.flatMap((group) => group.items);
    if (!query.trim()) return allItems.slice(0, 5);
    const needle = query.trim().toLowerCase();
    return allItems.filter((item) => item.label.toLowerCase().includes(needle));
  }, [query]);

  if (!open) return null;

  function go(to: string) {
    void navigate(to);
    onClose();
  }

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-start justify-center px-4 pt-24">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} aria-hidden="true" />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Command palette"
        className="relative z-10 w-full max-w-lg overflow-hidden rounded-[var(--radius-card)] border border-border bg-surface shadow-[var(--shadow-card)]"
      >
        <div className="flex items-center gap-2 border-b border-border px-4 py-3">
          <Search className="h-4 w-4 text-fg-muted" aria-hidden="true" />
          <input
            ref={inputRef}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Jump to a page or search drugs…"
            aria-label="Command palette search"
            className="w-full bg-transparent text-sm text-fg outline-none placeholder:text-fg-muted"
          />
          <kbd className="rounded border border-border px-1.5 py-0.5 text-xs text-fg-muted">Esc</kbd>
        </div>

        <div className="max-h-96 overflow-y-auto py-2">
          {pageMatches.length > 0 && (
            <div className="px-2">
              <p className="px-2 py-1 text-xs font-semibold uppercase tracking-wide text-fg-muted">Pages</p>
              {pageMatches.map((item) => (
                <button
                  key={item.to}
                  type="button"
                  onClick={() => go(item.to)}
                  className={cn(
                    'flex w-full items-center gap-2.5 rounded-[var(--radius-control)] px-2.5 py-2 text-left text-sm text-fg hover:bg-surface-muted',
                  )}
                >
                  <item.icon className="h-4 w-4 text-fg-muted" aria-hidden="true" />
                  {item.label}
                </button>
              ))}
            </div>
          )}

          {debouncedQuery.trim().length > 0 && (
            <div className="mt-1 px-2">
              <p className="px-2 py-1 text-xs font-semibold uppercase tracking-wide text-fg-muted">
                Drugs {isFetching && '· searching…'}
              </p>
              {(data?.data ?? []).length === 0 && !isFetching && (
                <p className="px-2.5 py-2 text-sm text-fg-muted">No drugs found.</p>
              )}
              {(data?.data ?? []).map((drug) => (
                <button
                  key={drug.id}
                  type="button"
                  onClick={() => go(`/inventory/${drug.id}`)}
                  className="flex w-full items-center gap-2.5 rounded-[var(--radius-control)] px-2.5 py-2 text-left text-sm text-fg hover:bg-surface-muted"
                >
                  <Package className="h-4 w-4 text-fg-muted" aria-hidden="true" />
                  <span className="flex-1">{drug.name}</span>
                  <span className="tabular-nums text-xs text-fg-muted">{formatCurrency(drug.sellingPrice)}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}
