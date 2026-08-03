import { useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Bell, Key, LogOut, Menu, Monitor, Moon, Search, Sun, User as UserIcon } from 'lucide-react';
import { cn } from '@/lib/cn';
import { useAuth } from '@/features/auth/useAuth';
import { useUnreadMessageCount } from '@/features/messages/api';
import { NAV_GROUPS } from './nav';
import { useTheme } from './useTheme';
import { CommandPalette } from './CommandPalette';
import { ChangePasswordModal } from './ChangePasswordModal';

export interface TopbarProps {
  onOpenMobileSidebar: () => void;
}

const THEME_OPTIONS = [
  { value: 'light', label: 'Light', icon: Sun },
  { value: 'dark', label: 'Dark', icon: Moon },
  { value: 'system', label: 'System', icon: Monitor },
] as const;

export function Topbar({ onOpenMobileSidebar }: TopbarProps) {
  const location = useLocation();
  const { user, logout } = useAuth();
  const { theme, setTheme } = useTheme();
  const { data: unread } = useUnreadMessageCount();
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [themeMenuOpen, setThemeMenuOpen] = useState(false);
  const [passwordModalOpen, setPasswordModalOpen] = useState(false);

  const pageTitle = useMemo(() => {
    const allItems = NAV_GROUPS.flatMap((group) => group.items);
    const match = allItems.find((item) => (item.to === '/' ? location.pathname === '/' : location.pathname.startsWith(item.to)));
    return match?.label ?? 'MediTrack';
  }, [location.pathname]);

  const ThemeIcon = THEME_OPTIONS.find((option) => option.value === theme)?.icon ?? Monitor;
  const unreadCount = unread?.count ?? 0;

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setPaletteOpen(true);
      }
    }
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, []);

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-border bg-surface/95 px-4 backdrop-blur supports-[backdrop-filter]:bg-surface/75 lg:px-6">
      <button
        type="button"
        onClick={onOpenMobileSidebar}
        aria-label="Open navigation"
        className="rounded-[var(--radius-control)] p-2 text-fg-muted hover:bg-surface-muted lg:hidden"
      >
        <Menu className="h-5 w-5" aria-hidden="true" />
      </button>

      <div className="min-w-0 flex-1">
        <nav aria-label="Breadcrumb" className="truncate text-xs text-fg-muted">
          MediTrack / <span className="text-fg">{pageTitle}</span>
        </nav>
        <h1 className="truncate text-base font-semibold text-fg">{pageTitle}</h1>
      </div>

      <button
        type="button"
        onClick={() => setPaletteOpen(true)}
        className="hidden items-center gap-2 rounded-[var(--radius-control)] border border-border bg-surface-muted px-3 py-1.5 text-sm text-fg-muted hover:text-fg sm:flex"
      >
        <Search className="h-4 w-4" aria-hidden="true" />
        Search
        <kbd className="ml-2 rounded border border-border bg-surface px-1.5 py-0.5 text-xs">⌘K</kbd>
      </button>
      <button
        type="button"
        onClick={() => setPaletteOpen(true)}
        aria-label="Open search"
        className="rounded-[var(--radius-control)] p-2 text-fg-muted hover:bg-surface-muted sm:hidden"
      >
        <Search className="h-5 w-5" aria-hidden="true" />
      </button>

      <div className="relative">
        <button
          type="button"
          onClick={() => setThemeMenuOpen((prev) => !prev)}
          aria-label="Change theme"
          aria-expanded={themeMenuOpen}
          className="rounded-[var(--radius-control)] p-2 text-fg-muted hover:bg-surface-muted"
        >
          <ThemeIcon className="h-5 w-5" aria-hidden="true" />
        </button>
        {themeMenuOpen && (
          <div
            role="menu"
            className="absolute right-0 top-full z-40 mt-2 w-36 overflow-hidden rounded-[var(--radius-control)] border border-border bg-surface py-1 shadow-[var(--shadow-card)]"
            onMouseLeave={() => setThemeMenuOpen(false)}
          >
            {THEME_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                role="menuitem"
                onClick={() => {
                  setTheme(option.value);
                  setThemeMenuOpen(false);
                }}
                className={cn(
                  'flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-surface-muted',
                  theme === option.value ? 'text-primary' : 'text-fg',
                )}
              >
                <option.icon className="h-4 w-4" aria-hidden="true" />
                {option.label}
              </button>
            ))}
          </div>
        )}
      </div>

      <a
        href="/messages"
        aria-label={`Messages${unreadCount > 0 ? `, ${unreadCount} unread` : ''}`}
        className="relative rounded-[var(--radius-control)] p-2 text-fg-muted hover:bg-surface-muted"
      >
        <Bell className="h-5 w-5" aria-hidden="true" />
        {unreadCount > 0 && (
          <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-danger px-1 text-[10px] font-semibold text-white">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </a>

      <div className="relative">
        <button
          type="button"
          onClick={() => setUserMenuOpen((prev) => !prev)}
          aria-label="Open account menu"
          aria-expanded={userMenuOpen}
          className="flex items-center gap-2 rounded-full border border-border p-1 pr-2.5 hover:bg-surface-muted"
        >
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
            {user?.name?.slice(0, 1).toUpperCase() ?? <UserIcon className="h-4 w-4" aria-hidden="true" />}
          </span>
          <span className="hidden text-sm font-medium text-fg sm:inline">{user?.name}</span>
        </button>
        {userMenuOpen && (
          <div
            role="menu"
            className="absolute right-0 top-full z-40 mt-2 w-52 overflow-hidden rounded-[var(--radius-control)] border border-border bg-surface py-1 shadow-[var(--shadow-card)]"
            onMouseLeave={() => setUserMenuOpen(false)}
          >
            <div className="border-b border-border px-3 py-2">
              <p className="truncate text-sm font-medium text-fg">{user?.name}</p>
              <p className="truncate text-xs text-fg-muted">{user?.email}</p>
            </div>
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setPasswordModalOpen(true);
                setUserMenuOpen(false);
              }}
              className="flex w-full items-center gap-2 px-3 py-2 text-sm text-fg hover:bg-surface-muted"
            >
              <Key className="h-4 w-4" aria-hidden="true" />
              Change password
            </button>
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setUserMenuOpen(false);
                void logout();
              }}
              className="flex w-full items-center gap-2 px-3 py-2 text-sm text-danger hover:bg-surface-muted"
            >
              <LogOut className="h-4 w-4" aria-hidden="true" />
              Log out
            </button>
          </div>
        )}
      </div>

      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />
      <ChangePasswordModal open={passwordModalOpen} onClose={() => setPasswordModalOpen(false)} />
    </header>
  );
}
