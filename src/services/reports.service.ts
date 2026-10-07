import { db } from "@/db";
import {
  sales,
  saleItems,
  payments,
  products,
  customers,
  stockMovements,
  company,
  users,
} from "@/db/schema";
import { eq, and, sql, desc, asc, lte, gt } from "drizzle-orm";
import { fromCents, toCents } from "@/lib/money";

export interface DashboardMetricsParams {
  period?: "today" | "7d" | "30d" | "all" | "custom";
  fromDate?: Date | string;
  toDate?: Date | string;
  canViewProfit?: boolean;
}

export async function getDashboardMetrics(params: DashboardMetricsParams = {}) {
  const now = new Date();
  let start = new Date();

  if (params.period === "today") {
    start.setHours(0, 0, 0, 0);
  } else if (params.period === "7d") {
    start.setDate(now.getDate() - 7);
  } else if (params.period === "30d") {
    start.setDate(now.getDate() - 30);
  } else if (params.period === "custom" && params.fromDate) {
    start = new Date(params.fromDate);
  } else {
    // Default 30d
    start.setDate(now.getDate() - 30);
  }

  const end = params.toDate ? new Date(params.toDate) : new Date();
  if (params.toDate) end.setHours(23, 59, 59, 999);

  // 1. Sales metrics for period
  const salesQuery = await db.execute(sql`
    SELECT 
      COUNT(id)::int as sales_count,
      COALESCE(SUM(total), 0.00)::numeric(14,2) as total_sales,
      COALESCE(SUM(amount_paid), 0.00)::numeric(14,2) as total_paid,
      COALESCE(SUM(balance_due), 0.00)::numeric(14,2) as total_unpaid
    FROM sales
    WHERE status != 'voided'
      AND created_at >= ${start.toISOString()} AND created_at <= ${end.toISOString()}
  `);

  const sMetrics = salesQuery[0] as any;

  // 2. Total Outstanding Debt (Overall, not just in period)
  const debtQuery = await db.execute(sql`
    SELECT COALESCE(SUM(balance_due), 0.00)::numeric(14,2) as total_debt
    FROM sales
    WHERE status != 'voided' AND balance_due > 0
  `);
  const totalDebt = (debtQuery[0] as any)?.total_debt || "0.00";

  // 3. Cash collected (Payments received in period)
  const cashQuery = await db.execute(sql`
    SELECT COALESCE(SUM(amount), 0.00)::numeric(14,2) as cash_collected
    FROM payments
    WHERE reversed_at IS NULL
      AND paid_at >= ${start.toISOString()} AND paid_at <= ${end.toISOString()}
  `);
  const cashCollected = (cashQuery[0] as any)?.cash_collected || "0.00";

  // 4. Stock counts: low stock and out of stock
  const comp = await db.query.company.findFirst();
  const defaultLowThreshold = comp?.lowStockDefault ?? 5;

  const stockQuery = await db.execute(sql`
    SELECT
      COUNT(CASE WHEN stock_qty <= 0 THEN 1 END)::int as out_of_stock_count,
      COUNT(CASE WHEN stock_qty > 0 AND stock_qty <= COALESCE(low_stock_threshold, ${defaultLowThreshold}) THEN 1 END)::int as low_stock_count
    FROM products
    WHERE is_active = true
  `);
  const stockCounts = stockQuery[0] as any;

  // 5. Sales trend data (grouped by date)
  const trendQuery = await db.execute(sql`
    SELECT 
      TO_CHAR(created_at, 'YYYY-MM-DD') as date,
      COUNT(id)::int as count,
      COALESCE(SUM(total), 0.00)::numeric(14,2) as total
    FROM sales
    WHERE status != 'voided'
      AND created_at >= ${start.toISOString()} AND created_at <= ${end.toISOString()}
    GROUP BY TO_CHAR(created_at, 'YYYY-MM-DD')
    ORDER BY date ASC
  `);

  // 6. Top 5 selling products in period
  const topProductsQuery = await db.execute(sql`
    SELECT 
      si.product_id,
      si.product_name_snapshot as name,
      si.sku_snapshot as sku,
      COALESCE(SUM(si.qty), 0)::numeric(14,3) as total_qty,
      COALESCE(SUM(si.line_total), 0.00)::numeric(14,2) as total_revenue
    FROM sale_items si
    JOIN sales s ON s.id = si.sale_id
    WHERE s.status != 'voided'
      AND s.created_at >= ${start.toISOString()} AND s.created_at <= ${end.toISOString()}
    GROUP BY si.product_id, si.product_name_snapshot, si.sku_snapshot
    ORDER BY total_revenue DESC
    LIMIT 5
  `);

  // 7. Recent sales list
  const recentSales = await db
    .select({
      id: sales.id,
      invoiceNo: sales.invoiceNo,
      customerName: customers.name,
      total: sales.total,
      paymentStatus: sales.paymentStatus,
      createdAt: sales.createdAt,
    })
    .from(sales)
    .innerJoin(customers, eq(sales.customerId, customers.id))
    .where(eq(sales.status, "completed"))
    .orderBy(desc(sales.createdAt))
    .limit(6);

  // 8. Gross profit (if allowed)
  let grossProfit = null;
  if (params.canViewProfit) {
    const profitQuery = await db.execute(sql`
      SELECT 
        COALESCE(SUM(si.line_total), 0.00) as revenue,
        COALESCE(SUM(si.qty * si.unit_cost), 0.00) as cogs
      FROM sale_items si
      JOIN sales s ON s.id = si.sale_id
      WHERE s.status != 'voided'
        AND s.created_at >= ${start.toISOString()} AND s.created_at <= ${end.toISOString()}
    `);
    const p = profitQuery[0] as any;
    const revCents = toCents(p?.revenue || 0);
    const cogsCents = toCents(p?.cogs || 0);
    grossProfit = {
      revenue: fromCents(revCents),
      cogs: fromCents(cogsCents),
      profit: fromCents(revCents - cogsCents),
      marginPercent: revCents > 0 ? (((revCents - cogsCents) / revCents) * 100).toFixed(1) : "0.0",
    };
  }

  return {
    salesCount: Number(sMetrics?.sales_count || 0),
    totalSales: sMetrics?.total_sales || "0.00",
    cashCollected,
    totalDebt,
    lowStockCount: Number(stockCounts?.low_stock_count || 0),
    outOfStockCount: Number(stockCounts?.out_of_stock_count || 0),
    trend: trendQuery.map((t: any) => ({
      date: t.date,
      count: Number(t.count),
      total: Number(t.total),
    })),
    topProducts: topProductsQuery.map((p: any) => ({
      productId: p.product_id,
      name: p.name,
      sku: p.sku,
      totalQty: p.total_qty,
      totalRevenue: p.total_revenue,
    })),
    recentSales,
    grossProfit,
  };
}

export async function getProfitReport(fromDate?: Date | string, toDate?: Date | string) {
  const start = fromDate ? new Date(fromDate) : new Date(Date.now() - 30 * 86400000);
  const end = toDate ? new Date(toDate) : new Date();
  if (toDate) end.setHours(23, 59, 59, 999);

  const rows = await db.execute(sql`
    SELECT 
      TO_CHAR(s.created_at, 'YYYY-MM-DD') as day,
      COUNT(DISTINCT s.id)::int as sales_count,
      COALESCE(SUM(si.line_total), 0.00)::numeric(14,2) as revenue,
      COALESCE(SUM(si.qty * si.unit_cost), 0.00)::numeric(14,2) as cogs,
      COALESCE(SUM(si.line_total - (si.qty * si.unit_cost)), 0.00)::numeric(14,2) as profit
    FROM sales s
    JOIN sale_items si ON si.sale_id = s.id
    WHERE s.status != 'voided'
      AND s.created_at >= ${start.toISOString()} AND s.created_at <= ${end.toISOString()}
    GROUP BY TO_CHAR(s.created_at, 'YYYY-MM-DD')
    ORDER BY day DESC
  `);

  return rows.map((r: any) => {
    const rev = Number(r.revenue);
    const prof = Number(r.profit);
    return {
      day: r.day,
      salesCount: Number(r.sales_count),
      revenue: r.revenue,
      cogs: r.cogs,
      profit: r.profit,
      marginPercent: rev > 0 ? ((prof / rev) * 100).toFixed(1) : "0.0",
    };
  });
}

export async function getStockValuationReport() {
  const rows = await db.execute(sql`
    SELECT 
      p.id,
      p.name,
      p.sku,
      c.name as category_name,
      p.stock_qty,
      p.cost_price,
      p.selling_price,
      (p.stock_qty * p.cost_price)::numeric(14,2) as total_cost_value,
      (p.stock_qty * p.selling_price)::numeric(14,2) as total_retail_value
    FROM products p
    LEFT JOIN categories c ON p.category_id = c.id
    WHERE p.is_active = true
    ORDER BY total_cost_value DESC
  `);

  let totalCostVal = 0;
  let totalRetailVal = 0;

  for (const r of rows as any[]) {
    totalCostVal += toCents(r.total_cost_value);
    totalRetailVal += toCents(r.total_retail_value);
  }

  return {
    items: rows,
    summary: {
      totalCostValue: fromCents(totalCostVal),
      totalRetailValue: fromCents(totalRetailVal),
      potentialProfit: fromCents(totalRetailVal - totalCostVal),
    },
  };
}

export async function getDebtAgingReport() {
  const rows = await db.execute(sql`
    SELECT 
      c.id,
      c.name as customer_name,
      c.phone,
      c.email,
      COALESCE(SUM(s.balance_due), 0.00)::numeric(14,2) as total_owed,
      COALESCE(SUM(CASE WHEN NOW() - s.created_at <= interval '30 days' THEN s.balance_due ELSE 0 END), 0.00)::numeric(14,2) as age_0_30,
      COALESCE(SUM(CASE WHEN NOW() - s.created_at > interval '30 days' AND NOW() - s.created_at <= interval '60 days' THEN s.balance_due ELSE 0 END), 0.00)::numeric(14,2) as age_31_60,
      COALESCE(SUM(CASE WHEN NOW() - s.created_at > interval '60 days' AND NOW() - s.created_at <= interval '90 days' THEN s.balance_due ELSE 0 END), 0.00)::numeric(14,2) as age_61_90,
      COALESCE(SUM(CASE WHEN NOW() - s.created_at > interval '90 days' THEN s.balance_due ELSE 0 END), 0.00)::numeric(14,2) as age_90_plus
    FROM customers c
    JOIN sales s ON s.customer_id = c.id
    WHERE s.status != 'voided' AND s.balance_due > 0
    GROUP BY c.id, c.name, c.phone, c.email
    ORDER BY total_owed DESC
  `);

  return rows;
}
