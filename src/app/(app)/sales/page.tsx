import { requirePermission } from "@/lib/auth";
import { PERMISSIONS, can } from "@/lib/permissions";
import { getSales } from "@/services/sales.service";
import { getCompany } from "@/services/company.service";
import { getServerTranslations } from "@/lib/i18n/server";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatCurrency } from "@/lib/money";
import { formatDate, getStatusBadgeVariant } from "@/lib/format";
import { Plus, Download, Search, Filter } from "lucide-react";

export default async function SalesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; payment?: string; page?: string }>;
}) {
  const sp = await searchParams;
  const user = await requirePermission(PERMISSIONS.SALES_VIEW);
  const comp = await getCompany();
  const { t } = await getServerTranslations();
  const page = parseInt(sp.page || "1") || 1;
  const isCashierOnly = user.roleKey === "cashier";

  const { items, total, totalPages } = await getSales({
    search: sp.q,
    status: (sp.status as any) || "all",
    paymentStatus: (sp.payment as any) || "all",
    userIdOnly: isCashierOnly ? user.id : undefined,
    page,
    pageSize: 20,
  });

  const canCreate = can(user, PERMISSIONS.SALES_CREATE);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t.sales?.title || "Sales Ledger"}</h1>
          <p className="text-sm text-muted-foreground">
            {t.sales?.subtitle || "Complete transaction record, invoice statuses, and debt receivables"}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <a href="/api/export/sales" download>
            <Button variant="outline" size="sm">
              <Download className="w-4 h-4 mr-2" />
              {t.reports?.exportCsv || t.common?.export || "Export CSV"}
            </Button>
          </a>
          {canCreate && (
            <Link href="/sales/new">
              <Button size="sm">
                <Plus className="w-4 h-4 mr-2" />
                {t.nav?.newSale || "New Sale"}
              </Button>
            </Link>
          )}
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <form className="relative flex-1">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            name="q"
            defaultValue={sp.q || ""}
            placeholder={t.pos?.searchPlaceholder || "Search by invoice number or customer name..."}
            className="pl-9"
          />
        </form>

        <div className="flex gap-2">
          <select
            name="payment"
            defaultValue={sp.payment || "all"}
            className="h-9 rounded-md border border-input bg-background px-3 py-1 text-xs"
          >
            <option value="all">{t.common?.all || "All Payment Statuses"}</option>
            <option value="paid">{t.sales?.paid || "Paid"}</option>
            <option value="partial">{t.sales?.partial || "Partial (Debt)"}</option>
            <option value="unpaid">{t.sales?.unpaid || "Unpaid / Credit"}</option>
          </select>

          <select
            name="status"
            defaultValue={sp.status || "all"}
            className="h-9 rounded-md border border-input bg-background px-3 py-1 text-xs"
          >
            <option value="all">{t.sales?.allSales || "All Invoices"}</option>
            <option value="completed">Completed</option>
            <option value="voided">Voided</option>
          </select>
        </div>
      </div>

      {/* Sales Table */}
      <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 border-b">
              <tr className="text-xs uppercase text-muted-foreground">
                <th className="py-3 px-4 text-left font-medium">{t.sales?.invoiceNo || "Invoice #"}</th>
                <th className="py-3 px-4 text-left font-medium">{t.sales?.customer || "Customer"}</th>
                <th className="py-3 px-4 text-left font-medium">{t.common?.date || "Date"}</th>
                <th className="py-3 px-4 text-left font-medium">{t.common?.status || "Status"}</th>
                <th className="py-3 px-4 text-right font-medium">{t.common?.total || "Total"}</th>
                <th className="py-3 px-4 text-right font-medium">{t.sales?.paid || "Paid"}</th>
                <th className="py-3 px-4 text-right font-medium">{t.sales?.balanceDue || "Balance Due"}</th>
                <th className="py-3 px-4 text-right font-medium">{t.common?.actions || "Action"}</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {items.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-muted-foreground">
                    {t.common?.noData || "No sales matching criteria found"}
                  </td>
                </tr>
              ) : (
                items.map((s) => {
                  const isVoided = s.status === "voided";
                  const badge = getStatusBadgeVariant(
                    isVoided ? "voided" : s.paymentStatus
                  );

                  return (
                    <tr
                      key={s.id}
                      className={`hover:bg-muted/40 transition-colors ${
                        isVoided ? "opacity-60 bg-muted/20" : ""
                      }`}
                    >
                      <td className="py-3 px-4 font-mono font-medium text-xs">
                        <Link
                          href={`/sales/${s.id}`}
                          className={`hover:underline text-primary ${
                            isVoided ? "line-through text-muted-foreground" : ""
                          }`}
                        >
                          {s.invoiceNo}
                        </Link>
                      </td>
                      <td className="py-3 px-4 font-medium">{s.customerName}</td>
                      <td className="py-3 px-4 text-xs text-muted-foreground">
                        {formatDate(s.createdAt)}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium border ${badge.className}`}
                        >
                          {badge.label}
                        </span>
                      </td>
                      <td
                        className={`py-3 px-4 text-right font-semibold tabular-nums ${
                          isVoided ? "line-through" : ""
                        }`}
                      >
                        {formatCurrency(s.total, comp?.currency)}
                      </td>
                      <td className="py-3 px-4 text-right text-emerald-600 dark:text-emerald-400 font-medium tabular-nums">
                        {formatCurrency(s.amountPaid, comp?.currency)}
                      </td>
                      <td className="py-3 px-4 text-right font-bold tabular-nums text-rose-600 dark:text-rose-400">
                        {formatCurrency(s.balanceDue, comp?.currency)}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <Link href={`/sales/${s.id}`}>
                          <Button variant="ghost" size="sm" className="h-7 text-xs">
                            {t.sales?.viewDetails || "View"}
                          </Button>
                        </Link>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination footer */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t bg-muted/20 text-xs text-muted-foreground">
            <div>
              Showing page {page} of {totalPages} ({total} total transactions)
            </div>
            <div className="flex gap-1">
              {page > 1 && (
                <Link href={`/sales?page=${page - 1}`}>
                  <Button variant="outline" size="sm" className="h-7 text-xs">
                    Previous
                  </Button>
                </Link>
              )}
              {page < totalPages && (
                <Link href={`/sales?page=${page + 1}`}>
                  <Button variant="outline" size="sm" className="h-7 text-xs">
                    Next
                  </Button>
                </Link>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
