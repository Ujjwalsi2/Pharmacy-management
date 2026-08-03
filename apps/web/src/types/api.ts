/**
 * Types mirroring `docs/API_CONTRACT.md` exactly. Keep in sync with the
 * contract — this is the single source of truth for the shape of data
 * flowing between the frontend and `@meditrack/api`.
 */

export type Role = 'ADMIN' | 'PHARMACIST';

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  phone: string | null;
  address: string | null;
  dob: string | null;
  salary: number | null;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

/** Subset returned by `GET /users` to non-ADMIN callers (recipient picker). */
export type UserSummary = Pick<User, 'id' | 'name' | 'email' | 'role'>;

export interface Company {
  id: string;
  name: string;
  address: string | null;
  phone: string | null;
  email: string | null;
  drugCount: number;
  createdAt: string;
  updatedAt: string;
}

export type DrugType =
  | 'TABLET'
  | 'CAPSULE'
  | 'SYRUP'
  | 'INJECTION'
  | 'OINTMENT'
  | 'DROPS'
  | 'INHALER'
  | 'OTHER';

export type DrugStatus = 'IN_STOCK' | 'LOW_STOCK' | 'EXPIRING_SOON' | 'OUT_OF_STOCK' | 'EXPIRED';

export interface Drug {
  id: string;
  name: string;
  barcode: string;
  type: DrugType;
  dose: string;
  code: string;
  costPrice: number;
  sellingPrice: number;
  companyId: string;
  company: { id: string; name: string };
  productionDate: string;
  expirationDate: string;
  place: string;
  quantity: number;
  reorderLevel: number;
  status: DrugStatus;
  createdAt: string;
  updatedAt: string;
}

export interface DrugAlerts {
  lowStock: Drug[];
  expiringSoon: Drug[];
  expired: Drug[];
}

export interface PurchaseItem {
  id: string;
  drugId: string;
  drug: { id: string; name: string; barcode: string };
  quantity: number;
  unitCost: number;
  amount: number;
}

export interface Purchase {
  id: string;
  reference: string;
  companyId: string;
  company: { id: string; name: string };
  userId: string;
  user: { id: string; name: string };
  notes: string | null;
  total: number;
  items: PurchaseItem[];
  createdAt: string;
}

export interface CreatePurchaseInput {
  companyId: string;
  notes?: string;
  items: { drugId: string; quantity: number; unitCost: number }[];
}

export type PaymentMode = 'CASH' | 'CARD' | 'UPI';

export interface SaleItem {
  id: string;
  drugId: string;
  name: string;
  barcode: string;
  dose: string;
  quantity: number;
  unitPrice: number;
  amount: number;
}

export interface Sale {
  id: string;
  invoiceNo: string;
  userId: string;
  user: { id: string; name: string };
  customerName: string;
  customerPhone: string;
  paymentMode: PaymentMode;
  subtotal: number;
  discount: number;
  taxRate: number;
  tax: number;
  total: number;
  items: SaleItem[];
  createdAt: string;
}

export interface CreateSaleInput {
  customerName?: string;
  customerPhone?: string;
  paymentMode: PaymentMode;
  discount?: number;
  taxRate?: number;
  items: { drugId: string; quantity: number }[];
}

export interface Message {
  id: string;
  fromUser: { id: string; name: string };
  toUser: { id: string; name: string };
  body: string;
  readAt: string | null;
  createdAt: string;
}

export interface UnreadCount {
  count: number;
}

export interface RevenueTrendPoint {
  date: string;
  revenue: number;
  orders: number;
}

export interface TopDrugSummary {
  drugId: string;
  name: string;
  units: number;
  revenue: number;
}

export interface RecentSale {
  id: string;
  invoiceNo: string;
  customerName: string;
  total: number;
  createdAt: string;
}

export interface DashboardSummary {
  revenueToday: number;
  revenueMonth: number;
  ordersToday: number;
  ordersMonth: number;
  drugCount: number;
  companyCount: number;
  userCount: number;
  inventoryValue: number;
  alerts: { lowStock: number; expiringSoon: number; expired: number };
  revenueTrend: RevenueTrendPoint[];
  topDrugs: TopDrugSummary[];
  recentSales: RecentSale[];
}

export interface SalesReportPoint {
  period: string;
  revenue: number;
  orders: number;
  units: number;
}

export interface SalesReport {
  data: SalesReportPoint[];
  totals: { revenue: number; orders: number; units: number };
}

export interface TopDrugsReport {
  data: TopDrugSummary[];
}

export interface InventoryValueByType {
  type: DrugType;
  units: number;
  costValue: number;
  retailValue: number;
}

export interface InventoryValueReport {
  costValue: number;
  retailValue: number;
  potentialProfit: number;
  byType: InventoryValueByType[];
}

export interface HealthResponse {
  status: 'ok';
  uptime: number;
}

export interface Paginated<T> {
  data: T[];
  page: number;
  pageSize: number;
  total: number;
}

export interface ListQuery {
  page?: number;
  pageSize?: number;
  search?: string;
  sort?: string;
}

export interface ApiErrorPayload {
  error: {
    code:
      | 'VALIDATION_ERROR'
      | 'UNAUTHORIZED'
      | 'FORBIDDEN'
      | 'NOT_FOUND'
      | 'CONFLICT'
      | 'INSUFFICIENT_STOCK'
      | 'INTERNAL';
    message: string;
    details?: unknown;
  };
}
