import { prisma } from '../prisma.js';
import { round2 } from '../lib/money.js';

interface SalesReportRow {
  period: string;
  revenue: number | null;
  orders: number | bigint | null;
  units: number | bigint | null;
}

export interface ReportRange {
  from?: string;
  to?: string;
}

function resolveRange(range: ReportRange) {
  const to = range.to ? new Date(range.to) : new Date();
  const from = range.from ? new Date(range.from) : new Date(to.getTime() - 30 * 24 * 60 * 60 * 1000);
  return { from, to };
}

function usingSQLite(): boolean {
  return (process.env.DATABASE_URL ?? '').startsWith('file:');
}

export async function getSalesReport(range: ReportRange, groupBy: 'day' | 'month') {
  const { from, to } = resolveRange(range);
  const isSQLite = usingSQLite();

  const rows = isSQLite
    ? await prisma.$queryRawUnsafe<SalesReportRow[]>(
        groupBy === 'month'
          ? `SELECT strftime('%Y-%m', createdAt / 1000, 'unixepoch') as period,
                    SUM(s.total) as revenue, COUNT(DISTINCT s.id) as orders,
                    COALESCE(SUM(si.quantity), 0) as units
             FROM sales s
             LEFT JOIN sale_items si ON si.saleId = s.id
             WHERE s.createdAt >= ? AND s.createdAt <= ?
             GROUP BY period ORDER BY period ASC`
          : `SELECT strftime('%Y-%m-%d', createdAt / 1000, 'unixepoch') as period,
                    SUM(s.total) as revenue, COUNT(DISTINCT s.id) as orders,
                    COALESCE(SUM(si.quantity), 0) as units
             FROM sales s
             LEFT JOIN sale_items si ON si.saleId = s.id
             WHERE s.createdAt >= ? AND s.createdAt <= ?
             GROUP BY period ORDER BY period ASC`,
        from.getTime(),
        to.getTime()
      )
    : await prisma.$queryRawUnsafe<SalesReportRow[]>(
        groupBy === 'month'
          ? `SELECT TO_CHAR(s."createdAt"::date, 'YYYY-MM') as period,
                    SUM(s.total) as revenue, COUNT(DISTINCT s.id) as orders,
                    COALESCE(SUM(si.quantity), 0) as units
             FROM sales s
             LEFT JOIN sale_items si ON si."saleId" = s.id
             WHERE s."createdAt" >= $1::timestamp AND s."createdAt" <= $2::timestamp
             GROUP BY period ORDER BY period ASC`
          : `SELECT TO_CHAR(s."createdAt"::date, 'YYYY-MM-DD') as period,
                    SUM(s.total) as revenue, COUNT(DISTINCT s.id) as orders,
                    COALESCE(SUM(si.quantity), 0) as units
             FROM sales s
             LEFT JOIN sale_items si ON si."saleId" = s.id
             WHERE s."createdAt" >= $1::timestamp AND s."createdAt" <= $2::timestamp
             GROUP BY period ORDER BY period ASC`,
        from,
        to
      );

  const data = rows.map((row) => ({
    period: row.period,
    revenue: round2(row.revenue ?? 0),
    orders: Number(row.orders ?? 0),
    units: Number(row.units ?? 0)
  }));

  const totals = data.reduce(
    (acc, row) => ({
      revenue: round2(acc.revenue + row.revenue),
      orders: acc.orders + row.orders,
      units: acc.units + row.units
    }),
    { revenue: 0, orders: 0, units: 0 }
  );

  return { data, totals };
}

interface TopDrugRow {
  drugId: string;
  name: string;
  units: number | bigint | null;
  revenue: number | null;
}

export async function getTopDrugsReport(range: ReportRange, limit: number) {
  const { from, to } = resolveRange(range);
  const isSQLite = usingSQLite();

  const rows = isSQLite
    ? await prisma.$queryRawUnsafe<TopDrugRow[]>(
        `SELECT si.drugId as drugId, d.name as name,
                SUM(si.quantity) as units, SUM(si.amount) as revenue
         FROM sale_items si
         JOIN sales s ON s.id = si.saleId
         JOIN drugs d ON d.id = si.drugId
         WHERE s.createdAt >= ? AND s.createdAt <= ?
         GROUP BY si.drugId, d.name
         ORDER BY revenue DESC LIMIT ?`,
        from.getTime(),
        to.getTime(),
        limit
      )
    : await prisma.$queryRawUnsafe<TopDrugRow[]>(
        `SELECT si."drugId" as "drugId", d.name as name,
                SUM(si.quantity) as units, SUM(si.amount) as revenue
         FROM sale_items si
         JOIN sales s ON s.id = si."saleId"
         JOIN drugs d ON d.id = si."drugId"
         WHERE s."createdAt" >= $1::timestamp AND s."createdAt" <= $2::timestamp
         GROUP BY si."drugId", d.name
         ORDER BY revenue DESC LIMIT $3`,
        from,
        to,
        limit
      );

  return {
    data: rows.map((row) => ({
      drugId: row.drugId,
      name: row.name,
      units: Number(row.units ?? 0),
      revenue: round2(row.revenue ?? 0)
    }))
  };
}

interface InventoryByTypeRow {
  type: string;
  units: number | bigint | null;
  costValue: number | null;
  retailValue: number | null;
}

export async function getInventoryValueReport() {
  const isSQLite = usingSQLite();

  const rows = isSQLite
    ? await prisma.$queryRaw<InventoryByTypeRow[]>`
        SELECT type as type,
               SUM(quantity) as units,
               SUM(quantity * costPrice) as costValue,
               SUM(quantity * sellingPrice) as retailValue
        FROM drugs
        GROUP BY type ORDER BY type ASC
      `
    : await prisma.$queryRaw<InventoryByTypeRow[]>`
        SELECT type as type,
               SUM(quantity) as units,
               SUM(quantity * "costPrice") as "costValue",
               SUM(quantity * "sellingPrice") as "retailValue"
        FROM drugs
        GROUP BY type ORDER BY type ASC
      `;

  const byType = rows.map((row) => ({
    type: row.type,
    units: Number(row.units ?? 0),
    costValue: round2(row.costValue ?? 0),
    retailValue: round2(row.retailValue ?? 0)
  }));

  const costValue = round2(byType.reduce((sum, row) => sum + row.costValue, 0));
  const retailValue = round2(byType.reduce((sum, row) => sum + row.retailValue, 0));
  const potentialProfit = round2(retailValue - costValue);

  return { costValue, retailValue, potentialProfit, byType };
}
