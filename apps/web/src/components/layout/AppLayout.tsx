import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';

/** Sidebar + topbar shell with a centered, max-width content area. */
export function AppLayout() {
  const [collapsed, setCollapsed] = useLocalStorage('meditrack-sidebar-collapsed', false);
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-bg">
      <Sidebar
        collapsed={collapsed}
        onToggleCollapsed={() => setCollapsed((prev) => !prev)}
        mobileOpen={mobileOpen}
        onCloseMobile={() => setMobileOpen(false)}
      />
      <div className="flex min-h-screen flex-1 flex-col">
        <Topbar onOpenMobileSidebar={() => setMobileOpen(true)} />
        <main className="flex-1 px-4 py-6 lg:px-6">
          <div className="mx-auto max-w-[1400px]">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
