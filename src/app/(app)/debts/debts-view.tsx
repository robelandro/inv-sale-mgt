"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { recordPaymentAction } from "@/app/actions/payments.actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { formatCurrency } from "@/lib/money";
import { formatDate } from "@/lib/format";
import { toast } from "sonner";
import {
  CreditCard,
  Search,
  Download,
  AlertCircle,
  Eye,
  Loader2,
  Calendar,
} from "lucide-react";

interface DebtsViewProps {
  debts: any[];
  total: number;
  totalPages: number;
  currentPage: number;
  currency: string;
  canRecordPayment: boolean;
  searchQuery: string;
  overdueOnly: boolean;
}

export function DebtsView({
  debts,
  total,
  totalPages,
  currentPage,
  currency,
  canRecordPayment,
  searchQuery,
  overdueOnly,
}: DebtsViewProps) {
  const router = useRouter();

  // Payment dialog state
  const [payOpen, setPayOpen] = React.useState(false);
  const [selectedCustomer, setSelectedCustomer] = React.useState<any>(null);
  const [payAmount, setPayAmount] = React.useState("");
  const [payMethod, setPayMethod] = React.useState<any>("cash");
  const [payNote, setPayNote] = React.useState("");
  const [isPaying, setIsPaying] = React.useState(false);

  const handleSearch = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const q = fd.get("q") as string;
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (overdueOnly) params.set("overdue", "true");
    router.push(`/debts?${params.toString()}`);
  };

  const toggleOverdue = () => {
    const params = new URLSearchParams();
    if (searchQuery) params.set("q", searchQuery);
    if (!overdueOnly) params.set("overdue", "true");
    router.push(`/debts?${params.toString()}`);
  };

  const handleOpenPay = (cust: any) => {
    setSelectedCustomer(cust);
    setPayAmount(cust.totalOwed);
    setPayNote("");
    setPayOpen(true);
  };

  const handleConfirmPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomer) return;
    const amt = parseFloat(payAmount);
    if (isNaN(amt) || amt <= 0) {
      toast.error("Please enter a valid payment amount");
      return;
    }

    setIsPaying(true);
    try {
      const res = await recordPaymentAction({
        customerId: selectedCustomer.customerId,
        amount: amt,
        method: payMethod,
        note: payNote || "Debt repayment on account",
      });

      if (!res.success) {
        toast.error(res.error || "Payment recording failed");
        setIsPaying(false);
        return;
      }

      toast.success(
        `Payment of ${formatCurrency(amt, currency)} recorded and applied oldest-first (FIFO)!`
      );
      setPayOpen(false);
      router.refresh();
    } catch (err: any) {
      toast.error(err.message || "Payment error");
    } finally {
      setIsPaying(false);
    }
  };

  const totalOutstandingAll = debts.reduce(
    (sum, d) => sum + parseFloat(d.totalOwed || "0"),
    0
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Customer Debts & Credit</h1>
          <p className="text-sm text-muted-foreground">
            Track customer receivables, overdue invoices, and record FIFO debt repayments
          </p>
        </div>

        <div className="flex items-center gap-2">
          <a href="/api/export/debts" download>
            <Button variant="outline" size="sm">
              <Download className="w-4 h-4 mr-2" />
              Export CSV
            </Button>
          </a>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <form onSubmit={handleSearch} className="flex-1 flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              name="q"
              defaultValue={searchQuery}
              placeholder="Search debtor by name, phone, or email..."
              className="pl-9"
            />
          </div>
          <Button type="submit" variant="secondary" size="sm">
            Search
          </Button>
        </form>

        <Button
          variant={overdueOnly ? "destructive" : "outline"}
          size="sm"
          onClick={toggleOverdue}
          className="h-9 shrink-0"
        >
          <AlertCircle className="w-4 h-4 mr-1.5" />
          {overdueOnly ? "Showing Overdue Only" : "Filter Overdue Only"}
        </Button>
      </div>

      {/* Summary Card */}
      <div className="p-4 rounded-xl border bg-card shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
        <div>
          <span className="text-xs uppercase font-semibold text-muted-foreground">
            Debtors Displayed
          </span>
          <p className="text-xl font-bold text-foreground">
            {total} Customer{total === 1 ? "" : "s"} with Balances
          </p>
        </div>
        <div className="text-left sm:text-right">
          <span className="text-xs uppercase font-semibold text-muted-foreground">
            Total Receivables on Page
          </span>
          <p className="text-2xl font-bold tabular-nums text-rose-600 dark:text-rose-400">
            {formatCurrency(totalOutstandingAll, currency)}
          </p>
        </div>
      </div>

      {/* Debts Table */}
      <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 border-b text-xs uppercase text-muted-foreground">
              <tr>
                <th className="py-3 px-4 text-left font-medium">Customer</th>
                <th className="py-3 px-4 text-left font-medium">Contact</th>
                <th className="py-3 px-4 text-center font-medium">Unpaid Sales</th>
                <th className="py-3 px-4 text-left font-medium">Oldest Unpaid</th>
                <th className="py-3 px-4 text-center font-medium">Status</th>
                <th className="py-3 px-4 text-right font-medium">Total Owed</th>
                <th className="py-3 px-4 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {debts.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-muted-foreground">
                    No debtor records found matching criteria
                  </td>
                </tr>
              ) : (
                debts.map((d) => (
                  <tr key={d.customerId} className="hover:bg-muted/40 transition-colors">
                    <td className="py-3 px-4 font-semibold text-foreground">
                      <Link
                        href={`/customers/${d.customerId}`}
                        className="hover:underline hover:text-primary"
                      >
                        {d.customerName}
                      </Link>
                    </td>
                    <td className="py-3 px-4 text-xs text-muted-foreground">
                      {d.customerPhone || d.customerEmail || "—"}
                    </td>
                    <td className="py-3 px-4 text-center text-xs font-semibold tabular-nums">
                      {d.unpaidSalesCount} invoice{d.unpaidSalesCount === 1 ? "" : "s"}
                    </td>
                    <td className="py-3 px-4 text-xs text-muted-foreground">
                      {d.oldestUnpaidDate ? formatDate(d.oldestUnpaidDate) : "—"}
                    </td>
                    <td className="py-3 px-4 text-center">
                      {d.isOverdue ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-400 border border-rose-200 dark:border-rose-800">
                          <AlertCircle className="w-3 h-3" /> Overdue
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400 border border-amber-200 dark:border-amber-800">
                          Active Debt
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right font-bold tabular-nums text-rose-600 dark:text-rose-400 text-base">
                      {formatCurrency(d.totalOwed, currency)}
                    </td>
                    <td className="py-3 px-4 text-right space-x-2">
                      {canRecordPayment && (
                        <Button
                          size="sm"
                          onClick={() => handleOpenPay(d)}
                          className="h-7 text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
                        >
                          <CreditCard className="w-3.5 h-3.5 mr-1" /> Pay
                        </Button>
                      )}
                      <Link href={`/customers/${d.customerId}`}>
                        <Button variant="ghost" size="sm" className="h-7 text-xs">
                          <Eye className="w-3.5 h-3.5 mr-1" /> Ledger
                        </Button>
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t bg-muted/20 text-xs text-muted-foreground">
            <div>
              Showing page {currentPage} of {totalPages}
            </div>
            <div className="flex gap-1">
              {currentPage > 1 && (
                <Link
                  href={`/debts?page=${currentPage - 1}&q=${searchQuery}&overdue=${overdueOnly}`}
                >
                  <Button variant="outline" size="sm" className="h-7 text-xs">
                    Previous
                  </Button>
                </Link>
              )}
              {currentPage < totalPages && (
                <Link
                  href={`/debts?page=${currentPage + 1}&q=${searchQuery}&overdue=${overdueOnly}`}
                >
                  <Button variant="outline" size="sm" className="h-7 text-xs">
                    Next
                  </Button>
                </Link>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Record Debt Repayment Modal */}
      <Dialog open={payOpen} onOpenChange={setPayOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-emerald-600">
              <CreditCard className="h-5 w-5" /> Record Debt Repayment
            </DialogTitle>
          </DialogHeader>
          {selectedCustomer && (
            <form onSubmit={handleConfirmPayment} className="space-y-4">
              <div className="p-3 bg-muted/40 rounded-lg text-xs space-y-1">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Debtor:</span>
                  <span className="font-semibold text-foreground">
                    {selectedCustomer.customerName}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total Balance Owed:</span>
                  <span className="font-bold text-rose-600 tabular-nums">
                    {formatCurrency(selectedCustomer.totalOwed, currency)}
                  </span>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="debtPayAmt">Payment Amount Received *</Label>
                <Input
                  id="debtPayAmt"
                  type="number"
                  step="0.01"
                  min={0.01}
                  max={selectedCustomer.totalOwed}
                  value={payAmount}
                  onChange={(e) => setPayAmount(e.target.value)}
                  autoFocus
                  required
                />
                <p className="text-[11px] text-muted-foreground">
                  Rule: Automatically applied to oldest unpaid invoices first (FIFO).
                </p>
              </div>

              <div className="space-y-1.5">
                <Label>Payment Method *</Label>
                <select
                  value={payMethod}
                  onChange={(e) => setPayMethod(e.target.value)}
                  className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-sm"
                >
                  <option value="cash">Cash</option>
                  <option value="card">Card / POS</option>
                  <option value="bank_transfer">Bank Transfer</option>
                  <option value="mobile_money">Mobile Money</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="debtPayNote">Note / Reference (Optional)</Label>
                <Input
                  id="debtPayNote"
                  placeholder="e.g. Receipt #00293 or bank transfer memo"
                  value={payNote}
                  onChange={(e) => setPayNote(e.target.value)}
                />
              </div>

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setPayOpen(false)}
                  disabled={isPaying}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isPaying || !payAmount}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white"
                >
                  {isPaying && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Confirm & Apply Repayment
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
