import { prisma } from '../prisma.js';
import { getAlerts } from './drugService.js';
import { round2 } from '../lib/money.js';

const TREND_WINDOW_DAYS = 30;

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function toDayKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function usingSQLite(): boolean {
  return (process.env.DATABASE_URL ?? '').startsWith('file:');
}

interface RevenueTrendRow {
  day: string;
  revenue: number | null;
  orders: number | bigint | null;
}

interface TopDrugRow {
  drugId: string;
  name: string;
  units: number | bigint | null;
  revenue: number | null;
}

export async function getDashboardSummary() {
  const now = new Date();
  const today = startOfDay(now);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const monthStart = startOfMonth(now);
  const trendStart = new Date(today);
  trendStart.setDate(trendStart.getDate() - (TREND_WINDOW_DAYS - 1));

  const isSQLite = usingSQLite();

  const [
    revenueTodayAgg,
    revenueMonthAgg,
    drugCount,
    companyCount,
    userCount,
    alerts,
    trendRows,
    topDrugRows,
    recentSales,
    inventoryAgg
  ] = await Promise.all([
    prisma.sale.aggregate({
      where: { createdAt: { gte: today, lt: tomorrow } },
      _sum: { total: true },
      _count: true
    }),
    prisma.sale.aggregate({
      where: { createdAt: { gte: monthStart } },
      _sum: { total: true },
      _count: true
    }),
    prisma.drug.count(),
    prisma.company.count(),
    prisma.user.count({ where: { active: true } }),
    getAlerts(),
    // Revenue trend: use provider-agnostic SQL depending on dialect.
    isSQLite
      ? (prisma.$queryRawUnsafe<RevenueTrendRow[]>(
          `SELECT strftime('%Y-%m-%d', createdAt / 1000, 'unixepoch') as day,
                  SUM(total) as revenue, COUNT(*) as orders
           FROM sales
           WHERE createdAt >= ?
           GROUP BY day ORDER BY day ASC`,
          trendStart.getTime()
        ) as Promise<RevenueTrendRow[]>)
      : (prisma.$queryRawUnsafe<RevenueTrendRow[]>(
          `SELECT TO_CHAR("createdAt"::date, 'YYYY-MM-DD') as day,
                  SUM(total) as revenue, COUNT(*) as orders
           FROM sales
           WHERE "createdAt" >= $1::timestamp
           GROUP BY "createdAt"::date ORDER BY "createdAt"::date ASC`,
          trendStart
        ) as Promise<RevenueTrendRow[]>),
    // Top drugs: same approach.
    isSQLite
      ? (prisma.$queryRawUnsafe<TopDrugRow[]>(
          `SELECT si.drugId as drugId, d.name as name,
                  SUM(si.quantity) as units, SUM(si.amount) as revenue
           FROM sale_items si
           JOIN sales s ON s.id = si.saleId
           JOIN drugs d ON d.id = si.drugId
           WHERE s.createdAt >= ?
           GROUP BY si.drugId, d.name
           ORDER BY revenue DESC LIMIT 5`,
          trendStart.getTime()
        ) as Promise<TopDrugRow[]>)
      : (prisma.$queryRawUnsafe<TopDrugRow[]>(
          `SELECT si."drugId" as "drugId", d.name as name,
                  SUM(si.quantity) as units, SUM(si.amount) as revenue
           FROM sale_items si
           JOIN sales s ON s.id = si."saleId"
           JOIN drugs d ON d.id = si."drugId"
           WHERE s."createdAt" >= $1::timestamp
           GROUP BY si."drugId", d.name
           ORDER BY revenue DESC LIMIT 5`,
          trendStart
        ) as Promise<TopDrugRow[]>),
    prisma.sale.findMany({
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: { id: true, invoiceNo: true, customerName: true, total: true, createdAt: true }
    }),
    isSQLite
      ? (prisma.$queryRawUnsafe<Array<{ costValue: number | null; retailValue: number | null }>>(
          `SELECT SUM(quantity * costPrice) as costValue, SUM(quantity * sellingPrice) as retailValue FROM drugs`
        ) as Promise<Array<{ costValue: number | null; retailValue: number | null }>>)
      : (prisma.$queryRawUnsafe<Array<{ costValue: number | null; retailValue: number | null }>>(
          `SELECT SUM(quantity * "costPrice") as "costValue", SUM(quantity * "sellingPrice") as "retailValue" FROM drugs`
        ) as Promise<Array<{ costValue: number | null; retailValue: number | null }>>)
  ]);

  const trendMap = new Map<string, { revenue: number; orders: number }>();
  for (const row of trendRows) {
    trendMap.set(row.day, { revenue: round2(row.revenue ?? 0), orders: Number(row.orders ?? 0) });
  }

  const revenueTrend: Array<{ date: string; revenue: number; orders: number }> = [];
  for (let i = 0; i < TREND_WINDOW_DAYS; i++) {
    const d = new Date(trendStart);
    d.setDate(d.getDate() + i);
    const key = toDayKey(d);
    const entry = trendMap.get(key) ?? { revenue: 0, orders: 0 };
    revenueTrend.push({ date: key, revenue: entry.revenue, orders: entry.orders });
  }

  const topDrugs = topDrugRows.map((row) => ({
    drugId: row.drugId,
    name: row.name,
    units: Number(row.units ?? 0),
    revenue: round2(row.revenue ?? 0)
  }));

  const inventoryValue = isSQLite
    ? round2((inventoryAgg as Array<{ costValue: number | null }>)[0]?.costValue ?? 0)
    : round2((inventoryAgg as Array<{ costValue: number | null }>)[0]?.costValue ?? 0);

  return {
    revenueToday: round2(revenueTodayAgg._sum.total ?? 0),
    revenueMonth: round2(revenueMonthAgg._sum.total ?? 0),
    ordersToday: revenueTodayAgg._count,
    ordersMonth: revenueMonthAgg._count,
    drugCount,
    companyCount,
    userCount,
    inventoryValue,
    alerts: {
      lowStock: alerts.lowStock.length,
      expiringSoon: alerts.expiringSoon.length,
      expired: alerts.expired.length
    },
    revenueTrend,
    topDrugs,
    recentSales: recentSales.map((s) => ({
      id: s.id,
      invoiceNo: s.invoiceNo,
      customerName: s.customerName,
      total: s.total,
      createdAt: s.createdAt
    }))
  };
}
