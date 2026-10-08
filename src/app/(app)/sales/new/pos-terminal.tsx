"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { createSaleAction } from "@/app/actions/sales.actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { formatCurrency, toCents, fromCents } from "@/lib/money";
import { toast } from "sonner";
import {
  Search,
  Barcode,
  Plus,
  Minus,
  Trash2,
  Printer,
  CheckCircle,
  CreditCard,
  User,
  AlertCircle,
  Loader2,
  Calendar,
  WifiOff,
  CloudUpload,
} from "lucide-react";
import { useTranslation } from "@/lib/i18n/context";
import { usePosStore, type CartItem } from "@/lib/store/pos-store";
import { useSyncStore } from "@/lib/store/sync-store";
import {
  cacheProducts,
  cacheCustomers,
  getCachedProducts,
  getCachedCustomers,
  queueOfflineSale,
} from "@/lib/offline/db";

export function PosTerminal({
  products,
  customers,
  company,
  canDiscount,
}: {
  products: any[];
  customers: any[];
  company: any;
  canDiscount: boolean;
}) {
  const router = useRouter();
  const { t } = useTranslation();
  const currency = company?.currency || "USD";
  const taxEnabled = company?.taxEnabled ?? false;
  const taxRate = company ? Number(company.taxRate) : 0;
  const allowNegativeStock = company?.allowNegativeStock ?? false;
  const allowCredit = company?.allowCredit ?? true;

  // Zustand POS store
  const {
    cart,
    searchQuery,
    selectedCustomerId,
    paymentType,
    paymentMethod,
    partialAmountPaid,
    wholesaleDiscount,
    dueDate,
    debtCustomerName,
    debtCustomerPhone,
    notes,
    isSubmitting,
    completedSale,
    receiptOpen,
    setSearchQuery,
    setSelectedCustomerId,
    setPaymentType,
    setPaymentMethod,
    setPartialAmountPaid,
    setWholesaleDiscount,
    setDueDate,
    setDebtCustomerName,
    setDebtCustomerPhone,
    setNotes,
    setIsSubmitting,
    setCompletedSale,
    setReceiptOpen,
    addToCart: addProductToCart,
    updateQty: updateItemQty,
    updateItemPrice,
    updateItemDiscount,
    removeFromCart: removeItemFromCart,
    clearCart,
    resetPos,
  } = usePosStore();

  // Zustand Sync store
  const isOnline = useSyncStore((s) => s.isOnline);
  const refreshPendingCount = useSyncStore((s) => s.refreshPendingCount);

  // Cached state fallback for offline initialization
  const [displayProducts, setDisplayProducts] = React.useState<any[]>(products);
  const [displayCustomers, setDisplayCustomers] = React.useState<any[]>(customers);

  const walkInCustomer = displayCustomers.find((c) => c.isWalkIn) || displayCustomers[0];

  React.useEffect(() => {
    // If walk-in customer is not selected yet, select it
    if (!selectedCustomerId && walkInCustomer?.id) {
      setSelectedCustomerId(walkInCustomer.id);
    }

    // Cache to IndexedDB or load from IndexedDB if offline
    if (products && products.length > 0) {
      cacheProducts(products);
      setDisplayProducts(products);
    } else {
      getCachedProducts().then((cached) => {
        if (cached && cached.length > 0) {
          setDisplayProducts(cached);
        }
      });
    }

    if (customers && customers.length > 0) {
      cacheCustomers(customers);
      setDisplayCustomers(customers);
    } else {
      getCachedCustomers().then((cached) => {
        if (cached && cached.length > 0) {
          setDisplayCustomers(cached);
        }
      });
    }
  }, [products, customers]);

  const selectedCustomer = displayCustomers.find((c) => c.id === selectedCustomerId);
  const isWalkIn = selectedCustomer?.isWalkIn ?? false;

  // Filter products by search
  const filteredProducts = React.useMemo(() => {
    if (!searchQuery.trim()) return displayProducts.slice(0, 15);
    const q = searchQuery.toLowerCase().trim();
    return displayProducts
      .filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.sku.toLowerCase().includes(q) ||
          (p.barcode && p.barcode.toLowerCase().includes(q))
      )
      .slice(0, 20);
  }, [displayProducts, searchQuery]);

  // Barcode / exact SKU hit
  const handleBarcodeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    const match = displayProducts.find(
      (p) =>
        p.barcode?.toLowerCase() === searchQuery.toLowerCase().trim() ||
        p.sku?.toLowerCase() === searchQuery.toLowerCase().trim()
    );
    if (match) {
      addProductToCart(match, allowNegativeStock);
      setSearchQuery("");
    }
  };

  const addToCart = (product: any) => {
    addProductToCart(product, allowNegativeStock);
  };

  const updateCartItemQty = (index: number, newQty: number) => {
    const item = cart[index];
    if (!item) return;
    updateItemQty(item.productId, newQty, allowNegativeStock);
  };

  const updateCartItemPrice = (index: number, price: number) => {
    const item = cart[index];
    if (!item) return;
    updateItemPrice(item.productId, price);
  };

  const updateCartItemDiscount = (index: number, disc: number) => {
    const item = cart[index];
    if (!item) return;
    updateItemDiscount(item.productId, disc);
  };

  const removeFromCart = (index: number) => {
    const item = cart[index];
    if (!item) return;
    removeItemFromCart(item.productId);
  };

  // Calculations
  const subtotalCents = cart.reduce(
    (sum, item) => sum + Math.round(item.qty * toCents(item.unitPrice)),
    0
  );
  const lineDiscountsCents = cart.reduce(
    (sum, item) => sum + toCents(item.discount),
    0
  );
  const wholesaleDiscountCents = toCents(wholesaleDiscount);
  const totalDiscountsCents = lineDiscountsCents + wholesaleDiscountCents;
  const taxableAmountCents = Math.max(0, subtotalCents - totalDiscountsCents);

  let taxCents = 0;
  if (taxEnabled && taxRate > 0) {
    taxCents = Math.round((taxableAmountCents * taxRate) / 100);
  }

  const grandTotalCents = taxableAmountCents + taxCents;

  let amountPaidCents = grandTotalCents;
  if (paymentType === "credit") {
    amountPaidCents = 0;
  } else if (paymentType === "partial") {
    amountPaidCents = Math.min(grandTotalCents, toCents(partialAmountPaid || 0));
  }

  const balanceDueCents = grandTotalCents - amountPaidCents;

  const handleCheckout = async () => {
    if (cart.length === 0) {
      toast.error("Cart is empty");
      return;
    }

    if (balanceDueCents > 0) {
      if (!allowCredit) {
        toast.error("Credit sales are disabled in company settings.");
        return;
      }
      if (isWalkIn && !debtCustomerName.trim()) {
        toast.error("Please enter the customer name for credit/debt sales.");
        return;
      }
    }

    setIsSubmitting(true);

    const payload = {
      customerId: isWalkIn && debtCustomerName.trim() ? undefined : selectedCustomerId,
      customerName: isWalkIn && debtCustomerName.trim() ? debtCustomerName.trim() : undefined,
      customerPhone: isWalkIn && debtCustomerPhone.trim() ? debtCustomerPhone.trim() : undefined,
      items: cart.map((i) => ({
        productId: i.productId,
        qty: i.qty,
        unitPrice: i.unitPrice,
        discount: i.discount,
        name: i.name,
        sku: i.sku,
      })),
      discountTotal: wholesaleDiscount,
      amountPaid: amountPaidCents / 100,
      paymentMethod,
      dueDate: dueDate ? new Date(dueDate).toISOString() : null,
      notes,
    };

    // Offline recording helper using IndexedDB
    const handleOfflineFallback = async (reason?: string) => {
      try {
        const offlineRecord = await queueOfflineSale(payload, grandTotalCents / 100);
        const offlineSale = {
          id: offlineRecord.id,
          invoiceNo: offlineRecord.clientTempInvoiceNo,
          createdAt: offlineRecord.createdAt,
          total: grandTotalCents / 100,
          subtotal: subtotalCents / 100,
          taxTotal: taxCents / 100,
          discountTotal: totalDiscountsCents / 100,
          amountPaid: amountPaidCents / 100,
          balanceDue: balanceDueCents / 100,
          paymentMethod,
          paymentStatus: balanceDueCents === 0 ? "paid" : amountPaidCents > 0 ? "partial" : "unpaid",
          customerName: payload.customerName || selectedCustomer?.name || "Customer",
          cashierName: "Cashier (Offline)",
          items: cart.map((i) => ({
            id: i.productId,
            productName: i.name,
            sku: i.sku,
            qty: i.qty,
            unitPrice: i.unitPrice,
            discount: i.discount,
            lineTotal: i.qty * i.unitPrice - i.discount,
          })),
          isOffline: true,
        };

        toast.warning(
          reason
            ? `${reason}. Sale saved safely in IndexedDB!`
            : `Offline sale ${offlineRecord.clientTempInvoiceNo} saved in IndexedDB!`,
          { duration: 5000 }
        );

        setCompletedSale(offlineSale);
        setReceiptOpen(true);
        resetPos(walkInCustomer?.id);
        refreshPendingCount();
      } catch (dbErr: any) {
        toast.error(`Failed to store offline sale: ${dbErr.message}`);
      } finally {
        setIsSubmitting(false);
      }
    };

    // If device is offline, record directly in IndexedDB
    if (!navigator.onLine) {
      await handleOfflineFallback();
      return;
    }

    // If device is online, attempt server submission
    try {
      const res = await createSaleAction(payload);
      if (!res.success || !res.sale) {
        toast.error(res.error || "Sale failed to save");
        setIsSubmitting(false);
        return;
      }

      toast.success(`Sale ${res.sale.invoiceNo} completed successfully!`);
      setCompletedSale(res.sale);
      setReceiptOpen(true);
      resetPos(walkInCustomer?.id);
    } catch (err: any) {
      // Automatic fallback if network disconnected during action
      await handleOfflineFallback("Network disconnected during submission");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-4">
      {/* Offline Alert Banner */}
      {!isOnline && (
        <div className="flex items-center gap-2.5 p-3 bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-400 rounded-lg text-xs animate-in fade-in">
          <WifiOff className="w-4 h-4 shrink-0" />
          <span>
            <strong>Offline Mode Active:</strong> Operating with local IndexedDB storage. You can continue scanning products and completing sales offline. They will be synchronized automatically when you reconnect.
          </span>
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b pb-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight">{t.pos.title}</h1>
          <p className="text-xs text-muted-foreground">
            {company?.name || "Inventory & Sales"}
          </p>
        </div>

        {/* Customer Selector */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 bg-muted/60 px-3 py-1.5 rounded-lg border">
            <User className="h-4 w-4 text-muted-foreground" />
            <select
              value={selectedCustomerId}
              onChange={(e) => {
                setSelectedCustomerId(e.target.value);
                const c = displayCustomers.find((cust) => cust.id === e.target.value);
                if (c?.isWalkIn && paymentType !== "full") {
                  setPaymentType("full");
                }
              }}
              className="bg-transparent text-sm font-medium focus:outline-none cursor-pointer max-w-[200px]"
            >
              {displayCustomers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} {c.isWalkIn ? `(${t.pos.walkInCustomer})` : ""}
                </option>
              ))}
            </select>
          </div>
          {selectedCustomer && !isWalkIn && (
            <div className="hidden lg:flex items-center text-xs text-muted-foreground bg-muted px-2 py-1.5 rounded-md">
              {t.pos.debtRemaining}:{" "}
              <span className="font-semibold tabular-nums ml-1 text-foreground">
                {formatCurrency(selectedCustomer.totalOwed, currency)}
              </span>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Side: Product Search & Quick Grid (7 Cols) */}
        <div className="lg:col-span-7 space-y-4">
          {/* Search bar */}
          <form onSubmit={handleBarcodeSubmit} className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={t.pos.searchPlaceholder}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
                autoFocus
              />
            </div>
            <Button type="submit" variant="secondary" size="icon" title="Scan Barcode">
              <Barcode className="h-4 w-4" />
            </Button>
          </form>

          {/* Product Items Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-h-[560px] overflow-y-auto pr-1">
            {filteredProducts.map((p) => {
              const isLow = Number(p.stockQty) > 0 && Number(p.stockQty) <= (p.lowStockThreshold ?? 5);
              const isOut = Number(p.stockQty) <= 0;
              return (
                <button
                  key={p.id}
                  onClick={() => addToCart(p)}
                  disabled={!allowNegativeStock && isOut}
                  className="flex flex-col text-left p-3 rounded-xl border bg-card hover:border-primary/50 hover:shadow-sm transition-all relative group disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <div className="flex items-start justify-between w-full">
                    <span className="font-semibold text-sm line-clamp-1 group-hover:text-primary transition-colors">
                      {p.name}
                    </span>
                  </div>
                  <span className="text-[11px] text-muted-foreground font-mono mt-0.5">
                    {p.sku}
                  </span>
                  <div className="mt-3 flex items-center justify-between w-full">
                    <span className="font-bold text-sm tabular-nums text-foreground">
                      {formatCurrency(p.sellingPrice, currency)}
                    </span>
                    <span
                      className={`text-[10px] px-1.5 py-0.5 rounded font-medium tabular-nums ${
                        isOut
                          ? "bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-400"
                          : isLow
                          ? "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {isOut ? t.pos.outOfStock : `${p.stockQty} ${t.pos.inStock}`}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right Side: Cart, Payment Options & Checkout (5 Cols) */}
        <div className="lg:col-span-5 space-y-4">
          <Card className="rounded-card border shadow-sm flex flex-col h-full">
            <CardHeader className="py-3 px-4 border-b flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-sm font-semibold">{t.pos.cart}</CardTitle>
                <span className="text-xs text-muted-foreground">
                  {cart.length} items
                </span>
              </div>
              {cart.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearCart}
                  className="h-7 text-xs text-muted-foreground hover:text-destructive"
                >
                  {t.pos.clearCart}
                </Button>
              )}
            </CardHeader>

            <CardContent className="p-4 flex-1 flex flex-col justify-between space-y-4">
              {/* Cart Items List */}
              <div className="space-y-3 max-h-[280px] overflow-y-auto pr-1 divide-y">
                {cart.length === 0 ? (
                  <div className="py-12 text-center text-muted-foreground text-sm flex flex-col items-center">
                    <Barcode className="h-8 w-8 stroke-1 mb-2 opacity-50" />
                    <span>{t.pos.cartEmptyDesc}</span>
                  </div>
                ) : (
                  cart.map((item, idx) => (
                    <div key={item.productId} className="pt-2 first:pt-0 space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-sm line-clamp-1">{item.name}</span>
                        <button
                          onClick={() => removeFromCart(idx)}
                          className="text-muted-foreground hover:text-destructive transition-colors ml-2"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>

                      <div className="flex items-center justify-between gap-2">
                        {/* Qty Controls */}
                        <div className="flex items-center border rounded-md h-7">
                          <button
                            onClick={() => updateCartItemQty(idx, item.qty - 1)}
                            className="px-2 text-muted-foreground hover:text-foreground"
                          >
                            <Minus className="h-3 w-3" />
                          </button>
                          <input
                            type="number"
                            value={item.qty}
                            onChange={(e) => updateCartItemQty(idx, parseFloat(e.target.value) || 0)}
                            className="w-12 text-center text-xs tabular-nums font-semibold bg-transparent focus:outline-none"
                          />
                          <button
                            onClick={() => updateCartItemQty(idx, item.qty + 1)}
                            className="px-2 text-muted-foreground hover:text-foreground"
                          >
                            <Plus className="h-3 w-3" />
                          </button>
                        </div>

                        {/* Price & Line Total */}
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground">@</span>
                          <span className="text-xs tabular-nums">
                            {formatCurrency(item.unitPrice, currency)}
                          </span>
                          <span className="font-semibold text-sm tabular-nums ml-2">
                            {formatCurrency(
                              (item.qty * item.unitPrice) - item.discount,
                              currency
                            )}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Financial Totals Breakdown */}
              <div className="border-t pt-3 space-y-1.5 text-sm">
                <div className="flex justify-between text-muted-foreground text-xs">
                  <span>{t.pos.subtotal}</span>
                  <span className="tabular-nums">{formatCurrency(fromCents(subtotalCents), currency)}</span>
                </div>

                {canDiscount && (
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">{t.pos.wholesaleDiscount}</span>
                    <input
                      type="number"
                      step="0.01"
                      min={0}
                      placeholder="0.00"
                      value={wholesaleDiscount || ""}
                      onChange={(e) => setWholesaleDiscount(parseFloat(e.target.value) || 0)}
                      className="w-20 text-right text-xs rounded border px-1.5 py-0.5 tabular-nums"
                    />
                  </div>
                )}

                {taxEnabled && (
                  <div className="flex justify-between text-muted-foreground text-xs">
                    <span>{t.pos.tax} ({taxRate}%)</span>
                    <span className="tabular-nums">{formatCurrency(fromCents(taxCents), currency)}</span>
                  </div>
                )}

                <div className="flex justify-between text-base font-bold pt-1 border-t">
                  <span>{t.pos.grandTotal}</span>
                  <span className="tabular-nums text-primary">
                    {formatCurrency(fromCents(grandTotalCents), currency)}
                  </span>
                </div>
              </div>

              {/* Payment Mode Selection */}
              <div className="border-t pt-3 space-y-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold uppercase text-muted-foreground">
                    {t.pos.paymentTerms}
                  </Label>
                  <div className="grid grid-cols-3 gap-1.5">
                    <button
                      type="button"
                      onClick={() => setPaymentType("full")}
                      className={`py-1.5 text-xs font-medium rounded-lg border transition-all ${
                        paymentType === "full"
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-muted/40 hover:bg-muted text-muted-foreground"
                      }`}
                    >
                      {t.pos.paidInFull}
                    </button>
                    <button
                      type="button"
                      disabled={!allowCredit}
                      onClick={() => setPaymentType("partial")}
                      className={`py-1.5 text-xs font-medium rounded-lg border transition-all disabled:opacity-40 disabled:cursor-not-allowed ${
                        paymentType === "partial"
                          ? "bg-amber-600 text-white border-amber-600"
                          : "bg-muted/40 hover:bg-muted text-muted-foreground"
                      }`}
                    >
                      {t.pos.partialDebt}
                    </button>
                    <button
                      type="button"
                      disabled={!allowCredit}
                      onClick={() => setPaymentType("credit")}
                      className={`py-1.5 text-xs font-medium rounded-lg border transition-all disabled:opacity-40 disabled:cursor-not-allowed ${
                        paymentType === "credit"
                          ? "bg-rose-600 text-white border-rose-600"
                          : "bg-muted/40 hover:bg-muted text-muted-foreground"
                      }`}
                    >
                      {t.pos.fullCredit}
                    </button>
                  </div>
                </div>

                {/* Customer Details for Credit/Debt if Walk-in */}
                {paymentType !== "full" && isWalkIn && (
                  <div className="space-y-2 p-2.5 bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900 rounded-lg">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-semibold text-blue-900 dark:text-blue-200">
                        {t.pos.customerDebtInfo}
                      </Label>
                      <span className="text-[10px] text-blue-700 dark:text-blue-300 font-medium">
                        * {t.common.required}
                      </span>
                    </div>
                    <div className="space-y-1.5">
                      <Input
                        id="debtCustName"
                        placeholder={`${t.pos.customerName} *`}
                        value={debtCustomerName}
                        onChange={(e) => setDebtCustomerName(e.target.value)}
                        className="h-8 text-xs bg-background"
                        required
                        autoFocus
                      />
                      <Input
                        id="debtCustPhone"
                        placeholder={`${t.pos.customerPhone} (e.g. 0911...)`}
                        value={debtCustomerPhone}
                        onChange={(e) => setDebtCustomerPhone(e.target.value)}
                        className="h-8 text-xs bg-background"
                      />
                    </div>
                  </div>
                )}

                {/* Partial Payment Amount Input */}
                {paymentType === "partial" && (
                  <div className="space-y-1 p-2 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="partAmt" className="text-xs font-semibold text-amber-900 dark:text-amber-200">
                        {t.pos.amountPaidNow}
                      </Label>
                      <span className="text-xs text-amber-800 dark:text-amber-300 font-medium">
                        {t.pos.debtRemaining}: {formatCurrency(fromCents(balanceDueCents), currency)}
                      </span>
                    </div>
                    <Input
                      id="partAmt"
                      type="number"
                      step="0.01"
                      min={0}
                      max={fromCents(grandTotalCents)}
                      placeholder="0.00"
                      value={partialAmountPaid}
                      onChange={(e) => setPartialAmountPaid(e.target.value)}
                      className="h-8 text-sm tabular-nums bg-background"
                      autoFocus
                    />
                  </div>
                )}

                {/* Payment Method (for Paid or Partial) */}
                {paymentType !== "credit" && (
                  <div className="flex items-center gap-2">
                    <Label className="text-xs text-muted-foreground shrink-0">{t.pos.paymentMethod}:</Label>
                    <select
                      value={paymentMethod}
                      onChange={(e) => setPaymentMethod(e.target.value as any)}
                      className="flex-1 h-8 rounded-md border text-xs bg-background px-2"
                    >
                      <option value="cash">{t.pos.cash}</option>
                      <option value="card">{t.pos.card}</option>
                      <option value="bank_transfer">{t.pos.bankTransfer}</option>
                      <option value="mobile_money">{t.pos.mobileMoney}</option>
                      <option value="other">{t.pos.other}</option>
                    </select>
                  </div>
                )}

                {/* Optional Debt Due Date */}
                {paymentType !== "full" && (
                  <div className="flex items-center gap-2">
                    <Label htmlFor="dueDate" className="text-xs text-muted-foreground shrink-0">
                      {t.pos.dueDate}:
                    </Label>
                    <Input
                      id="dueDate"
                      type="date"
                      value={dueDate}
                      onChange={(e) => setDueDate(e.target.value)}
                      className="h-8 text-xs bg-background flex-1"
                    />
                  </div>
                )}

                {/* Notes */}
                <Input
                  placeholder={t.pos.notesPlaceholder}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="h-8 text-xs"
                />

                {/* Confirm Sale Button */}
                <Button
                  onClick={handleCheckout}
                  disabled={isSubmitting || cart.length === 0}
                  className="w-full h-11 text-base font-semibold shadow-md bg-emerald-600 hover:bg-emerald-700 text-white"
                >
                  {isSubmitting ? (
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  ) : (
                    <CheckCircle className="mr-2 h-5 w-5" />
                  )}
                  {t.pos.completeSale} • {formatCurrency(fromCents(amountPaidCents), currency)}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Printable Receipt Modal */}
      <Dialog open={receiptOpen} onOpenChange={setReceiptOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-emerald-600">
              <CheckCircle className="h-5 w-5" /> {t.pos.receiptSuccess}
            </DialogTitle>
          </DialogHeader>

          {completedSale && (
            <div className="space-y-4">
              {/* Receipt Visual Box */}
              <div
                id="receipt-print-area"
                className="receipt-container border rounded-lg p-4 bg-muted/20 font-mono text-xs space-y-2 select-text"
              >
                {completedSale.isOffline && (
                  <div className="bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800 py-1 px-2 rounded text-center text-[10px] font-bold tracking-wide uppercase">
                    ⚡ Offline Transaction • Saved in IndexedDB
                  </div>
                )}

                <div className="text-center space-y-0.5 border-b pb-2">
                  <h3 className="font-bold text-sm tracking-wide">{company?.name || "Store"}</h3>
                  {company?.address && <p>{company.address}</p>}
                  {company?.phone && <p>Tel: {company.phone}</p>}
                  <p className="text-[10px] text-muted-foreground pt-1">
                    {t.pos.invoiceNo}: <span className="font-bold">{completedSale.invoiceNo}</span>
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    {t.common.date}: {new Date(completedSale.createdAt).toLocaleString()}
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    {t.sales.customer}: {completedSale.customerName}
                  </p>
                </div>

                <div className="divide-y pt-1">
                  {completedSale.items?.map((it: any) => (
                    <div key={it.id || it.productId} className="py-1 flex justify-between">
                      <div>
                        <span>{it.productName}</span>
                        <div className="text-[10px] text-muted-foreground">
                          {it.qty} × {formatCurrency(it.unitPrice, currency)}
                        </div>
                      </div>
                      <span className="font-semibold tabular-nums">
                        {formatCurrency(it.lineTotal, currency)}
                      </span>
                    </div>
                  ))}
                </div>

                <div className="border-t pt-2 space-y-1">
                  <div className="flex justify-between">
                    <span>{t.pos.subtotal}:</span>
                    <span className="tabular-nums">{formatCurrency(completedSale.subtotal, currency)}</span>
                  </div>
                  {Number(completedSale.discountTotal) > 0 && (
                    <div className="flex justify-between text-muted-foreground">
                      <span>{t.pos.discount}:</span>
                      <span className="tabular-nums">-{formatCurrency(completedSale.discountTotal, currency)}</span>
                    </div>
                  )}
                  {Number(completedSale.taxTotal) > 0 && (
                    <div className="flex justify-between text-muted-foreground">
                      <span>{t.pos.tax}:</span>
                      <span className="tabular-nums">+{formatCurrency(completedSale.taxTotal, currency)}</span>
                    </div>
                  )}
                  <div className="flex justify-between font-bold text-sm border-t pt-1">
                    <span>{t.pos.grandTotal}:</span>
                    <span className="tabular-nums">{formatCurrency(completedSale.total, currency)}</span>
                  </div>
                  <div className="flex justify-between font-medium">
                    <span>{t.pos.receivedAmount}:</span>
                    <span className="tabular-nums">{formatCurrency(completedSale.amountPaid, currency)}</span>
                  </div>
                  {Number(completedSale.balanceDue) > 0 && (
                    <div className="flex justify-between text-rose-600 font-bold">
                      <span>{t.pos.balanceDue}:</span>
                      <span className="tabular-nums">{formatCurrency(completedSale.balanceDue, currency)}</span>
                    </div>
                  )}
                </div>

                <div className="text-center pt-3 text-[10px] text-muted-foreground border-t">
                  {t.pos.thankYou}
                </div>
              </div>

              <DialogFooter className="flex-row sm:justify-between gap-2">
                <Button variant="outline" size="sm" onClick={handlePrint}>
                  <Printer className="w-4 h-4 mr-2" />
                  {t.pos.printReceipt}
                </Button>
                <div className="flex gap-2">
                  {!completedSale.isOffline && (
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => router.push(`/sales/${completedSale.id}`)}
                    >
                      {t.sales.viewDetails}
                    </Button>
                  )}
                  <Button size="sm" onClick={() => setReceiptOpen(false)}>
                    {t.pos.newSaleBtn}
                  </Button>
                </div>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
