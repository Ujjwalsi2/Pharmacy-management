import type { ReactNode } from 'react';
import { ArrowDown, ArrowUp, ChevronsUpDown } from 'lucide-react';
import { cn } from '@/lib/cn';

export interface TableColumn<T> {
  /** Unique key for the column; also used as the sort field when `sortable` is set. */
  key: string;
  header: string;
  align?: 'left' | 'right' | 'center';
  sortable?: boolean;
  /** Custom cell renderer; defaults to reading `row[key as keyof T]`. */
  render?: (row: T) => ReactNode;
  className?: string;
}

export interface TableProps<T> {
  columns: TableColumn<T>[];
  data: T[];
  getRowKey: (row: T, index: number) => string;
  sortField?: string | null;
  sortDirection?: 'asc' | 'desc' | null;
  onSort?: (key: string) => void;
  onRowClick?: (row: T) => void;
  /** Right-aligned per-row action menu/content, rendered as a trailing column. */
  rowActions?: (row: T) => ReactNode;
  className?: string;
}

const ALIGN_CLASSES: Record<NonNullable<TableColumn<unknown>['align']>, string> = {
  left: 'text-left',
  right: 'text-right',
  center: 'text-center',
};

export function Table<T>({
  columns,
  data,
  getRowKey,
  sortField,
  sortDirection,
  onSort,
  onRowClick,
  rowActions,
  className,
}: TableProps<T>) {
  return (
    <div className={cn('overflow-x-auto rounded-[var(--radius-card)] border border-border', className)}>
      <table className="w-full min-w-full border-collapse text-sm">
        <thead className="sticky top-0 z-10 bg-surface-muted">
          <tr>
            {columns.map((column) => {
              const align = column.align ?? 'left';
              const isSorted = sortField === column.key;
              return (
                <th
                  key={column.key}
                  scope="col"
                  className={cn(
                    'whitespace-nowrap px-4 py-3 text-xs font-semibold uppercase tracking-wide text-fg-muted',
                    ALIGN_CLASSES[align],
                    column.className,
                  )}
                  aria-sort={isSorted ? (sortDirection === 'desc' ? 'descending' : 'ascending') : 'none'}
                >
                  {column.sortable ? (
                    <button
                      type="button"
                      onClick={() => onSort?.(column.key)}
                      className={cn(
                        'inline-flex items-center gap-1 rounded text-xs font-semibold uppercase tracking-wide text-fg-muted hover:text-fg',
                        align === 'right' && 'flex-row-reverse',
                      )}
                    >
                      {column.header}
                      {isSorted ? (
                        sortDirection === 'desc' ? (
                          <ArrowDown className="h-3.5 w-3.5" aria-hidden="true" />
                        ) : (
                          <ArrowUp className="h-3.5 w-3.5" aria-hidden="true" />
                        )
                      ) : (
                        <ChevronsUpDown className="h-3.5 w-3.5 opacity-50" aria-hidden="true" />
                      )}
                    </button>
                  ) : (
                    column.header
                  )}
                </th>
              );
            })}
            {rowActions && <th scope="col" className="px-4 py-3" />}
          </tr>
        </thead>
        <tbody>
          {data.map((row, index) => (
            <tr
              key={getRowKey(row, index)}
              onClick={onRowClick ? () => onRowClick(row) : undefined}
              className={cn(
                'border-t border-border transition-colors duration-150 ease-out hover:bg-surface-muted/60',
                onRowClick && 'cursor-pointer',
              )}
            >
              {columns.map((column) => (
                <td
                  key={column.key}
                  className={cn(
                    'px-4 py-3 text-fg',
                    ALIGN_CLASSES[column.align ?? 'left'],
                    column.className,
                  )}
                >
                  {column.render ? column.render(row) : String(row[column.key as keyof T] ?? '')}
                </td>
              ))}
              {rowActions && (
                <td className="px-4 py-3 text-right" onClick={(event) => event.stopPropagation()}>
                  {rowActions(row)}
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
