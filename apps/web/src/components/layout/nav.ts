import {
  BarChart3,
  Building2,
  LayoutDashboard,
  Mail,
  Package,
  Receipt,
  ScanLine,
  Settings,
  ShoppingCart,
  Users,
  type LucideIcon,
} from 'lucide-react';
import type { Role } from '@/types/api';

export interface NavItem {
  label: string;
  to: string;
  icon: LucideIcon;
  roles?: Role[];
}

export interface NavGroup {
  label: string;
  items: NavItem[];
}

export const NAV_GROUPS: NavGroup[] = [
  {
    label: 'Overview',
    items: [{ label: 'Dashboard', to: '/', icon: LayoutDashboard }],
  },
  {
    label: 'Operations',
    items: [
      { label: 'Point of Sale', to: '/pos', icon: ScanLine },
      { label: 'Sales', to: '/sales', icon: ShoppingCart },
      { label: 'Purchases', to: '/purchases', icon: Receipt },
      { label: 'Messages', to: '/messages', icon: Mail },
    ],
  },
  {
    label: 'Catalog',
    items: [
      { label: 'Inventory', to: '/inventory', icon: Package },
      { label: 'Companies', to: '/companies', icon: Building2 },
    ],
  },
  {
    label: 'Admin',
    items: [
      { label: 'Reports', to: '/reports', icon: BarChart3 },
      { label: 'Users', to: '/users', icon: Users, roles: ['ADMIN'] },
      { label: 'Settings', to: '/settings', icon: Settings },
    ],
  },
];
