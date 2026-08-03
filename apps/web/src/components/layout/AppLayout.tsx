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
      {/* `min-w-0` is required: without it this flex child defaults to
          `min-width: auto`, so a wide table stretches the whole page and
          causes horizontal overflow on small screens instead of scrolling
          inside its own container. */}
      <div className="flex min-h-screen min-w-0 flex-1 flex-col">
        <Topbar onOpenMobileSidebar={() => setMobileOpen(true)} />
        <main className="min-w-0 flex-1 px-4 py-6 lg:px-6">
          <div className="mx-auto min-w-0 max-w-[1400px]">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
