"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  updateProductAction,
  archiveProductAction,
} from "@/app/actions/products.actions";
import { adjustStockAction } from "@/app/actions/stock.actions";
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
import { formatCurrency, formatQuantity } from "@/lib/money";
import { formatDate, getStatusBadgeVariant } from "@/lib/format";
import { toast } from "sonner";
import { useTranslation } from "@/lib/i18n/context";
import {
  ArrowLeft,
  Package,
  SlidersHorizontal,
  Edit,
  Archive,
  History,
  TrendingDown,
  TrendingUp,
  Loader2,
} from "lucide-react";

export function ProductDetailView({
  product,
  movements,
  categories,
  units,
  currency,
  canManage,
  canViewCost,
  canAdjustStock,
}: {
  product: any;
  movements: any[];
  categories: any[];
  units: any[];
  currency: string;
  canManage: boolean;
  canViewCost: boolean;
  canAdjustStock: boolean;
}) {
  const router = useRouter();
  const { t } = useTranslation();
  const statusBadge = getStatusBadgeVariant(product.stockStatus);

  // Adjust stock state
  const [adjustOpen, setAdjustOpen] = React.useState(false);
  const [adjustQty, setAdjustQty] = React.useState("");
  const [adjustReason, setAdjustReason] = React.useState("");
  const [isAdjusting, setIsAdjusting] = React.useState(false);

  // Edit product state
  const [editOpen, setEditOpen] = React.useState(false);
  const [name, setName] = React.useState(product.name);
  const [sku, setSku] = React.useState(product.sku);
  const [barcode, setBarcode] = React.useState(product.barcode || "");
  const [categoryId, setCategoryId] = React.useState(product.categoryId || "");
  const [unitId, setUnitId] = React.useState(product.unitId || "");
  const [costPrice, setCostPrice] = React.useState(product.costPrice || "0.00");
  const [sellingPrice, setSellingPrice] = React.useState(product.sellingPrice || "0.00");
  const [lowStockThreshold, setLowStockThreshold] = React.useState(
    product.lowStockThreshold?.toString() || "5"
  );
  const [description, setDescription] = React.useState(product.description || "");
  const [isEditing, setIsEditing] = React.useState(false);

  const handleAdjustStock = async (e: React.FormEvent) => {
    e.preventDefault();
    const qtyChange = parseFloat(adjustQty);
    if (isNaN(qtyChange) || qtyChange === 0) {
      toast.error("Please enter a valid non-zero quantity change");
      return;
    }
    if (!adjustReason.trim() || adjustReason.trim().length < 3) {
      toast.error("A reason is mandatory for any stock adjustment (min 3 chars)");
      return;
    }

    setIsAdjusting(true);
    try {
      const res = await adjustStockAction({
        productId: product.id,
        qtyChange,
        reason: adjustReason.trim(),
      });

      if (!res.success) {
        toast.error(res.error || "Adjustment failed");
        setIsAdjusting(false);
        return;
      }

      toast.success("Stock adjustment applied successfully");
      setAdjustOpen(false);
      setAdjustQty("");
      setAdjustReason("");
      router.refresh();
    } catch (err: any) {
      toast.error(err.message || "Adjustment error");
    } finally {
      setIsAdjusting(false);
    }
  };

  const handleEditProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Product name is required");
      return;
    }

    setIsEditing(true);
    try {
      const res = await updateProductAction(product.id, {
        name,
        sku,
        barcode: barcode || undefined,
        categoryId: categoryId || undefined,
        unitId: unitId || undefined,
        costPrice: parseFloat(costPrice) || 0,
        sellingPrice: parseFloat(sellingPrice) || 0,
        lowStockThreshold: parseInt(lowStockThreshold) || 5,
        description: description || undefined,
      });

      if (!res.success) {
        toast.error(res.error || "Update failed");
        setIsEditing(false);
        return;
      }

      toast.success("Product updated successfully");
      setEditOpen(false);
      router.refresh();
    } catch (err: any) {
      toast.error(err.message || "Failed to update product");
    } finally {
      setIsEditing(false);
    }
  };

  const handleArchive = async () => {
    if (!confirm(`Are you sure you want to archive "${product.name}"?`)) return;
    try {
      const res = await archiveProductAction(product.id);
      if (!res.success) {
        toast.error(res.error || "Failed to archive product");
        return;
      }
      toast.success(
        "archived" in res && res.archived ? "Product archived" : "Product deleted from catalog"
      );
      router.push("/products");
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link href="/products">
            <Button variant="outline" size="sm">
              <ArrowLeft className="w-4 h-4 mr-1" /> {t.products?.title || "Products"}
            </Button>
          </Link>
          <div>
            <h1 className="text-xl font-bold tracking-tight flex items-center gap-2">
              {product.name}
              <span
                className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold border ${statusBadge.className}`}
              >
                {statusBadge.label}
              </span>
            </h1>
            <p className="text-xs text-muted-foreground font-mono">
              {t.products?.sku || "SKU"}: {product.sku} {product.barcode && `• ${t.products?.barcode || "Barcode"}: ${product.barcode}`}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {canAdjustStock && (
            <Button size="sm" variant="outline" onClick={() => setAdjustOpen(true)}>
              <SlidersHorizontal className="w-4 h-4 mr-2" />
              {t.stock?.adjustStock || "Adjust Stock"}
            </Button>
          )}

          {canManage && (
            <>
              <Button size="sm" variant="secondary" onClick={() => setEditOpen(true)}>
                <Edit className="w-4 h-4 mr-2" />
                {t.common?.edit || "Edit"}
              </Button>
              <Button size="sm" variant="ghost" onClick={handleArchive} className="text-destructive hover:bg-destructive/10">
                <Archive className="w-4 h-4" />
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Product Summary Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="rounded-card border shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold uppercase text-muted-foreground">
              {t.products?.stockQty || "Current Stock"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold tabular-nums text-foreground">
              {formatQuantity(product.stockQty)}{" "}
              <span className="text-sm font-normal text-muted-foreground">
                {product.unitShortName || "units"}
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {t.products?.lowStockThreshold || "Threshold"}: {product.lowStockThreshold ?? 5}
            </p>
          </CardContent>
        </Card>

        <Card className="rounded-card border shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold uppercase text-muted-foreground">
              {t.products?.sellingPrice || "Selling Price"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold tabular-nums text-foreground">
              {formatCurrency(product.sellingPrice, currency)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {t.reports?.retailDesc || "Active retail unit price"}
            </p>
          </CardContent>
        </Card>

        {canViewCost && (
          <Card className="rounded-card border shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-semibold uppercase text-muted-foreground">
                {t.products?.costPrice || "Cost Price"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold tabular-nums text-muted-foreground">
                {formatCurrency(product.costPrice, currency)}
              </div>
              <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium mt-1">
                {t.reports?.margin || "Margin"}:{" "}
                {Number(product.sellingPrice) > 0
                  ? (
                      ((Number(product.sellingPrice) - Number(product.costPrice)) /
                        Number(product.sellingPrice)) *
                      100
                    ).toFixed(1)
                  : "0.0"}
                %
              </p>
            </CardContent>
          </Card>
        )}

        <Card className="rounded-card border shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold uppercase text-muted-foreground">
              {t.products?.category || "Category"} & {t.products?.unit || "Unit"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-base font-semibold text-foreground">
              {product.categoryName || "General"}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {t.products?.unit || "Unit"}: {product.unitName || "Pieces"} ({product.unitShortName || "pcs"})
            </p>
          </CardContent>
        </Card>
      </div>

      {product.description && (
        <Card className="rounded-card border shadow-sm p-4 text-sm">
          <span className="font-semibold text-xs uppercase text-muted-foreground block mb-1">
            {t.products.description}
          </span>
          <p className="text-muted-foreground">{product.description}</p>
        </Card>
      )}

      {/* Stock Movement Ledger History */}
      <Card className="rounded-card border shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <History className="h-4 w-4 text-primary" />
              {t.stock?.movementHistory || "Stock Movement Ledger"}
            </CardTitle>
            <CardDescription className="text-xs">
              {t.stock?.subtitle || "Complete immutable ledger of all stock additions, sales, and manual adjustments"}
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b text-xs uppercase text-muted-foreground font-medium bg-muted/30">
                <tr>
                  <th className="py-2.5 px-4 text-left font-medium">{t.stock?.type || "Type"}</th>
                  <th className="py-2.5 px-4 text-right font-medium">{t.stock?.qtyChange || "Qty Change"}</th>
                  <th className="py-2.5 px-4 text-right font-medium">{t.stock?.qtyAfter || "Stock After"}</th>
                  <th className="py-2.5 px-4 text-left font-medium">{t.stock?.reasonRef || "Reason / Note"}</th>
                  <th className="py-2.5 px-4 text-right font-medium">{t.common?.date || "Timestamp"}</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {movements.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-muted-foreground text-xs">
                      {t.common?.noData || "No stock movement history recorded for this product yet."}
                    </td>
                  </tr>
                ) : (
                  movements.map((m) => {
                    const isPositive = Number(m.qtyChange) > 0;
                    return (
                      <tr key={m.id} className="hover:bg-muted/20">
                        <td className="py-2.5 px-4">
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
                          className={`py-2.5 px-4 text-right font-semibold tabular-nums ${
                            isPositive
                              ? "text-emerald-600 dark:text-emerald-400"
                              : "text-rose-600 dark:text-rose-400"
                          }`}
                        >
                          {isPositive ? `+${formatQuantity(m.qtyChange)}` : formatQuantity(m.qtyChange)}
                        </td>
                        <td className="py-2.5 px-4 text-right font-medium tabular-nums">
                          {formatQuantity(m.qtyAfter)}
                        </td>
                        <td className="py-2.5 px-4 text-xs text-muted-foreground">
                          {m.reason || "—"}
                        </td>
                        <td className="py-2.5 px-4 text-right text-xs text-muted-foreground">
                          {formatDate(m.createdAt, "MMM d, yyyy HH:mm")}
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

      {/* Adjust Stock Dialog */}
      <Dialog open={adjustOpen} onOpenChange={setAdjustOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t.stock?.adjustStock || "Adjust Stock"} — {product.name}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAdjustStock} className="space-y-4">
            <div className="p-3 bg-muted/40 rounded-lg text-xs space-y-1">
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t.products?.stockQty || "Current Stock"}:</span>
                <span className="font-semibold tabular-nums">{product.stockQty} {product.unitShortName}</span>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="adjQty">
                {t.stock?.qtyChangeHelp || "Quantity Change (+ to increase, - to decrease)"} *
              </Label>
              <Input
                id="adjQty"
                type="number"
                step="0.001"
                placeholder="e.g. -2 for damage or +5 for recount"
                value={adjustQty}
                onChange={(e) => setAdjustQty(e.target.value)}
                autoFocus
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="adjReason">
                {t.stock?.reasonRequired || "Reason (Mandatory)"} *
              </Label>
              <Textarea
                id="adjReason"
                placeholder={t.stock?.reasonPlaceholder || "e.g. Broken in warehouse during transit / Recount variance"}
                value={adjustReason}
                onChange={(e) => setAdjustReason(e.target.value)}
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
                {t.common?.cancel || "Cancel"}
              </Button>
              <Button type="submit" disabled={isAdjusting || !adjustQty || !adjustReason}>
                {isAdjusting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                {t.stock?.confirmAdjustment || "Confirm Adjustment"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Product Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{t.products?.editProduct || "Edit Product Details"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleEditProduct} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="editName">{t.products?.productName || "Product Name"} *</Label>
              <Input
                id="editName"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="editSku">{t.products?.sku || "SKU"} *</Label>
                <Input
                  id="editSku"
                  value={sku}
                  onChange={(e) => setSku(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="editBar">{t.products?.barcode || "Barcode"}</Label>
                <Input
                  id="editBar"
                  value={barcode}
                  onChange={(e) => setBarcode(e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>{t.products?.category || "Category"}</Label>
                <select
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-sm"
                >
                  <option value="">{t.products?.selectCategory || "Select Category..."}</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <Label>{t.products?.unit || "Unit"}</Label>
                <select
                  value={unitId}
                  onChange={(e) => setUnitId(e.target.value)}
                  className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-sm"
                >
                  <option value="">{t.common?.optional || "Select Unit..."}</option>
                  {units.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name} ({u.shortName})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>{t.products?.costPrice || "Cost Price"} ({currency})</Label>
                <Input
                  type="number"
                  step="0.01"
                  min={0}
                  value={costPrice}
                  onChange={(e) => setCostPrice(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label>{t.products?.sellingPrice || "Selling Price"} ({currency}) *</Label>
                <Input
                  type="number"
                  step="0.01"
                  min={0}
                  value={sellingPrice}
                  onChange={(e) => setSellingPrice(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>{t.products?.lowStockThreshold || "Low Stock Threshold"}</Label>
              <Input
                type="number"
                min={0}
                value={lowStockThreshold}
                onChange={(e) => setLowStockThreshold(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label>{t.products?.description || "Description"}</Label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
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
                {t.common?.cancel || "Cancel"}
              </Button>
              <Button type="submit" disabled={isEditing}>
                {isEditing && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                {t.common?.save || "Save Changes"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
