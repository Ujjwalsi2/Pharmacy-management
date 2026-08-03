import { createContext, useContext, useId, useState } from 'react';
import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

interface TabsContextValue {
  value: string;
  setValue: (value: string) => void;
  baseId: string;
}

const TabsContext = createContext<TabsContextValue | null>(null);

function useTabsContext(component: string): TabsContextValue {
  const ctx = useContext(TabsContext);
  if (!ctx) throw new Error(`<${component}> must be used within <Tabs>`);
  return ctx;
}

export interface TabsProps {
  defaultValue: string;
  value?: string;
  onValueChange?: (value: string) => void;
  children: ReactNode;
  className?: string;
}

export function Tabs({ defaultValue, value, onValueChange, children, className }: TabsProps) {
  const [internalValue, setInternalValue] = useState(defaultValue);
  const baseId = useId();
  const active = value ?? internalValue;
  const setValue = (next: string) => {
    setInternalValue(next);
    onValueChange?.(next);
  };

  return (
    <TabsContext.Provider value={{ value: active, setValue, baseId }}>
      <div className={className}>{children}</div>
    </TabsContext.Provider>
  );
}

export function TabsList({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div role="tablist" className={cn('inline-flex items-center gap-1 rounded-[var(--radius-control)] bg-surface-muted p-1', className)}>
      {children}
    </div>
  );
}

export function TabsTrigger({ value: tabValue, children }: { value: string; children: ReactNode }) {
  const { value, setValue, baseId } = useTabsContext('TabsTrigger');
  const isActive = value === tabValue;
  return (
    <button
      type="button"
      role="tab"
      id={`${baseId}-tab-${tabValue}`}
      aria-selected={isActive}
      aria-controls={`${baseId}-panel-${tabValue}`}
      tabIndex={isActive ? 0 : -1}
      onClick={() => setValue(tabValue)}
      className={cn(
        'rounded-[calc(var(--radius-control)-2px)] px-3 py-1.5 text-sm font-medium transition-colors duration-150 ease-out',
        isActive ? 'bg-surface text-fg shadow-sm' : 'text-fg-muted hover:text-fg',
      )}
    >
      {children}
    </button>
  );
}

export function TabsContent({ value: tabValue, children }: { value: string; children: ReactNode }) {
  const { value, baseId } = useTabsContext('TabsContent');
  if (value !== tabValue) return null;
  return (
    <div role="tabpanel" id={`${baseId}-panel-${tabValue}`} aria-labelledby={`${baseId}-tab-${tabValue}`} className="mt-4">
      {children}
    </div>
  );
}
