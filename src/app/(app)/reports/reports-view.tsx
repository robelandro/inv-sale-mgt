"use client";

import * as React from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { formatCurrency, formatQuantity } from "@/lib/money";
import { formatDate } from "@/lib/format";
import { useTranslation } from "@/lib/i18n/context";
import { BarChart3, TrendingUp, DollarSign, Clock, Layers } from "lucide-react";

interface ReportsViewProps {
  profitData: any[];
  valuationData: any;
  agingData: any[];
  currency: string;
}

export function ReportsView({
  profitData,
  valuationData,
  agingData,
  currency,
}: ReportsViewProps) {
  const { t } = useTranslation();

  // Profit Totals
  const totalRev = profitData.reduce((acc, r) => acc + parseFloat(r.revenue || "0"), 0);
  const totalCogs = profitData.reduce((acc, r) => acc + parseFloat(r.cogs || "0"), 0);
  const totalProfit = profitData.reduce((acc, r) => acc + parseFloat(r.profit || "0"), 0);
  const overallMargin = totalRev > 0 ? ((totalProfit / totalRev) * 100).toFixed(1) : "0.0";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{t.reports?.title || "Business Intelligence & Reports"}</h1>
        <p className="text-sm text-muted-foreground">
          {t.reports?.subtitle || "Profit & margin analytics, inventory valuation, and debt aging schedules"}
        </p>
      </div>

      <Tabs defaultValue="profit" className="space-y-4">
        <TabsList className="bg-muted p-1 rounded-lg">
          <TabsTrigger value="profit" className="text-xs">
            <TrendingUp className="w-3.5 h-3.5 mr-1.5" /> {t.reports?.profitReport || "Profit & Margins"}
          </TabsTrigger>
          <TabsTrigger value="valuation" className="text-xs">
            <Layers className="w-3.5 h-3.5 mr-1.5" /> {t.reports?.stockValuation || "Stock Valuation"}
          </TabsTrigger>
          <TabsTrigger value="aging" className="text-xs">
            <Clock className="w-3.5 h-3.5 mr-1.5" /> {t.reports?.debtAging || "Debt Aging Schedule"}
          </TabsTrigger>
        </TabsList>

        {/* Tab 1: Profit Report */}
        <TabsContent value="profit" className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <Card className="rounded-card border shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-xs uppercase text-muted-foreground font-semibold">
                  {t.reports?.revenue || "Total Revenue"}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold tabular-nums">
                  {formatCurrency(totalRev, currency)}
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-card border shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-xs uppercase text-muted-foreground font-semibold">
                  {t.reports?.cogs || "Cost of Goods (COGS)"}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold tabular-nums text-muted-foreground">
                  {formatCurrency(totalCogs, currency)}
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-card border shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-xs uppercase text-muted-foreground font-semibold">
                  {t.reports?.grossProfit || "Gross Profit"}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold tabular-nums text-emerald-600 dark:text-emerald-400">
                  {formatCurrency(totalProfit, currency)}
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-card border shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-xs uppercase text-muted-foreground font-semibold">
                  {t.reports?.margin || "Average Margin"}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold tabular-nums text-emerald-600 dark:text-emerald-400">
                  {overallMargin}%
                </div>
              </CardContent>
            </Card>
          </div>

          <Card className="rounded-card border shadow-sm overflow-hidden">
            <CardHeader>
              <CardTitle className="text-base font-semibold">{t.reports?.dailyBreakdown || "Daily Gross Profit Breakdown"}</CardTitle>
              <CardDescription className="text-xs">
                {t.reports?.dailyBreakdownDesc || "Derived directly from snapshot item cost and sales revenue"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50 border-b text-xs uppercase text-muted-foreground">
                    <tr>
                      <th className="py-2.5 px-4 text-left font-medium">{t.common?.date || "Date"}</th>
                      <th className="py-2.5 px-4 text-center font-medium">{t.sales?.itemsCount || "Sales Count"}</th>
                      <th className="py-2.5 px-4 text-right font-medium">{t.reports?.revenue || "Revenue"}</th>
                      <th className="py-2.5 px-4 text-right font-medium">{t.reports?.cogs || "COGS"}</th>
                      <th className="py-2.5 px-4 text-right font-medium">{t.reports?.grossProfit || "Gross Profit"}</th>
                      <th className="py-2.5 px-4 text-right font-medium">{t.reports?.margin || "Margin"}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {profitData.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-8 text-center text-muted-foreground text-xs">
                          {t.common?.noData || "No sales data recorded in this period"}
                        </td>
                      </tr>
                    ) : (
                      profitData.map((d, i) => (
                        <tr key={i} className="hover:bg-muted/20">
                          <td className="py-2.5 px-4 font-mono text-xs">{d.day}</td>
                          <td className="py-2.5 px-4 text-center tabular-nums">{d.salesCount}</td>
                          <td className="py-2.5 px-4 text-right font-medium tabular-nums">
                            {formatCurrency(d.revenue, currency)}
                          </td>
                          <td className="py-2.5 px-4 text-right text-muted-foreground tabular-nums">
                            {formatCurrency(d.cogs, currency)}
                          </td>
                          <td className="py-2.5 px-4 text-right font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">
                            {formatCurrency(d.profit, currency)}
                          </td>
                          <td className="py-2.5 px-4 text-right font-medium tabular-nums">
                            {d.marginPercent}%
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 2: Stock Valuation */}
        <TabsContent value="valuation" className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card className="rounded-card border shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-xs uppercase text-muted-foreground font-semibold">
                  {t.reports?.assetCostValue || "Total Asset Cost Value"}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold tabular-nums">
                  {formatCurrency(valuationData.summary?.totalCostValue, currency)}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {t.reports?.assetCostDesc || "Capital invested in current stock"}
                </p>
              </CardContent>
            </Card>

            <Card className="rounded-card border shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-xs uppercase text-muted-foreground font-semibold">
                  {t.reports?.retailValue || "Total Potential Retail Value"}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold tabular-nums text-primary">
                  {formatCurrency(valuationData.summary?.totalRetailValue, currency)}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {t.reports?.retailDesc || "Gross return at active retail prices"}
                </p>
              </CardContent>
            </Card>

            <Card className="rounded-card border shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-xs uppercase text-muted-foreground font-semibold">
                  {t.reports?.projectedProfit || "Projected Gross Profit"}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold tabular-nums text-emerald-600 dark:text-emerald-400">
                  {formatCurrency(valuationData.summary?.potentialProfit, currency)}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {t.reports?.projectedProfitDesc || "Net profit after total inventory sell-out"}
                </p>
              </CardContent>
            </Card>
          </div>

          <Card className="rounded-card border shadow-sm overflow-hidden">
            <CardHeader>
              <CardTitle className="text-base font-semibold">{t.reports?.stockValuation || "Inventory Valuation Ledger"}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50 border-b text-xs uppercase text-muted-foreground">
                    <tr>
                      <th className="py-2.5 px-4 text-left font-medium">{t.products?.productName || "Product"}</th>
                      <th className="py-2.5 px-4 text-left font-medium">{t.products?.sku || "SKU"}</th>
                      <th className="py-2.5 px-4 text-right font-medium">{t.pos?.inStock || "In Stock"}</th>
                      <th className="py-2.5 px-4 text-right font-medium">{t.reports?.unitCost || t.products?.costPrice || "Unit Cost"}</th>
                      <th className="py-2.5 px-4 text-right font-medium">{t.reports?.sellingPrice || t.products?.sellingPrice || "Selling Price"}</th>
                      <th className="py-2.5 px-4 text-right font-medium">{t.reports?.totalCostValue || t.reports?.cogs || "Total Cost Value"}</th>
                      <th className="py-2.5 px-4 text-right font-medium">{t.reports?.totalRetailValue || t.reports?.revenue || "Total Retail Value"}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {valuationData.items?.map((item: any) => (
                      <tr key={item.id} className="hover:bg-muted/20">
                        <td className="py-2.5 px-4 font-medium">{item.name}</td>
                        <td className="py-2.5 px-4 font-mono text-xs text-muted-foreground">{item.sku}</td>
                        <td className="py-2.5 px-4 text-right tabular-nums">{formatQuantity(item.stock_qty)}</td>
                        <td className="py-2.5 px-4 text-right tabular-nums text-muted-foreground">
                          {formatCurrency(item.cost_price, currency)}
                        </td>
                        <td className="py-2.5 px-4 text-right tabular-nums">
                          {formatCurrency(item.selling_price, currency)}
                        </td>
                        <td className="py-2.5 px-4 text-right font-semibold tabular-nums">
                          {formatCurrency(item.total_cost_value, currency)}
                        </td>
                        <td className="py-2.5 px-4 text-right font-bold text-primary tabular-nums">
                          {formatCurrency(item.total_retail_value, currency)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 3: Debt Aging */}
        <TabsContent value="aging" className="space-y-4">
          <Card className="rounded-card border shadow-sm overflow-hidden">
            <CardHeader>
              <CardTitle className="text-base font-semibold">{t.reports?.agingAnalysis || t.reports?.debtAging || "Receivables Aging Analysis"}</CardTitle>
              <CardDescription className="text-xs">
                {t.reports?.agingDesc || "Classifies outstanding debt across 30, 60, 90, and 90+ day overdue buckets"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50 border-b text-xs uppercase text-muted-foreground">
                    <tr>
                      <th className="py-2.5 px-4 text-left font-medium">{t.debts?.customerName || "Customer"}</th>
                      <th className="py-2.5 px-4 text-right font-medium">{t.debts?.totalOwed || "Total Debt"}</th>
                      <th className="py-2.5 px-4 text-right font-medium">{t.reports?.days0_30 || "0–30 Days"}</th>
                      <th className="py-2.5 px-4 text-right font-medium">{t.reports?.days31_60 || "31–60 Days"}</th>
                      <th className="py-2.5 px-4 text-right font-medium">{t.reports?.days61_90 || "61–90 Days"}</th>
                      <th className="py-2.5 px-4 text-right font-medium text-rose-600">{t.reports?.days90Plus || "90+ Days"}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {agingData.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-8 text-center text-muted-foreground text-xs">
                          {t.debts?.noDebts || "No outstanding customer debts found!"}
                        </td>
                      </tr>
                    ) : (
                      agingData.map((d: any) => (
                        <tr key={d.id} className="hover:bg-muted/20">
                          <td className="py-2.5 px-4 font-medium">{d.customer_name}</td>
                          <td className="py-2.5 px-4 text-right font-bold text-rose-600 tabular-nums">
                            {formatCurrency(d.total_owed, currency)}
                          </td>
                          <td className="py-2.5 px-4 text-right tabular-nums text-muted-foreground">
                            {formatCurrency(d.age_0_30, currency)}
                          </td>
                          <td className="py-2.5 px-4 text-right tabular-nums text-amber-600">
                            {formatCurrency(d.age_31_60, currency)}
                          </td>
                          <td className="py-2.5 px-4 text-right tabular-nums text-orange-600">
                            {formatCurrency(d.age_61_90, currency)}
                          </td>
                          <td className="py-2.5 px-4 text-right font-semibold text-rose-700 dark:text-rose-400 tabular-nums">
                            {formatCurrency(d.age_90_plus, currency)}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
