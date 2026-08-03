import { useEffect, useState } from 'react';
import { Search } from 'lucide-react';
import { cn } from '@/lib/cn';
import { useDebounce } from '@/hooks/useDebounce';

export interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  debounceMs?: number;
  'aria-label'?: string;
}

/** A search box that debounces (300ms default) before calling `onChange`. */
export function SearchInput({
  value,
  onChange,
  placeholder = 'Search…',
  className,
  debounceMs = 300,
  'aria-label': ariaLabel = 'Search',
}: SearchInputProps) {
  const [draft, setDraft] = useState(value);
  const debounced = useDebounce(draft, debounceMs);

  useEffect(() => {
    setDraft(value);
  }, [value]);

  useEffect(() => {
    if (debounced !== value) onChange(debounced);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debounced]);

  return (
    <div className={cn('relative', className)}>
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-fg-muted" aria-hidden="true" />
      <input
        type="search"
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        placeholder={placeholder}
        aria-label={ariaLabel}
        className="h-10 w-full rounded-[var(--radius-control)] border border-border bg-surface pl-9 pr-3 text-sm text-fg placeholder:text-fg-muted transition-colors duration-150 ease-out"
      />
    </div>
  );
}
