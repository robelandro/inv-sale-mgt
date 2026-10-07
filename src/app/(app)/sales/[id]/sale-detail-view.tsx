"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { voidSaleAction } from "@/app/actions/sales.actions";
import { recordPaymentAction } from "@/app/actions/payments.actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { formatCurrency } from "@/lib/money";
import { formatDate, formatDateTime, getStatusBadgeVariant } from "@/lib/format";
import { toast } from "sonner";
import {
  Printer,
  Ban,
  ArrowLeft,
  CreditCard,
  AlertTriangle,
  Loader2,
  CheckCircle,
} from "lucide-react";

export function SaleDetailView({
  sale,
  company,
  canVoid,
  canRecordPayment,
}: {
  sale: any;
  company: any;
  canVoid: boolean;
  canRecordPayment: boolean;
}) {
  const router = useRouter();
  const currency = company?.currency || "USD";
  const isVoided = sale.status === "voided";
  const statusBadge = getStatusBadgeVariant(
    isVoided ? "voided" : sale.paymentStatus
  );

  // Void Modal State
  const [voidDialogOpen, setVoidDialogOpen] = React.useState(false);
  const [voidReason, setVoidReason] = React.useState("");
  const [isVoiding, setIsVoiding] = React.useState(false);

  // Payment Modal State
  const [paymentDialogOpen, setPaymentDialogOpen] = React.useState(false);
  const [paymentAmount, setPaymentAmount] = React.useState(sale.balanceDue || "");
  const [paymentMethod, setPaymentMethod] = React.useState<any>("cash");
  const [paymentNote, setPaymentNote] = React.useState("");
  const [isPaying, setIsPaying] = React.useState(false);

  const handleVoid = async () => {
    if (!voidReason.trim() || voidReason.trim().length < 3) {
      toast.error("Please enter a valid reason for voiding (min 3 chars).");
      return;
    }

    setIsVoiding(true);
    try {
      const res = await voidSaleAction({
        saleId: sale.id,
        reason: voidReason.trim(),
      });

      if (!res.success) {
        toast.error(res.error || "Failed to void sale");
        setIsVoiding(false);
        return;
      }

      toast.success("Sale voided and stock restored to inventory.");
      setVoidDialogOpen(false);
      router.refresh();
    } catch (err: any) {
      toast.error(err.message || "An error occurred");
    } finally {
      setIsVoiding(false);
    }
  };

  const handleRecordPayment = async () => {
    const amt = parseFloat(paymentAmount);
    if (isNaN(amt) || amt <= 0) {
      toast.error("Please enter a valid payment amount");
      return;
    }

    setIsPaying(true);
    try {
      const res = await recordPaymentAction({
        customerId: sale.customerId,
        saleId: sale.id,
        amount: amt,
        method: paymentMethod,
        note: paymentNote || `Payment for ${sale.invoiceNo}`,
      });

      if (!res.success) {
        toast.error(res.error || "Payment failed");
        setIsPaying(false);
        return;
      }

      toast.success("Payment recorded successfully!");
      setPaymentDialogOpen(false);
      router.refresh();
    } catch (err: any) {
      toast.error(err.message || "Payment error");
    } finally {
      setIsPaying(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Action Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 no-print">
        <div className="flex items-center gap-3">
          <Link href="/sales">
            <Button variant="outline" size="sm">
              <ArrowLeft className="w-4 h-4 mr-1" /> Back to Sales
            </Button>
          </Link>
          <div>
            <h1 className="text-xl font-bold tracking-tight flex items-center gap-2">
              Invoice {sale.invoiceNo}
              <span
                className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold border ${statusBadge.className}`}
              >
                {statusBadge.label}
              </span>
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {!isVoided && Number(sale.balanceDue) > 0 && canRecordPayment && (
            <Button
              size="sm"
              onClick={() => setPaymentDialogOpen(true)}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              <CreditCard className="w-4 h-4 mr-2" />
              Record Debt Payment
            </Button>
          )}

          <Button variant="outline" size="sm" onClick={() => window.print()}>
            <Printer className="w-4 h-4 mr-2" />
            Print
          </Button>

          {!isVoided && canVoid && (
            <Button
              variant="destructive"
              size="sm"
              onClick={() => setVoidDialogOpen(true)}
            >
              <Ban className="w-4 h-4 mr-2" />
              Void Sale
            </Button>
          )}
        </div>
      </div>

      {/* Void Warning Banner */}
      {isVoided && (
        <div className="rounded-xl border border-rose-300 bg-rose-50 dark:bg-rose-950/40 p-4 text-rose-900 dark:text-rose-200 space-y-1">
          <div className="flex items-center gap-2 font-bold text-sm">
            <AlertTriangle className="h-4 w-4 text-rose-600 shrink-0" />
            This sale has been VOIDED
          </div>
          <p className="text-xs">
            Voided on {formatDateTime(sale.voidedAt)}. Stock was restored and debts were removed.
          </p>
          {sale.voidReason && (
            <p className="text-xs font-medium italic">Reason: "{sale.voidReason}"</p>
          )}
        </div>
      )}

      {/* Invoice Document Layout (Thermal & A4 Printable) */}
      <div className="receipt-container-a4 bg-card border rounded-2xl shadow-sm p-6 sm:p-10 space-y-8">
        {/* Invoice Top Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start gap-4 border-b pb-6">
          <div className="space-y-1">
            {company?.logoUrl ? (
              <img
                src={company.logoUrl}
                alt={company.name}
                className="h-10 w-auto object-contain mb-2"
              />
            ) : (
              <div className="font-bold text-xl text-primary">{company?.name}</div>
            )}
            <p className="text-sm font-semibold text-foreground">{company?.name}</p>
            {company?.address && (
              <p className="text-xs text-muted-foreground">{company.address}</p>
            )}
            {company?.phone && (
              <p className="text-xs text-muted-foreground">Tel: {company.phone}</p>
            )}
            {company?.email && (
              <p className="text-xs text-muted-foreground">{company.email}</p>
            )}
          </div>

          <div className="text-left sm:text-right space-y-1 font-mono text-xs">
            <h2 className="text-2xl font-bold tracking-tight text-foreground font-sans">
              INVOICE
            </h2>
            <p className="font-semibold text-sm text-foreground">{sale.invoiceNo}</p>
            <p className="text-muted-foreground">
              Date: {formatDate(sale.createdAt, "MMM d, yyyy HH:mm")}
            </p>
            {sale.dueDate && (
              <p className="text-rose-600 font-medium">
                Due Date: {formatDate(sale.dueDate)}
              </p>
            )}
            <p className="text-muted-foreground">Staff: {sale.creatorName || "Staff"}</p>
          </div>
        </div>

        {/* Bill To Customer */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1">
            <span className="text-xs uppercase tracking-wider font-semibold text-muted-foreground">
              Bill To Customer
            </span>
            <p className="font-semibold text-base text-foreground">{sale.customerName}</p>
            {sale.customerPhone && (
              <p className="text-xs text-muted-foreground">{sale.customerPhone}</p>
            )}
            {sale.customerEmail && (
              <p className="text-xs text-muted-foreground">{sale.customerEmail}</p>
            )}
            {sale.customerAddress && (
              <p className="text-xs text-muted-foreground">{sale.customerAddress}</p>
            )}
          </div>

          {sale.notes && (
            <div className="space-y-1 bg-muted/30 p-3 rounded-lg border text-xs">
              <span className="font-semibold uppercase tracking-wider text-muted-foreground">
                Notes
              </span>
              <p className="text-muted-foreground">{sale.notes}</p>
            </div>
          )}
        </div>

        {/* Line Items Table */}
        <div className="border rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 border-b text-xs uppercase text-muted-foreground font-medium">
              <tr>
                <th className="py-2.5 px-4 text-left font-medium">Item</th>
                <th className="py-2.5 px-4 text-left font-medium">SKU</th>
                <th className="py-2.5 px-4 text-right font-medium">Qty</th>
                <th className="py-2.5 px-4 text-right font-medium">Unit Price</th>
                <th className="py-2.5 px-4 text-right font-medium">Discount</th>
                <th className="py-2.5 px-4 text-right font-medium">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {sale.items?.map((it: any) => (
                <tr key={it.id} className="hover:bg-muted/20">
                  <td className="py-3 px-4 font-medium">{it.productName}</td>
                  <td className="py-3 px-4 font-mono text-xs text-muted-foreground">
                    {it.sku}
                  </td>
                  <td className="py-3 px-4 text-right tabular-nums">{it.qty}</td>
                  <td className="py-3 px-4 text-right tabular-nums">
                    {formatCurrency(it.unitPrice, currency)}
                  </td>
                  <td className="py-3 px-4 text-right tabular-nums text-muted-foreground">
                    {Number(it.discount) > 0 ? `-${formatCurrency(it.discount, currency)}` : "—"}
                  </td>
                  <td className="py-3 px-4 text-right font-semibold tabular-nums">
                    {formatCurrency(it.lineTotal, currency)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Financial Summary Breakdown */}
        <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
          <div className="space-y-3 w-full sm:w-1/2">
            {/* Payments List */}
            {sale.allocations && sale.allocations.length > 0 && (
              <div className="border rounded-lg p-3 space-y-2 bg-muted/20 text-xs">
                <span className="font-semibold uppercase tracking-wider text-muted-foreground">
                  Payments Applied
                </span>
                <div className="divide-y">
                  {sale.allocations.map((a: any) => (
                    <div key={a.id} className="py-1.5 flex justify-between items-center">
                      <div>
                        <span className="font-medium capitalize">{a.method}</span>
                        <span className="text-muted-foreground ml-2">
                          {formatDate(a.paidAt)}
                        </span>
                        {a.reversedAt && (
                          <span className="text-[10px] text-rose-600 font-bold ml-2">
                            (Reversed)
                          </span>
                        )}
                      </div>
                      <span className="font-semibold tabular-nums">
                        {formatCurrency(a.amount, currency)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="w-full sm:w-72 space-y-2 text-sm bg-muted/30 p-4 rounded-xl border">
            <div className="flex justify-between text-muted-foreground text-xs">
              <span>Subtotal:</span>
              <span className="tabular-nums font-medium text-foreground">
                {formatCurrency(sale.subtotal, currency)}
              </span>
            </div>

            {Number(sale.discountTotal) > 0 && (
              <div className="flex justify-between text-muted-foreground text-xs">
                <span>Total Discount:</span>
                <span className="tabular-nums font-medium text-emerald-600">
                  -{formatCurrency(sale.discountTotal, currency)}
                </span>
              </div>
            )}

            {Number(sale.taxTotal) > 0 && (
              <div className="flex justify-between text-muted-foreground text-xs">
                <span>Tax:</span>
                <span className="tabular-nums font-medium text-foreground">
                  +{formatCurrency(sale.taxTotal, currency)}
                </span>
              </div>
            )}

            <div className="flex justify-between text-base font-bold border-t pt-2">
              <span>Grand Total:</span>
              <span className="tabular-nums text-primary">
                {formatCurrency(sale.total, currency)}
              </span>
            </div>

            <div className="flex justify-between font-medium text-xs pt-1">
              <span>Amount Paid:</span>
              <span className="tabular-nums text-emerald-600">
                {formatCurrency(sale.amountPaid, currency)}
              </span>
            </div>

            {Number(sale.balanceDue) > 0 && (
              <div className="flex justify-between font-bold text-sm text-rose-600 border-t pt-1">
                <span>Balance Due:</span>
                <span className="tabular-nums">
                  {formatCurrency(sale.balanceDue, currency)}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Void Confirmation Modal */}
      <Dialog open={voidDialogOpen} onOpenChange={setVoidDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <Ban className="h-5 w-5" /> Void Sale #{sale.invoiceNo}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-sm text-muted-foreground">
              Voiding this sale is permanent. It will return all items back into stock, reverse associated debt, and mark this invoice voided.
            </p>
            <div className="space-y-2">
              <Label htmlFor="voidReason">
                Reason for Voiding <span className="text-destructive">*</span>
              </Label>
              <Textarea
                id="voidReason"
                placeholder="e.g. Customer returned items / Cashier entered wrong invoice"
                value={voidReason}
                onChange={(e) => setVoidReason(e.target.value)}
                autoFocus
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setVoidDialogOpen(false)}
              disabled={isVoiding}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleVoid}
              disabled={isVoiding || !voidReason.trim()}
            >
              {isVoiding && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Confirm Void
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Record Debt Payment Modal */}
      <Dialog open={paymentDialogOpen} onOpenChange={setPaymentDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-emerald-600">
              <CreditCard className="h-5 w-5" /> Record Payment for #{sale.invoiceNo}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="p-3 bg-muted/40 rounded-lg text-xs space-y-1">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Customer:</span>
                <span className="font-semibold">{sale.customerName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Current Balance Due:</span>
                <span className="font-bold text-rose-600 tabular-nums">
                  {formatCurrency(sale.balanceDue, currency)}
                </span>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="pmtAmt">Amount Received</Label>
              <Input
                id="pmtAmt"
                type="number"
                step="0.01"
                min={0}
                max={sale.balanceDue}
                value={paymentAmount}
                onChange={(e) => setPaymentAmount(e.target.value)}
                autoFocus
              />
            </div>

            <div className="space-y-2">
              <Label>Payment Method</Label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-sm"
              >
                <option value="cash">Cash</option>
                <option value="card">Card / POS</option>
                <option value="bank_transfer">Bank Transfer</option>
                <option value="mobile_money">Mobile Money</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="pmtNote">Note (Optional)</Label>
              <Input
                id="pmtNote"
                placeholder="e.g. Check #1234 or receipt ref"
                value={paymentNote}
                onChange={(e) => setPaymentNote(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setPaymentDialogOpen(false)}
              disabled={isPaying}
            >
              Cancel
            </Button>
            <Button
              onClick={handleRecordPayment}
              disabled={isPaying || !paymentAmount}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {isPaying && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Save Payment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
