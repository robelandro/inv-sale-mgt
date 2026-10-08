import { create } from "zustand";
import { toast } from "sonner";

export interface CartItem {
  productId: string;
  name: string;
  sku: string;
  stockQty: number;
  qty: number;
  unitPrice: number;
  discount: number;
}

interface PosState {
  // Cart
  cart: CartItem[];
  searchQuery: string;

  // Customer & Payment
  selectedCustomerId: string;
  paymentType: "full" | "partial" | "credit";
  paymentMethod: "cash" | "card" | "bank_transfer" | "mobile_money" | "other";
  partialAmountPaid: string;
  wholesaleDiscount: number;
  dueDate: string;
  debtCustomerName: string;
  debtCustomerPhone: string;
  notes: string;

  // Checkout & Receipt Modal
  isSubmitting: boolean;
  completedSale: any | null;
  receiptOpen: boolean;

  // Actions
  setSearchQuery: (query: string) => void;
  setSelectedCustomerId: (id: string) => void;
  setPaymentType: (type: "full" | "partial" | "credit") => void;
  setPaymentMethod: (method: "cash" | "card" | "bank_transfer" | "mobile_money" | "other") => void;
  setPartialAmountPaid: (amount: string) => void;
  setWholesaleDiscount: (discount: number) => void;
  setDueDate: (date: string) => void;
  setDebtCustomerName: (name: string) => void;
  setDebtCustomerPhone: (phone: string) => void;
  setNotes: (notes: string) => void;
  setIsSubmitting: (submitting: boolean) => void;
  setCompletedSale: (sale: any | null) => void;
  setReceiptOpen: (open: boolean) => void;

  // Cart Management Actions
  addToCart: (product: any, allowNegativeStock?: boolean) => void;
  updateQty: (productId: string, newQty: number, allowNegativeStock?: boolean) => void;
  updateItemPrice: (productId: string, unitPrice: number) => void;
  updateItemDiscount: (productId: string, discount: number) => void;
  removeFromCart: (productId: string) => void;
  clearCart: () => void;
  resetPos: (defaultCustomerId?: string) => void;
}

export const usePosStore = create<PosState>((set, get) => ({
  cart: [],
  searchQuery: "",
  selectedCustomerId: "",
  paymentType: "full",
  paymentMethod: "cash",
  partialAmountPaid: "",
  wholesaleDiscount: 0,
  dueDate: "",
  debtCustomerName: "",
  debtCustomerPhone: "",
  notes: "",
  isSubmitting: false,
  completedSale: null,
  receiptOpen: false,

  setSearchQuery: (searchQuery) => set({ searchQuery }),
  setSelectedCustomerId: (selectedCustomerId) => set({ selectedCustomerId }),
  setPaymentType: (paymentType) => set({ paymentType }),
  setPaymentMethod: (paymentMethod) => set({ paymentMethod }),
  setPartialAmountPaid: (partialAmountPaid) => set({ partialAmountPaid }),
  setWholesaleDiscount: (wholesaleDiscount) => set({ wholesaleDiscount }),
  setDueDate: (dueDate) => set({ dueDate }),
  setDebtCustomerName: (debtCustomerName) => set({ debtCustomerName }),
  setDebtCustomerPhone: (debtCustomerPhone) => set({ debtCustomerPhone }),
  setNotes: (notes) => set({ notes }),
  setIsSubmitting: (isSubmitting) => set({ isSubmitting }),
  setCompletedSale: (completedSale) => set({ completedSale }),
  setReceiptOpen: (receiptOpen) => set({ receiptOpen }),

  addToCart: (product, allowNegativeStock = false) => {
    const { cart } = get();
    const existingIndex = cart.findIndex((i) => i.productId === product.id);
    const availableStock = Number(product.stockQty ?? 0);

    if (existingIndex > -1) {
      const currentQty = cart[existingIndex].qty;
      if (!allowNegativeStock && currentQty + 1 > availableStock) {
        toast.error(`Cannot exceed available stock of ${availableStock} units for ${product.name}`);
        return;
      }
      const updated = [...cart];
      updated[existingIndex].qty += 1;
      set({ cart: updated });
    } else {
      if (!allowNegativeStock && availableStock <= 0) {
        toast.error(`"${product.name}" is out of stock`);
        return;
      }
      set({
        cart: [
          ...cart,
          {
            productId: product.id,
            name: product.name,
            sku: product.sku || "",
            stockQty: availableStock,
            qty: 1,
            unitPrice: Number(product.sellingPrice || 0),
            discount: 0,
          },
        ],
      });
    }
  },

  updateQty: (productId, newQty, allowNegativeStock = false) => {
    const { cart } = get();
    if (newQty <= 0) {
      set({ cart: cart.filter((i) => i.productId !== productId) });
      return;
    }

    const item = cart.find((i) => i.productId === productId);
    if (!item) return;

    if (!allowNegativeStock && newQty > item.stockQty) {
      toast.error(`Max stock available is ${item.stockQty}`);
      return;
    }

    set({
      cart: cart.map((i) => (i.productId === productId ? { ...i, qty: newQty } : i)),
    });
  },

  updateItemPrice: (productId, unitPrice) => {
    const validPrice = Math.max(0, unitPrice);
    set({
      cart: get().cart.map((i) => (i.productId === productId ? { ...i, unitPrice: validPrice } : i)),
    });
  },

  updateItemDiscount: (productId, discount) => {
    const validDiscount = Math.max(0, discount);
    set({
      cart: get().cart.map((i) => (i.productId === productId ? { ...i, discount: validDiscount } : i)),
    });
  },

  removeFromCart: (productId) => {
    set({ cart: get().cart.filter((i) => i.productId !== productId) });
  },

  clearCart: () => {
    set({ cart: [] });
  },

  resetPos: (defaultCustomerId = "") => {
    set({
      cart: [],
      searchQuery: "",
      selectedCustomerId: defaultCustomerId,
      paymentType: "full",
      paymentMethod: "cash",
      partialAmountPaid: "",
      wholesaleDiscount: 0,
      dueDate: "",
      debtCustomerName: "",
      debtCustomerPhone: "",
      notes: "",
      isSubmitting: false,
    });
  },
}));
