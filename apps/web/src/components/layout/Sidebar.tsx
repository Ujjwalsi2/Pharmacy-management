import { ChevronsLeft, Pill, X } from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { cn } from '@/lib/cn';
import { useAuth } from '@/features/auth/useAuth';
import { NAV_GROUPS } from './nav';

export interface SidebarProps {
  collapsed: boolean;
  onToggleCollapsed: () => void;
  mobileOpen: boolean;
  onCloseMobile: () => void;
}

function SidebarContent({ collapsed, onToggleCollapsed, onCloseMobile }: {
  collapsed: boolean;
  onToggleCollapsed: () => void;
  onCloseMobile?: () => void;
}) {
  const { user } = useAuth();

  return (
    <div className="flex h-full flex-col bg-surface">
      <div className={cn('flex h-16 items-center gap-2 border-b border-border px-4', collapsed && 'justify-center px-0')}>
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-fg">
          <Pill className="h-[18px] w-[18px]" aria-hidden="true" />
        </span>
        {!collapsed && <span className="text-base font-semibold text-fg">MediTrack</span>}
        {onCloseMobile && (
          <button
            type="button"
            onClick={onCloseMobile}
            aria-label="Close navigation"
            className="ml-auto rounded p-1.5 text-fg-muted hover:bg-surface-muted lg:hidden"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        )}
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4">
        {NAV_GROUPS.map((group) => {
          const items = group.items.filter((item) => !item.roles || (user && item.roles.includes(user.role)));
          if (items.length === 0) return null;
          return (
            <div key={group.label} className="mb-5">
              {!collapsed && (
                <p className="mb-1.5 px-2.5 text-xs font-semibold uppercase tracking-wide text-fg-muted">
                  {group.label}
                </p>
              )}
              <ul className="space-y-0.5">
                {items.map((item) => (
                  <li key={item.to}>
                    <NavLink
                      to={item.to}
                      end={item.to === '/'}
                      onClick={onCloseMobile}
                      className={({ isActive }) =>
                        cn(
                          'group relative flex items-center gap-3 rounded-[var(--radius-control)] px-2.5 py-2 text-sm font-medium transition-colors duration-150 ease-out',
                          isActive
                            ? 'bg-primary/10 text-primary'
                            : 'text-fg-muted hover:bg-surface-muted hover:text-fg',
                          collapsed && 'justify-center px-0',
                        )
                      }
                    >
                      {({ isActive }) => (
                        <>
                          {isActive && (
                            <span className="absolute left-0 top-1 h-[calc(100%-8px)] w-[3px] rounded-full bg-primary" aria-hidden="true" />
                          )}
                          <item.icon className="h-[18px] w-[18px] shrink-0" aria-hidden="true" />
                          {!collapsed && <span>{item.label}</span>}
                        </>
                      )}
                    </NavLink>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </nav>

      <div className="border-t border-border p-3">
        <button
          type="button"
          onClick={onToggleCollapsed}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          className="hidden w-full items-center justify-center gap-2 rounded-[var(--radius-control)] px-2.5 py-2 text-sm text-fg-muted hover:bg-surface-muted hover:text-fg lg:flex"
        >
          <ChevronsLeft className={cn('h-4 w-4 transition-transform duration-150 ease-out', collapsed && 'rotate-180')} aria-hidden="true" />
          {!collapsed && <span>Collapse</span>}
        </button>
      </div>
    </div>
  );
}

export function Sidebar({ collapsed, onToggleCollapsed, mobileOpen, onCloseMobile }: SidebarProps) {
  return (
    <>
      <aside
        className={cn(
          'sticky top-0 hidden h-screen shrink-0 border-r border-border transition-[width] duration-200 ease-out lg:block',
          collapsed ? 'w-[72px]' : 'w-[260px]',
        )}
      >
        <SidebarContent collapsed={collapsed} onToggleCollapsed={onToggleCollapsed} />
      </aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-40 flex lg:hidden">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onCloseMobile} aria-hidden="true" />
          <div className="relative z-10 h-full w-[260px] border-r border-border shadow-[var(--shadow-card)]">
            <SidebarContent collapsed={false} onToggleCollapsed={onToggleCollapsed} onCloseMobile={onCloseMobile} />
          </div>
        </div>
      )}
    </>
  );
}
