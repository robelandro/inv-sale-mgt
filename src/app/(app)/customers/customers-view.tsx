"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createCustomerAction } from "@/app/actions/customers.actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import { Plus, Search, User, Phone, Mail, Loader2, Eye } from "lucide-react";

interface CustomersViewProps {
  customers: any[];
  total: number;
  totalPages: number;
  currentPage: number;
  currency: string;
  canManage: boolean;
  searchQuery: string;
}

export function CustomersView({
  customers,
  total,
  totalPages,
  currentPage,
  currency,
  canManage,
  searchQuery,
}: CustomersViewProps) {
  const router = useRouter();

  // Create Customer Dialog State
  const [createOpen, setCreateOpen] = React.useState(false);
  const [name, setName] = React.useState("");
  const [phone, setPhone] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [address, setAddress] = React.useState("");
  const [notes, setNotes] = React.useState("");
  const [creditLimit, setCreditLimit] = React.useState("");
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const handleSearch = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const q = fd.get("q") as string;
    router.push(q ? `/customers?q=${encodeURIComponent(q)}` : "/customers");
  };

  const handleCreateCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Customer name is required");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await createCustomerAction({
        name,
        phone: phone || undefined,
        email: email || undefined,
        address: address || undefined,
        notes: notes || undefined,
        creditLimit: creditLimit ? parseFloat(creditLimit) : undefined,
      });

      if (!res.success) {
        toast.error(res.error || "Failed to create customer");
        setIsSubmitting(false);
        return;
      }

      toast.success(`Customer "${name}" created successfully`);
      setCreateOpen(false);
      setName("");
      setPhone("");
      setEmail("");
      setAddress("");
      setNotes("");
      setCreditLimit("");
      router.refresh();
    } catch (err: any) {
      toast.error(err.message || "Something went wrong");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Customers Directory</h1>
          <p className="text-sm text-muted-foreground">
            Customer balances, debt ledgers, and contact information
          </p>
        </div>

        {canManage && (
          <Button size="sm" onClick={() => setCreateOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Add Customer
          </Button>
        )}
      </div>

      {/* Search Bar */}
      <form onSubmit={handleSearch} className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            name="q"
            defaultValue={searchQuery}
            placeholder="Search by customer name, phone number, or email..."
            className="pl-9"
          />
        </div>
        <Button type="submit" variant="secondary" size="sm">
          Search
        </Button>
      </form>

      {/* Customers Table */}
      <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 border-b text-xs uppercase text-muted-foreground">
              <tr>
                <th className="py-3 px-4 text-left font-medium">Customer Name</th>
                <th className="py-3 px-4 text-left font-medium">Contact</th>
                <th className="py-3 px-4 text-left font-medium">Address</th>
                <th className="py-3 px-4 text-right font-medium">Credit Limit</th>
                <th className="py-3 px-4 text-right font-medium">Outstanding Owed</th>
                <th className="py-3 px-4 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {customers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-muted-foreground">
                    No customers found matching search criteria
                  </td>
                </tr>
              ) : (
                customers.map((c) => {
                  const owes = Number(c.totalOwed) > 0;
                  return (
                    <tr key={c.id} className="hover:bg-muted/40 transition-colors">
                      <td className="py-3 px-4 font-medium">
                        <Link
                          href={`/customers/${c.id}`}
                          className="hover:underline text-foreground hover:text-primary transition-colors flex items-center gap-2"
                        >
                          <User className="h-4 w-4 text-muted-foreground shrink-0" />
                          <span>{c.name}</span>
                          {c.isWalkIn && (
                            <span className="text-[10px] bg-muted px-1.5 py-0.5 rounded text-muted-foreground">
                              Walk-in
                            </span>
                          )}
                        </Link>
                      </td>
                      <td className="py-3 px-4 text-xs text-muted-foreground space-y-0.5">
                        {c.phone && (
                          <div className="flex items-center gap-1">
                            <Phone className="h-3 w-3" />
                            <span>{c.phone}</span>
                          </div>
                        )}
                        {c.email && (
                          <div className="flex items-center gap-1">
                            <Mail className="h-3 w-3" />
                            <span>{c.email}</span>
                          </div>
                        )}
                        {!c.phone && !c.email && <span>—</span>}
                      </td>
                      <td className="py-3 px-4 text-xs text-muted-foreground truncate max-w-[200px]">
                        {c.address || "—"}
                      </td>
                      <td className="py-3 px-4 text-right text-xs tabular-nums text-muted-foreground">
                        {c.creditLimit ? formatCurrency(c.creditLimit, currency) : "No limit"}
                      </td>
                      <td
                        className={`py-3 px-4 text-right font-bold tabular-nums ${
                          owes ? "text-rose-600 dark:text-rose-400" : "text-muted-foreground"
                        }`}
                      >
                        {formatCurrency(c.totalOwed, currency)}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <Link href={`/customers/${c.id}`}>
                          <Button variant="ghost" size="sm" className="h-7 text-xs">
                            <Eye className="h-3.5 w-3.5 mr-1" /> Ledger
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

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t bg-muted/20 text-xs text-muted-foreground">
            <div>
              Showing page {currentPage} of {totalPages} ({total} total customers)
            </div>
            <div className="flex gap-1">
              {currentPage > 1 && (
                <Link href={`/customers?page=${currentPage - 1}&q=${searchQuery}`}>
                  <Button variant="outline" size="sm" className="h-7 text-xs">
                    Previous
                  </Button>
                </Link>
              )}
              {currentPage < totalPages && (
                <Link href={`/customers?page=${currentPage + 1}&q=${searchQuery}`}>
                  <Button variant="outline" size="sm" className="h-7 text-xs">
                    Next
                  </Button>
                </Link>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Add Customer Modal */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add Customer Account</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreateCustomer} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="custName">Customer Full Name *</Label>
              <Input
                id="custName"
                placeholder="e.g. John Doe / Metro Traders"
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoFocus
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="custPhone">Phone Number</Label>
                <Input
                  id="custPhone"
                  placeholder="+1 555-0102"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="custEmail">Email Address</Label>
                <Input
                  id="custEmail"
                  type="email"
                  placeholder="john@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="custAddr">Physical Address</Label>
              <Input
                id="custAddr"
                placeholder="Street address / City"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="custCredit">Credit Limit ({currency})</Label>
              <Input
                id="custCredit"
                type="number"
                step="0.01"
                min={0}
                placeholder="Leave blank for unlimited"
                value={creditLimit}
                onChange={(e) => setCreditLimit(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="custNotes">Notes (Optional)</Label>
              <Textarea
                id="custNotes"
                placeholder="Special credit terms, delivery notes, etc."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="h-16"
              />
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setCreateOpen(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting || !name.trim()}>
                {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Save Customer
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
