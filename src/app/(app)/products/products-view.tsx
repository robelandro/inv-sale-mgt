"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  createProductAction,
  archiveProductAction,
} from "@/app/actions/products.actions";
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
import { formatCurrency, formatQuantity } from "@/lib/money";
import { getStatusBadgeVariant } from "@/lib/format";
import { toast } from "sonner";
import {
  Plus,
  Search,
  Download,
  Package,
  Loader2,
  Archive,
  Eye,
  SlidersHorizontal,
} from "lucide-react";

interface ProductsViewProps {
  initialProducts: any[];
  total: number;
  totalPages: number;
  currentPage: number;
  categories: any[];
  units: any[];
  currency: string;
  canManage: boolean;
  canViewCost: boolean;
  searchParams: any;
}

export function ProductsView({
  initialProducts,
  total,
  totalPages,
  currentPage,
  categories,
  units,
  currency,
  canManage,
  canViewCost,
  searchParams,
}: ProductsViewProps) {
  const router = useRouter();

  const defaultCategory =
    categories.find((c) => c.name.toLowerCase() === "general") || categories[0];
  const defaultUnit =
    units.find(
      (u) =>
        u.name.toLowerCase() === "pieces" ||
        u.shortName.toLowerCase() === "pcs"
    ) || units[0];

  // Dialog State
  const [createDialogOpen, setCreateDialogOpen] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  // Form State
  const [name, setName] = React.useState("");
  const [sku, setSku] = React.useState("");
  const [barcode, setBarcode] = React.useState("");
  const [categoryId, setCategoryId] = React.useState(defaultCategory?.id || "");
  const [newCategoryName, setNewCategoryName] = React.useState("");
  const [isCustomCategory, setIsCustomCategory] = React.useState(false);
  const [unitId, setUnitId] = React.useState(defaultUnit?.id || "");
  const [costPrice, setCostPrice] = React.useState("0.00");
  const [sellingPrice, setSellingPrice] = React.useState("0.00");
  const [initialStock, setInitialStock] = React.useState("0");
  const [lowStockThreshold, setLowStockThreshold] = React.useState("5");
  const [description, setDescription] = React.useState("");

  const handleSearch = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const q = formData.get("q") as string;
    const cat = formData.get("category") as string;
    const stock = formData.get("stock") as string;

    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (cat && cat !== "all") params.set("category", cat);
    if (stock && stock !== "all") params.set("stock", stock);

    router.push(`/products?${params.toString()}`);
  };

  const handleCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Product name is required");
      return;
    }

    if (isCustomCategory && !newCategoryName.trim()) {
      toast.error("Please enter a category name");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await createProductAction({
        name,
        sku: sku || undefined,
        barcode: barcode || undefined,
        categoryId: isCustomCategory ? undefined : categoryId || undefined,
        newCategoryName: isCustomCategory ? newCategoryName.trim() : undefined,
        unitId: unitId || undefined,
        costPrice: parseFloat(costPrice) || 0,
        sellingPrice: parseFloat(sellingPrice) || 0,
        initialStock: parseFloat(initialStock) || 0,
        lowStockThreshold: parseInt(lowStockThreshold) || 5,
        description: description || undefined,
      });

      if (!res.success) {
        toast.error(res.error || "Failed to create product");
        setIsSubmitting(false);
        return;
      }

      toast.success(`Product "${res.product?.name}" created successfully`);
      setCreateDialogOpen(false);
      // Reset form
      setName("");
      setSku("");
      setBarcode("");
      setCategoryId(defaultCategory?.id || "");
      setNewCategoryName("");
      setIsCustomCategory(false);
      setUnitId(defaultUnit?.id || "");
      setCostPrice("0.00");
      setSellingPrice("0.00");
      setInitialStock("0");
      setLowStockThreshold("5");
      setDescription("");
      setBarcode("");
      setCostPrice("0.00");
      setSellingPrice("0.00");
      setInitialStock("0");
      setDescription("");
      router.refresh();
    } catch (err: any) {
      toast.error(err.message || "Something went wrong");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleArchive = async (id: string, prodName: string) => {
    if (!confirm(`Are you sure you want to archive "${prodName}"?`)) return;

    try {
      const res = await archiveProductAction(id);
      if (!res.success) {
        toast.error(res.error || "Failed to archive product");
        return;
      }
      toast.success(
        "archived" in res && res.archived
          ? `Product "${prodName}" archived`
          : `Product "${prodName}" deleted`
      );
      router.refresh();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Products Catalog</h1>
          <p className="text-sm text-muted-foreground">
            Inventory master records, current stock quantities, and pricing
          </p>
        </div>

        <div className="flex items-center gap-2">
          <a href="/api/export/products" download>
            <Button variant="outline" size="sm">
              <Download className="w-4 h-4 mr-2" />
              Export CSV
            </Button>
          </a>
          {canManage && (
            <Button size="sm" onClick={() => setCreateDialogOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              New Product
            </Button>
          )}
        </div>
      </div>

      {/* Filter and Search Bar */}
      <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            name="q"
            defaultValue={searchParams.q || ""}
            placeholder="Search products by name, SKU, or barcode..."
            className="pl-9"
          />
        </div>

        <div className="flex gap-2">
          <select
            name="category"
            defaultValue={searchParams.category || "all"}
            className="h-9 rounded-md border border-input bg-background px-3 py-1 text-xs"
          >
            <option value="all">All Categories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>

          <select
            name="stock"
            defaultValue={searchParams.stock || "all"}
            className="h-9 rounded-md border border-input bg-background px-3 py-1 text-xs"
          >
            <option value="all">All Stock Statuses</option>
            <option value="in_stock">In Stock</option>
            <option value="low">Low Stock</option>
            <option value="out">Out of Stock</option>
          </select>

          <Button type="submit" variant="secondary" size="sm" className="h-9">
            Filter
          </Button>
        </div>
      </form>

      {/* Products Table */}
      <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 border-b">
              <tr className="text-xs uppercase text-muted-foreground">
                <th className="py-3 px-4 text-left font-medium">Product</th>
                <th className="py-3 px-4 text-left font-medium">SKU / Barcode</th>
                <th className="py-3 px-4 text-left font-medium">Category</th>
                <th className="py-3 px-4 text-right font-medium">Stock Qty</th>
                {canViewCost && (
                  <th className="py-3 px-4 text-right font-medium">Cost Price</th>
                )}
                <th className="py-3 px-4 text-right font-medium">Selling Price</th>
                <th className="py-3 px-4 text-center font-medium">Status</th>
                <th className="py-3 px-4 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {initialProducts.length === 0 ? (
                <tr>
                  <td
                    colSpan={canViewCost ? 8 : 7}
                    className="py-12 text-center text-muted-foreground"
                  >
                    No products found matching criteria
                  </td>
                </tr>
              ) : (
                initialProducts.map((p) => {
                  const badge = getStatusBadgeVariant(p.stockStatus);
                  return (
                    <tr key={p.id} className="hover:bg-muted/40 transition-colors">
                      <td className="py-3 px-4 font-medium">
                        <Link
                          href={`/products/${p.id}`}
                          className="hover:underline text-foreground hover:text-primary transition-colors flex items-center gap-2"
                        >
                          <Package className="h-4 w-4 text-muted-foreground shrink-0" />
                          <span>{p.name}</span>
                        </Link>
                      </td>
                      <td className="py-3 px-4 font-mono text-xs text-muted-foreground">
                        <div>{p.sku}</div>
                        {p.barcode && (
                          <div className="text-[10px] text-muted-foreground/70">
                            {p.barcode}
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-4 text-xs text-muted-foreground">
                        {p.categoryName || "—"}
                      </td>
                      <td className="py-3 px-4 text-right font-semibold tabular-nums">
                        {formatQuantity(p.stockQty)}{" "}
                        <span className="text-xs font-normal text-muted-foreground">
                          {p.unitShortName || ""}
                        </span>
                      </td>
                      {canViewCost && (
                        <td className="py-3 px-4 text-right tabular-nums text-muted-foreground">
                          {formatCurrency(p.costPrice, currency)}
                        </td>
                      )}
                      <td className="py-3 px-4 text-right font-bold tabular-nums">
                        {formatCurrency(p.sellingPrice, currency)}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium border ${badge.className}`}
                        >
                          {badge.label}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right space-x-1">
                        <Link href={`/products/${p.id}`}>
                          <Button variant="ghost" size="sm" className="h-7 text-xs">
                            <Eye className="h-3.5 w-3.5 mr-1" /> View
                          </Button>
                        </Link>
                        {canManage && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleArchive(p.id, p.name)}
                            className="h-7 text-xs text-muted-foreground hover:text-destructive"
                            title="Archive product"
                          >
                            <Archive className="h-3.5 w-3.5" />
                          </Button>
                        )}
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
              Showing page {currentPage} of {totalPages} ({total} total products)
            </div>
            <div className="flex gap-1">
              {currentPage > 1 && (
                <Link href={`/products?page=${currentPage - 1}`}>
                  <Button variant="outline" size="sm" className="h-7 text-xs">
                    Previous
                  </Button>
                </Link>
              )}
              {currentPage < totalPages && (
                <Link href={`/products?page=${currentPage + 1}`}>
                  <Button variant="outline" size="sm" className="h-7 text-xs">
                    Next
                  </Button>
                </Link>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Create Product Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Add New Product</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreateProduct} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="prodName">Product Name *</Label>
              <Input
                id="prodName"
                placeholder="e.g. Wireless Barcode Scanner"
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoFocus
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="prodSku">SKU (Auto-generated if empty)</Label>
                <Input
                  id="prodSku"
                  placeholder="e.g. WBS-001"
                  value={sku}
                  onChange={(e) => setSku(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="prodBar">Barcode (Optional)</Label>
                <Input
                  id="prodBar"
                  placeholder="e.g. 890123456789"
                  value={barcode}
                  onChange={(e) => setBarcode(e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="prodCat">Category</Label>
                  <button
                    type="button"
                    onClick={() => {
                      setIsCustomCategory(!isCustomCategory);
                      if (!isCustomCategory) setNewCategoryName("");
                    }}
                    className="text-xs text-primary hover:underline font-medium"
                  >
                    {isCustomCategory ? "Choose existing" : "+ Other category"}
                  </button>
                </div>
                {isCustomCategory ? (
                  <Input
                    id="newCat"
                    placeholder="Enter new category name..."
                    value={newCategoryName}
                    onChange={(e) => setNewCategoryName(e.target.value)}
                    autoFocus
                    required
                  />
                ) : (
                  <select
                    id="prodCat"
                    value={categoryId}
                    onChange={(e) => {
                      if (e.target.value === "__custom__") {
                        setIsCustomCategory(true);
                        setNewCategoryName("");
                      } else {
                        setCategoryId(e.target.value);
                      }
                    }}
                    className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-sm"
                  >
                    <option value="">Select Category...</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                    <option value="__custom__">+ Other / Enter New Category...</option>
                  </select>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="prodUnit">Unit</Label>
                <select
                  id="prodUnit"
                  value={unitId}
                  onChange={(e) => setUnitId(e.target.value)}
                  className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-sm"
                >
                  <option value="">Select Unit...</option>
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
                <Label htmlFor="costPrice">Cost Price ({currency})</Label>
                <Input
                  id="costPrice"
                  type="number"
                  step="0.01"
                  min={0}
                  value={costPrice}
                  onChange={(e) => setCostPrice(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="sellingPrice">Selling Price ({currency}) *</Label>
                <Input
                  id="sellingPrice"
                  type="number"
                  step="0.01"
                  min={0}
                  value={sellingPrice}
                  onChange={(e) => setSellingPrice(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 border-t pt-3">
              <div className="space-y-1.5">
                <Label htmlFor="initStock">Initial Stock Quantity</Label>
                <Input
                  id="initStock"
                  type="number"
                  step="0.001"
                  min={0}
                  value={initialStock}
                  onChange={(e) => setInitialStock(e.target.value)}
                />
                <p className="text-[11px] text-muted-foreground">
                  Creates an opening stock movement
                </p>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="lowThresh">Low Stock Threshold</Label>
                <Input
                  id="lowThresh"
                  type="number"
                  min={0}
                  value={lowStockThreshold}
                  onChange={(e) => setLowStockThreshold(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="desc">Description (Optional)</Label>
              <Textarea
                id="desc"
                placeholder="Product specifications or notes..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="h-16"
              />
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setCreateDialogOpen(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Save Product
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
