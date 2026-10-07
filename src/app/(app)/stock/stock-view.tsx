"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { receiveStockAction, adjustStockAction } from "@/app/actions/stock.actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { formatCurrency, formatQuantity } from "@/lib/money";
import { formatDate } from "@/lib/format";
import { toast } from "sonner";
import {
  Download,
  Plus,
  SlidersHorizontal,
  ArrowDownToLine,
  TrendingUp,
  TrendingDown,
  Trash2,
  Loader2,
} from "lucide-react";

interface StockViewProps {
  movements: any[];
  total: number;
  totalPages: number;
  currentPage: number;
  products: any[];
  currency: string;
  canReceive: boolean;
  canAdjust: boolean;
  canViewCost: boolean;
  selectedType: string;
}

export function StockView({
  movements,
  total,
  totalPages,
  currentPage,
  products,
  currency,
  canReceive,
  canAdjust,
  canViewCost,
  selectedType,
}: StockViewProps) {
  const router = useRouter();

  // Receive stock dialog state
  const [receiveOpen, setReceiveOpen] = React.useState(false);
  const [receiveSupplier, setReceiveSupplier] = React.useState("");
  const [receiveNote, setReceiveNote] = React.useState("");
  const [receiveItems, setReceiveItems] = React.useState<
    { productId: string; quantity: number; unitCost?: number; updateCostPrice: boolean }[]
  >([]);
  const [isReceiving, setIsReceiving] = React.useState(false);

  // Adjust stock dialog state
  const [adjustOpen, setAdjustOpen] = React.useState(false);
  const [adjProductId, setAdjProductId] = React.useState(products[0]?.id || "");
  const [adjQty, setAdjQty] = React.useState("");
  const [adjReason, setAdjReason] = React.useState("");
  const [isAdjusting, setIsAdjusting] = React.useState(false);

  // Add row to receive stock form
  const addReceiveRow = () => {
    if (products.length === 0) return;
    setReceiveItems([
      ...receiveItems,
      {
        productId: products[0].id,
        quantity: 1,
        unitCost: Number(products[0].costPrice) || 0,
        updateCostPrice: false,
      },
    ]);
  };

  const handleOpenReceive = () => {
    if (receiveItems.length === 0 && products.length > 0) {
      addReceiveRow();
    }
    setReceiveOpen(true);
  };

  const handleReceiveStock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (receiveItems.length === 0) {
      toast.error("Please add at least one item to receive");
      return;
    }

    setIsReceiving(true);
    try {
      const res = await receiveStockAction({
        items: receiveItems,
        supplier: receiveSupplier || undefined,
        note: receiveNote || undefined,
      });

      if (!res.success) {
        toast.error(res.error || "Receiving failed");
        setIsReceiving(false);
        return;
      }

      toast.success(`Successfully received ${res.count} product line items into inventory`);
      setReceiveOpen(false);
      setReceiveItems([]);
      setReceiveSupplier("");
      setReceiveNote("");
      router.refresh();
    } catch (err: any) {
      toast.error(err.message || "Failed to receive stock");
    } finally {
      setIsReceiving(false);
    }
  };

  const handleAdjustStock = async (e: React.FormEvent) => {
    e.preventDefault();
    const qtyChange = parseFloat(adjQty);
    if (isNaN(qtyChange) || qtyChange === 0) {
      toast.error("Quantity change cannot be zero");
      return;
    }
    if (!adjReason.trim() || adjReason.trim().length < 3) {
      toast.error("A reason is mandatory for any stock adjustment (min 3 chars)");
      return;
    }

    setIsAdjusting(true);
    try {
      const res = await adjustStockAction({
        productId: adjProductId,
        qtyChange,
        reason: adjReason.trim(),
      });

      if (!res.success) {
        toast.error(res.error || "Adjustment failed");
        setIsAdjusting(false);
        return;
      }

      toast.success("Stock adjustment successfully applied to ledger");
      setAdjustOpen(false);
      setAdjQty("");
      setAdjReason("");
      router.refresh();
    } catch (err: any) {
      toast.error(err.message || "Adjustment error");
    } finally {
      setIsAdjusting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Stock Ledger</h1>
          <p className="text-sm text-muted-foreground">
            Immutable movement history, incoming inventory purchases, and recount adjustments
          </p>
        </div>

        <div className="flex items-center gap-2">
          <a href="/api/export/movements" download>
            <Button variant="outline" size="sm">
              <Download className="w-4 h-4 mr-2" />
              Export CSV
            </Button>
          </a>
          {canAdjust && (
            <Button variant="secondary" size="sm" onClick={() => setAdjustOpen(true)}>
              <SlidersHorizontal className="w-4 h-4 mr-2" />
              Adjust Stock
            </Button>
          )}
          {canReceive && (
            <Button size="sm" onClick={handleOpenReceive}>
              <ArrowDownToLine className="w-4 h-4 mr-2" />
              Receive Stock
            </Button>
          )}
        </div>
      </div>

      {/* Movement Filter */}
      <div className="flex items-center gap-3">
        <span className="text-xs font-semibold text-muted-foreground uppercase">
          Filter Type:
        </span>
        <select
          value={selectedType}
          onChange={(e) => {
            const val = e.target.value;
            router.push(val === "all" ? "/stock" : `/stock?type=${val}`);
          }}
          className="h-8 rounded-md border text-xs bg-background px-2"
        >
          <option value="all">All Movements</option>
          <option value="purchase">Purchase (Received)</option>
          <option value="sale">Sale</option>
          <option value="sale_void">Sale Return (Void)</option>
          <option value="adjustment_in">Adjustment In</option>
          <option value="adjustment_out">Adjustment Out</option>
          <option value="opening">Opening Stock</option>
        </select>
      </div>

      {/* Movements Ledger Table */}
      <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 border-b text-xs uppercase text-muted-foreground">
              <tr>
                <th className="py-3 px-4 text-left font-medium">Product</th>
                <th className="py-3 px-4 text-left font-medium">SKU</th>
                <th className="py-3 px-4 text-left font-medium">Type</th>
                <th className="py-3 px-4 text-right font-medium">Qty Change</th>
                <th className="py-3 px-4 text-right font-medium">Stock After</th>
                {canViewCost && (
                  <th className="py-3 px-4 text-right font-medium">Unit Cost</th>
                )}
                <th className="py-3 px-4 text-left font-medium">Reason / Supplier</th>
                <th className="py-3 px-4 text-right font-medium">Timestamp</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {movements.length === 0 ? (
                <tr>
                  <td colSpan={canViewCost ? 8 : 7} className="py-12 text-center text-muted-foreground">
                    No stock movements recorded
                  </td>
                </tr>
              ) : (
                movements.map((m) => {
                  const isPositive = Number(m.qtyChange) > 0;
                  return (
                    <tr key={m.id} className="hover:bg-muted/40 transition-colors">
                      <td className="py-3 px-4 font-medium">
                        <Link
                          href={`/products/${m.productId}`}
                          className="hover:underline text-primary"
                        >
                          {m.productName}
                        </Link>
                      </td>
                      <td className="py-3 px-4 font-mono text-xs text-muted-foreground">
                        {m.productSku}
                      </td>
                      <td className="py-3 px-4">
                        <span className="inline-flex items-center gap-1 font-mono text-xs capitalize font-medium">
                          {isPositive ? (
                            <TrendingUp className="h-3.5 w-3.5 text-emerald-600" />
                          ) : (
                            <TrendingDown className="h-3.5 w-3.5 text-rose-600" />
                          )}
                          {m.type.replace("_", " ")}
                        </span>
                      </td>
                      <td
                        className={`py-3 px-4 text-right font-bold tabular-nums ${
                          isPositive
                            ? "text-emerald-600 dark:text-emerald-400"
                            : "text-rose-600 dark:text-rose-400"
                        }`}
                      >
                        {isPositive ? `+${formatQuantity(m.qtyChange)}` : formatQuantity(m.qtyChange)}
                      </td>
                      <td className="py-3 px-4 text-right font-medium tabular-nums">
                        {formatQuantity(m.qtyAfter)}
                      </td>
                      {canViewCost && (
                        <td className="py-3 px-4 text-right tabular-nums text-muted-foreground">
                          {m.unitCost ? formatCurrency(m.unitCost, currency) : "—"}
                        </td>
                      )}
                      <td className="py-3 px-4 text-xs text-muted-foreground">
                        {m.reason || "—"}
                      </td>
                      <td className="py-3 px-4 text-right text-xs text-muted-foreground">
                        {formatDate(m.createdAt, "MMM d, yyyy HH:mm")}
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
              Showing page {currentPage} of {totalPages} ({total} total movements)
            </div>
            <div className="flex gap-1">
              {currentPage > 1 && (
                <Link href={`/stock?page=${currentPage - 1}&type=${selectedType}`}>
                  <Button variant="outline" size="sm" className="h-7 text-xs">
                    Previous
                  </Button>
                </Link>
              )}
              {currentPage < totalPages && (
                <Link href={`/stock?page=${currentPage + 1}&type=${selectedType}`}>
                  <Button variant="outline" size="sm" className="h-7 text-xs">
                    Next
                  </Button>
                </Link>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Receive Stock Dialog */}
      <Dialog open={receiveOpen} onOpenChange={setReceiveOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ArrowDownToLine className="h-5 w-5 text-primary" /> Receive Stock
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleReceiveStock} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="recSupp">Supplier Name (Optional)</Label>
                <Input
                  id="recSupp"
                  placeholder="e.g. Apex Global Trading"
                  value={receiveSupplier}
                  onChange={(e) => setReceiveSupplier(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="recNote">Invoice / Batch Reference</Label>
                <Input
                  id="recNote"
                  placeholder="e.g. PO-9821"
                  value={receiveNote}
                  onChange={(e) => setReceiveNote(e.target.value)}
                />
              </div>
            </div>

            {/* Line items list */}
            <div className="border rounded-xl p-3 space-y-3 bg-muted/10">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase text-muted-foreground">
                  Products to Receive
                </span>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addReceiveRow}
                  className="h-7 text-xs"
                >
                  <Plus className="h-3.5 w-3.5 mr-1" /> Add Product
                </Button>
              </div>

              <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                {receiveItems.map((item, idx) => (
                  <div
                    key={idx}
                    className="p-2.5 rounded-lg border bg-card grid grid-cols-12 gap-2 items-center text-xs"
                  >
                    <div className="col-span-5">
                      <select
                        value={item.productId}
                        onChange={(e) => {
                          const updated = [...receiveItems];
                          updated[idx].productId = e.target.value;
                          const p = products.find((prod) => prod.id === e.target.value);
                          if (p) updated[idx].unitCost = Number(p.costPrice) || 0;
                          setReceiveItems(updated);
                        }}
                        className="w-full h-8 rounded border bg-background px-2 text-xs"
                      >
                        {products.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name} ({p.sku})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="col-span-2">
                      <Input
                        type="number"
                        min="0.001"
                        step="0.001"
                        placeholder="Qty"
                        value={item.quantity}
                        onChange={(e) => {
                          const updated = [...receiveItems];
                          updated[idx].quantity = parseFloat(e.target.value) || 0;
                          setReceiveItems(updated);
                        }}
                        className="h-8 text-xs tabular-nums"
                        required
                      />
                    </div>

                    <div className="col-span-2">
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="Cost"
                        value={item.unitCost ?? ""}
                        onChange={(e) => {
                          const updated = [...receiveItems];
                          updated[idx].unitCost = parseFloat(e.target.value) || 0;
                          setReceiveItems(updated);
                        }}
                        className="h-8 text-xs tabular-nums"
                      />
                    </div>

                    <div className="col-span-2 flex items-center gap-1.5" title="Update product cost price in catalog">
                      <Switch
                        checked={item.updateCostPrice}
                        onCheckedChange={(chk) => {
                          const updated = [...receiveItems];
                          updated[idx].updateCostPrice = chk;
                          setReceiveItems(updated);
                        }}
                      />
                      <span className="text-[10px] text-muted-foreground leading-tight">
                        Update Cost
                      </span>
                    </div>

                    <div className="col-span-1 text-right">
                      <button
                        type="button"
                        onClick={() =>
                          setReceiveItems(receiveItems.filter((_, i) => i !== idx))
                        }
                        className="text-muted-foreground hover:text-destructive transition-colors p-1"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setReceiveOpen(false)}
                disabled={isReceiving}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isReceiving || receiveItems.length === 0}>
                {isReceiving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Confirm Stock Receipt
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Adjust Stock Dialog */}
      <Dialog open={adjustOpen} onOpenChange={setAdjustOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <SlidersHorizontal className="h-5 w-5 text-violet-600" />
              Adjust Stock Level
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAdjustStock} className="space-y-4">
            <div className="space-y-1.5">
              <Label>Select Product *</Label>
              <select
                value={adjProductId}
                onChange={(e) => setAdjProductId(e.target.value)}
                className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-sm"
              >
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.sku}) — Available: {p.stockQty}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="stkAdjQty">
                Quantity Change (+ to add, - to deduct) *
              </Label>
              <Input
                id="stkAdjQty"
                type="number"
                step="0.001"
                placeholder="e.g. -3 for broken units or +10 for recount"
                value={adjQty}
                onChange={(e) => setAdjQty(e.target.value)}
                required
                autoFocus
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="stkAdjReason">Reason (Mandatory) *</Label>
              <Textarea
                id="stkAdjReason"
                placeholder="e.g. Shrinkage / Damaged packaging / Recount adjustment"
                value={adjReason}
                onChange={(e) => setAdjReason(e.target.value)}
                required
              />
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setAdjustOpen(false)}
                disabled={isAdjusting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isAdjusting || !adjQty || !adjReason}>
                {isAdjusting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Save Adjustment
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
