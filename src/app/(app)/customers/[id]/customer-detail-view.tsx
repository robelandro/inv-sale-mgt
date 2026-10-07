"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { recordPaymentAction } from "@/app/actions/payments.actions";
import { updateCustomerAction } from "@/app/actions/customers.actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
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
  ArrowLeft,
  CreditCard,
  Edit,
  Phone,
  Mail,
  MapPin,
  FileText,
  Loader2,
  TrendingUp,
  TrendingDown,
} from "lucide-react";

export function CustomerDetailView({
  customer,
  currentBalance,
  statementEntries,
  currency,
  canRecordPayment,
  canManage,
}: {
  customer: any;
  currentBalance: string;
  statementEntries: any[];
  currency: string;
  canRecordPayment: boolean;
  canManage: boolean;
}) {
  const router = useRouter();
  const owes = Number(currentBalance) > 0;

  // Record Payment Dialog State
  const [payOpen, setPayOpen] = React.useState(false);
  const [pmtAmount, setPmtAmount] = React.useState(currentBalance || "");
  const [pmtMethod, setPmtMethod] = React.useState<any>("cash");
  const [pmtNote, setPmtNote] = React.useState("");
  const [isPaying, setIsPaying] = React.useState(false);

  // Edit Customer Dialog State
  const [editOpen, setEditOpen] = React.useState(false);
  const [name, setName] = React.useState(customer.name);
  const [phone, setPhone] = React.useState(customer.phone || "");
  const [email, setEmail] = React.useState(customer.email || "");
  const [address, setAddress] = React.useState(customer.address || "");
  const [notes, setNotes] = React.useState(customer.notes || "");
  const [creditLimit, setCreditLimit] = React.useState(customer.creditLimit || "");
  const [isEditing, setIsEditing] = React.useState(false);

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(pmtAmount);
    if (isNaN(amt) || amt <= 0) {
      toast.error("Please enter a valid payment amount");
      return;
    }

    setIsPaying(true);
    try {
      const res = await recordPaymentAction({
        customerId: customer.id,
        amount: amt,
        method: pmtMethod,
        note: pmtNote || `Customer payment on account`,
      });

      if (!res.success) {
        toast.error(res.error || "Payment recording failed");
        setIsPaying(false);
        return;
      }

      toast.success("Payment recorded and allocated to customer's oldest debts (FIFO)");
      setPayOpen(false);
      router.refresh();
    } catch (err: any) {
      toast.error(err.message || "Payment error");
    } finally {
      setIsPaying(false);
    }
  };

  const handleUpdateCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Customer name is required");
      return;
    }

    setIsEditing(true);
    try {
      const res = await updateCustomerAction(customer.id, {
        name,
        phone: phone || undefined,
        email: email || undefined,
        address: address || undefined,
        notes: notes || undefined,
        creditLimit: creditLimit ? parseFloat(creditLimit) : undefined,
      });

      if (!res.success) {
        toast.error(res.error || "Update failed");
        setIsEditing(false);
        return;
      }

      toast.success("Customer profile updated successfully");
      setEditOpen(false);
      router.refresh();
    } catch (err: any) {
      toast.error(err.message || "Error updating customer");
    } finally {
      setIsEditing(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link href="/customers">
            <Button variant="outline" size="sm">
              <ArrowLeft className="w-4 h-4 mr-1" /> Customers
            </Button>
          </Link>
          <div>
            <h1 className="text-xl font-bold tracking-tight flex items-center gap-2">
              {customer.name}
              {customer.isWalkIn && (
                <span className="text-xs bg-muted px-2 py-0.5 rounded text-muted-foreground font-normal">
                  Walk-in
                </span>
              )}
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {owes && canRecordPayment && (
            <Button
              size="sm"
              onClick={() => {
                setPmtAmount(currentBalance);
                setPayOpen(true);
              }}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              <CreditCard className="w-4 h-4 mr-2" />
              Record Debt Payment
            </Button>
          )}

          {canManage && (
            <Button size="sm" variant="outline" onClick={() => setEditOpen(true)}>
              <Edit className="w-4 h-4 mr-2" />
              Edit Account
            </Button>
          )}
        </div>
      </div>

      {/* Customer Info & Balance Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Balance Card */}
        <Card className="rounded-card border shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold uppercase text-muted-foreground">
              Current Outstanding Balance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div
              className={`text-3xl font-bold tabular-nums ${
                owes ? "text-rose-600 dark:text-rose-400" : "text-emerald-600"
              }`}
            >
              {formatCurrency(currentBalance, currency)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Credit Limit:{" "}
              <span className="font-semibold text-foreground">
                {customer.creditLimit ? formatCurrency(customer.creditLimit, currency) : "No limit"}
              </span>
            </p>
          </CardContent>
        </Card>

        {/* Contact Info Card */}
        <Card className="rounded-card border shadow-sm md:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold uppercase text-muted-foreground">
              Contact & Profile Details
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Phone className="h-4 w-4 shrink-0" />
              <span>{customer.phone || "No phone on file"}</span>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <Mail className="h-4 w-4 shrink-0" />
              <span>{customer.email || "No email on file"}</span>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground sm:col-span-2">
              <MapPin className="h-4 w-4 shrink-0" />
              <span>{customer.address || "No address on file"}</span>
            </div>
            {customer.notes && (
              <div className="sm:col-span-2 pt-1 border-t text-muted-foreground">
                <span className="font-semibold text-foreground">Notes: </span>
                {customer.notes}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Chronological Statement Ledger */}
      <Card className="rounded-card border shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <FileText className="h-4 w-4 text-primary" />
              Account Statement & Chronological Ledger
            </CardTitle>
            <CardDescription className="text-xs">
              Complete historical ledger of invoices issued, debt repayments recorded, and running balance
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b text-xs uppercase text-muted-foreground font-medium bg-muted/30">
                <tr>
                  <th className="py-2.5 px-4 text-left font-medium">Date</th>
                  <th className="py-2.5 px-4 text-left font-medium">Type</th>
                  <th className="py-2.5 px-4 text-left font-medium">Reference</th>
                  <th className="py-2.5 px-4 text-left font-medium">Description</th>
                  <th className="py-2.5 px-4 text-right font-medium">Debit (Charges)</th>
                  <th className="py-2.5 px-4 text-right font-medium">Credit (Payments)</th>
                  <th className="py-2.5 px-4 text-right font-medium">Running Balance</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {statementEntries.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-muted-foreground text-xs">
                      No transactions recorded for this customer yet
                    </td>
                  </tr>
                ) : (
                  statementEntries.map((entry) => {
                    const isSale = entry.type === "sale";
                    return (
                      <tr key={entry.id} className="hover:bg-muted/20">
                        <td className="py-2.5 px-4 text-xs text-muted-foreground">
                          {formatDate(entry.date, "MMM d, yyyy")}
                        </td>
                        <td className="py-2.5 px-4">
                          <span
                            className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded capitalize ${
                              isSale
                                ? "bg-primary/10 text-primary"
                                : "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-400"
                            }`}
                          >
                            {isSale ? (
                              <TrendingUp className="h-3 w-3" />
                            ) : (
                              <TrendingDown className="h-3 w-3" />
                            )}
                            {entry.type}
                          </span>
                        </td>
                        <td className="py-2.5 px-4 font-mono text-xs font-medium">
                          {isSale ? (
                            <Link href={`/sales/${entry.id}`} className="hover:underline text-primary">
                              {entry.reference}
                            </Link>
                          ) : (
                            entry.reference
                          )}
                        </td>
                        <td className="py-2.5 px-4 text-xs text-muted-foreground">
                          {entry.description}
                        </td>
                        <td className="py-2.5 px-4 text-right font-medium tabular-nums">
                          {Number(entry.debit) > 0 ? formatCurrency(entry.debit, currency) : "—"}
                        </td>
                        <td className="py-2.5 px-4 text-right font-semibold tabular-nums text-emerald-600 dark:text-emerald-400">
                          {Number(entry.credit) > 0 ? formatCurrency(entry.credit, currency) : "—"}
                        </td>
                        <td
                          className={`py-2.5 px-4 text-right font-bold tabular-nums ${
                            Number(entry.runningBalance) > 0
                              ? "text-rose-600 dark:text-rose-400"
                              : "text-foreground"
                          }`}
                        >
                          {formatCurrency(entry.runningBalance, currency)}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Record Debt Payment Modal */}
      <Dialog open={payOpen} onOpenChange={setPayOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-emerald-600">
              <CreditCard className="h-5 w-5" /> Record Debt Repayment
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleRecordPayment} className="space-y-4">
            <div className="p-3 bg-muted/40 rounded-lg text-xs space-y-1">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Customer:</span>
                <span className="font-semibold">{customer.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total Balance Owed:</span>
                <span className="font-bold text-rose-600 tabular-nums">
                  {formatCurrency(currentBalance, currency)}
                </span>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="custPayAmt">Payment Amount Received *</Label>
              <Input
                id="custPayAmt"
                type="number"
                step="0.01"
                min={0}
                max={currentBalance}
                value={pmtAmount}
                onChange={(e) => setPmtAmount(e.target.value)}
                autoFocus
                required
              />
              <p className="text-[11px] text-muted-foreground">
                Payment is allocated to the oldest unpaid invoices first (FIFO).
              </p>
            </div>

            <div className="space-y-1.5">
              <Label>Payment Method *</Label>
              <select
                value={pmtMethod}
                onChange={(e) => setPmtMethod(e.target.value)}
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
              <Label htmlFor="custPayNote">Reference / Note (Optional)</Label>
              <Input
                id="custPayNote"
                placeholder="e.g. Bank slip #98124 / cash receipt"
                value={pmtNote}
                onChange={(e) => setPmtNote(e.target.value)}
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
              <Button type="submit" disabled={isPaying || !pmtAmount}>
                {isPaying && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Confirm Payment
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Customer Modal */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Customer Account</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleUpdateCustomer} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="eName">Customer Name *</Label>
              <Input
                id="eName"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="ePhone">Phone</Label>
                <Input
                  id="ePhone"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="eEmail">Email</Label>
                <Input
                  id="eEmail"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="eAddress">Address</Label>
              <Input
                id="eAddress"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="eCredit">Credit Limit ({currency})</Label>
              <Input
                id="eCredit"
                type="number"
                step="0.01"
                min={0}
                placeholder="Leave blank for unlimited"
                value={creditLimit}
                onChange={(e) => setCreditLimit(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="eNotes">Notes</Label>
              <Textarea
                id="eNotes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="h-16"
              />
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setEditOpen(false)}
                disabled={isEditing}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isEditing}>
                {isEditing && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Save Changes
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
