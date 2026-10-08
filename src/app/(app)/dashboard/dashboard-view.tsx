"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  TrendingUp,
  DollarSign,
  CreditCard,
  AlertTriangle,
  ArrowRight,
  Package,
  ShoppingCart,
  Calendar,
  Percent,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/money";
import { formatDate, getStatusBadgeVariant } from "@/lib/format";
import { useTranslation } from "@/lib/i18n/context";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";

interface DashboardViewProps {
  initialMetrics: any;
  companyCurrency: string;
  canViewProfit: boolean;
  period: string;
}

export function DashboardView({
  initialMetrics,
  companyCurrency,
  canViewProfit,
  period,
}: DashboardViewProps) {
  const router = useRouter();
  const { t } = useTranslation();

  const handlePeriodChange = (p: string) => {
    router.push(`/dashboard?period=${p}`);
  };

  const {
    salesCount,
    totalSales,
    cashCollected,
    totalDebt,
    lowStockCount,
    outOfStockCount,
    trend,
    topProducts,
    recentSales,
    grossProfit,
  } = initialMetrics;

  return (
    <div className="space-y-6">
      {/* Top Header & Range Filter */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            {t.dashboard?.title || "Business Dashboard"}
          </h1>
          <p className="text-sm text-muted-foreground">
            {t.dashboard?.subtitle || "Financial ledger, stock levels, and revenue performance"}
          </p>
        </div>

        <div className="flex items-center gap-1.5 bg-muted p-1 rounded-lg border">
          <Button
            size="sm"
            variant={period === "today" ? "default" : "ghost"}
            onClick={() => handlePeriodChange("today")}
            className="h-8 text-xs font-medium"
          >
            {t.dashboard?.today || "Today"}
          </Button>
          <Button
            size="sm"
            variant={period === "7d" ? "default" : "ghost"}
            onClick={() => handlePeriodChange("7d")}
            className="h-8 text-xs font-medium"
          >
            {t.dashboard?.last7Days || "Last 7 Days"}
          </Button>
          <Button
            size="sm"
            variant={period === "30d" ? "default" : "ghost"}
            onClick={() => handlePeriodChange("30d")}
            className="h-8 text-xs font-medium"
          >
            {t.dashboard?.last30Days || "Last 30 Days"}
          </Button>
        </div>
      </div>

      {/* Bento Grid Layout */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1: Total Sales */}
        <Card className="rounded-card border shadow-sm hover:shadow transition-all">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {t.dashboard?.totalRevenue || "Total Revenue"}
            </CardTitle>
            <ShoppingCart className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tabular-nums">
              {formatCurrency(totalSales, companyCurrency)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              <span className="font-semibold text-foreground">{salesCount}</span> {t.dashboard?.salesCount || "sales recorded"}
            </p>
          </CardContent>
        </Card>

        {/* Metric 2: Cash Collected */}
        <Card className="rounded-card border shadow-sm hover:shadow transition-all">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {t.dashboard?.cashCollected || "Cash Collected"}
            </CardTitle>
            <DollarSign className="h-4 w-4 text-emerald-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tabular-nums text-emerald-600 dark:text-emerald-400">
              {formatCurrency(cashCollected, companyCurrency)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {t.reports?.cashCollected || "Direct cash & debt repayments"}
            </p>
          </CardContent>
        </Card>

        {/* Metric 3: Total Outstanding Debt */}
        <Card className="rounded-card border shadow-sm hover:shadow transition-all">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {t.dashboard?.activeDebts || "Outstanding Customer Debt"}
            </CardTitle>
            <CreditCard className="h-4 w-4 text-rose-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tabular-nums text-rose-600 dark:text-rose-400">
              {formatCurrency(totalDebt, companyCurrency)}
            </div>
            <Link
              href="/debts"
              className="inline-flex items-center text-xs font-medium text-rose-600 hover:underline mt-1 gap-1"
            >
              {t.debts?.title || "Debts & Credit"} <ArrowRight className="h-3 w-3" />
            </Link>
          </CardContent>
        </Card>

        {/* Metric 4: Stock Alerts */}
        <Card className="rounded-card border shadow-sm hover:shadow transition-all">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {t.dashboard?.lowStockAlert || "Stock Warnings"}
            </CardTitle>
            <AlertTriangle className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3">
              <div>
                <span className="text-2xl font-bold tabular-nums text-amber-600">
                  {lowStockCount}
                </span>
                <span className="text-xs text-muted-foreground ml-1">{t.products?.lowStock || "Low"}</span>
              </div>
              <span className="text-muted-foreground">•</span>
              <div>
                <span className="text-2xl font-bold tabular-nums text-rose-600">
                  {outOfStockCount}
                </span>
                <span className="text-xs text-muted-foreground ml-1">{t.products?.outOfStock || "Out"}</span>
              </div>
            </div>
            <Link
              href="/products?stock=low"
              className="inline-flex items-center text-xs font-medium text-primary hover:underline mt-1 gap-1"
            >
              {t.products?.title || "Products"} <ArrowRight className="h-3 w-3" />
            </Link>
          </CardContent>
        </Card>
      </div>

      {/* Gross Profit Bento Card if permitted */}
      {canViewProfit && grossProfit && (
        <Card className="rounded-card border bg-gradient-to-r from-emerald-500/5 via-primary/5 to-transparent shadow-sm">
          <CardContent className="p-6">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div>
                <span className="text-xs font-medium uppercase text-muted-foreground">
                  {t.reports?.revenue || "Revenue"}
                </span>
                <p className="text-xl font-bold tabular-nums mt-0.5">
                  {formatCurrency(grossProfit.revenue, companyCurrency)}
                </p>
              </div>
              <div>
                <span className="text-xs font-medium uppercase text-muted-foreground">
                  {t.reports?.cogs || "Cost of Goods (COGS)"}
                </span>
                <p className="text-xl font-bold tabular-nums mt-0.5 text-muted-foreground">
                  {formatCurrency(grossProfit.cogs, companyCurrency)}
                </p>
              </div>
              <div>
                <span className="text-xs font-medium uppercase text-muted-foreground">
                  {t.reports?.grossProfit || "Gross Profit"}
                </span>
                <p className="text-xl font-bold tabular-nums mt-0.5 text-emerald-600 dark:text-emerald-400">
                  {formatCurrency(grossProfit.profit, companyCurrency)}
                </p>
              </div>
              <div>
                <span className="text-xs font-medium uppercase text-muted-foreground">
                  {t.reports?.margin || "Profit Margin"}
                </span>
                <p className="text-xl font-bold tabular-nums mt-0.5 text-emerald-600 dark:text-emerald-400">
                  {grossProfit.marginPercent}%
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Middle Row: Trend Chart & Top Products */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Sales Trend Chart (Span 2) */}
        <Card className="lg:col-span-2 rounded-card border shadow-sm">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base font-semibold">{t.dashboard?.revenueTrend || "Sales Trend"}</CardTitle>
                <CardDescription className="text-xs">
                  {t.dashboard?.revenueTrendDesc || "Daily revenue trajectory over selected timeframe"}
                </CardDescription>
              </div>
              <TrendingUp className="h-4 w-4 text-primary" />
            </div>
          </CardHeader>
          <CardContent>
            {trend && trend.length > 0 ? (
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={trend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="salesGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.2} />
                    <XAxis
                      dataKey="date"
                      tickLine={false}
                      axisLine={false}
                      tick={{ fontSize: 11 }}
                      tickFormatter={(val) => val.slice(5)}
                    />
                    <YAxis
                      tickLine={false}
                      axisLine={false}
                      tick={{ fontSize: 11 }}
                      tickFormatter={(val) => `${val}`}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        borderColor: "hsl(var(--border))",
                        borderRadius: "8px",
                        fontSize: "12px",
                      }}
                      formatter={(val: any) => [
                        formatCurrency(val, companyCurrency),
                        t.common?.total || "Total",
                      ]}
                    />
                    <Area
                      type="monotone"
                      dataKey="total"
                      stroke="hsl(var(--primary))"
                      strokeWidth={2}
                      fillOpacity={1}
                      fill="url(#salesGrad)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-64 flex flex-col items-center justify-center text-center p-6 text-muted-foreground">
                <ShoppingCart className="h-10 w-10 stroke-1 mb-2 text-muted-foreground/50" />
                <p className="text-sm font-medium">{t.dashboard?.noSalesPeriod || "No sales recorded in this timeframe"}</p>
                <Link href="/sales/new" className="mt-2">
                  <Button size="sm" variant="outline">
                    {t.nav?.newSale || "New Sale"}
                  </Button>
                </Link>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Top 5 Selling Products (Span 1) */}
        <Card className="rounded-card border shadow-sm">
          <CardHeader>
            <CardTitle className="text-base font-semibold">{t.dashboard?.topProducts || "Top Products"}</CardTitle>
            <CardDescription className="text-xs">
              {t.dashboard?.topProductsDesc || "Highest grossing items in this period"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {topProducts && topProducts.length > 0 ? (
              <div className="space-y-4">
                {topProducts.map((p: any, idx: number) => (
                  <div key={p.productId || idx} className="flex items-center justify-between text-sm">
                    <div className="min-w-0 pr-3">
                      <p className="font-medium truncate text-foreground">{p.name}</p>
                      <p className="text-xs text-muted-foreground font-mono">
                        {p.sku} • {p.totalQty} {t.dashboard?.salesCount || "sold"}
                      </p>
                    </div>
                    <div className="text-right font-semibold tabular-nums shrink-0">
                      {formatCurrency(p.totalRevenue, companyCurrency)}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="h-48 flex items-center justify-center text-xs text-muted-foreground">
                {t.dashboard?.noTopProducts || "No product sales yet"}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Bottom Bento: Recent Sales Table */}
      <Card className="rounded-card border shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base font-semibold">{t.dashboard?.recentSales || "Recent Sales Activity"}</CardTitle>
            <CardDescription className="text-xs">
              {t.dashboard?.recentSalesDesc || "Latest transactions recorded across all registers"}
            </CardDescription>
          </div>
          <Link href="/sales">
            <Button variant="outline" size="sm" className="text-xs">
              {t.dashboard?.viewAll || "View All"} <ArrowRight className="ml-1 h-3 w-3" />
            </Button>
          </Link>
        </CardHeader>
        <CardContent>
          {recentSales && recentSales.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-xs uppercase text-muted-foreground font-medium">
                    <th className="text-left pb-2 font-medium">{t.sales?.invoiceNo || "Invoice"}</th>
                    <th className="text-left pb-2 font-medium">{t.sales?.customer || "Customer"}</th>
                    <th className="text-left pb-2 font-medium">{t.common?.date || "Date"}</th>
                    <th className="text-left pb-2 font-medium">{t.common?.status || "Status"}</th>
                    <th className="text-right pb-2 font-medium">{t.common?.total || "Total"}</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {recentSales.map((s: any) => {
                    const statusInfo = getStatusBadgeVariant(s.paymentStatus);
                    return (
                      <tr key={s.id} className="hover:bg-muted/40 transition-colors">
                        <td className="py-2.5 font-mono text-xs font-medium">
                          <Link href={`/sales/${s.id}`} className="hover:underline text-primary">
                            {s.invoiceNo}
                          </Link>
                        </td>
                        <td className="py-2.5 font-medium">{s.customerName}</td>
                        <td className="py-2.5 text-xs text-muted-foreground">
                          {formatDate(s.createdAt)}
                        </td>
                        <td className="py-2.5">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium border ${statusInfo.className}`}
                          >
                            {statusInfo.label}
                          </span>
                        </td>
                        <td className="py-2.5 text-right font-semibold tabular-nums">
                          {formatCurrency(s.total, companyCurrency)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="py-8 text-center text-muted-foreground text-sm">
              {t.common?.noData || "No recent sales found"}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
