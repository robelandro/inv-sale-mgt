import { z } from "zod";

// --- Onboarding & Company ---
export const onboardingSchema = z.object({
  companyName: z.string().min(2, "Company name must be at least 2 characters"),
  currency: z.string().min(2, "Currency code is required").max(5).default("USD"),
  phone: z.string().optional().or(z.literal("")),
  email: z.string().email().optional().or(z.literal("")),
  address: z.string().optional().or(z.literal("")),
  invoicePrefix: z.string().min(1, "Invoice prefix is required").default("INV"),
  logoUrl: z.string().optional().or(z.literal("")),

  adminName: z.string().min(2, "Name must be at least 2 characters"),
  adminEmail: z.string().email("Invalid email address"),
  adminPassword: z.string().min(8, "Password must be at least 8 characters"),
  confirmPassword: z.string(),

  allowNegativeStock: z.boolean().default(false),
  lowStockDefault: z.coerce.number().int().min(0).default(5),
  allowCredit: z.boolean().default(true),
  taxEnabled: z.boolean().default(false),
  taxRate: z.coerce.number().min(0).max(100).default(0),
  accentColor: z.string().default("indigo"),
}).refine((data) => data.adminPassword === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

export const companySettingsSchema = z.object({
  name: z.string().min(2, "Company name is required"),
  currency: z.string().min(2).max(5),
  phone: z.string().optional().nullable(),
  email: z.string().email().optional().nullable().or(z.literal("")),
  address: z.string().optional().nullable(),
  invoicePrefix: z.string().min(1),
  allowNegativeStock: z.boolean(),
  lowStockDefault: z.coerce.number().int().min(0),
  allowCredit: z.boolean(),
  taxEnabled: z.boolean(),
  taxRate: z.coerce.number().min(0).max(100),
  accentColor: z.string().default("indigo"),
  logoUrl: z.string().optional().nullable(),
});

// --- Auth ---
export const loginSchema = z.object({
  email: z.string().email("Please enter a valid email"),
  password: z.string().min(1, "Password is required"),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: z.string().min(8, "New password must be at least 8 characters"),
  confirmPassword: z.string().min(8, "Please confirm your password"),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

export const updateProfileSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
});

// --- Users ---
export const createUserSchema = z.object({
  name: z.string().min(2, "Name is required"),
  email: z.string().email("Valid email required"),
  roleId: z.string().uuid("Please select a role"),
  password: z.string().min(8, "Temporary password must be at least 8 characters").optional().or(z.literal("")),
  isInvite: z.boolean().default(false),
});

export const updateUserSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(2, "Name is required"),
  roleId: z.string().uuid("Please select a role"),
});

// --- Catalog (Category & Unit) ---
export const categorySchema = z.object({
  name: z.string().min(1, "Category name is required"),
});

export const unitSchema = z.object({
  name: z.string().min(1, "Unit name is required"),
  shortName: z.string().min(1, "Short code is required"),
});

// --- Product ---
export const productSchema = z.object({
  name: z.string().min(1, "Product name is required"),
  sku: z.string().optional().or(z.literal("")),
  barcode: z.string().optional().nullable().or(z.literal("")),
  categoryId: z.string().optional().nullable().or(z.literal("")),
  newCategoryName: z.string().optional().nullable().or(z.literal("")),
  unitId: z.string().uuid().optional().nullable().or(z.literal("")),
  costPrice: z.coerce.number().min(0, "Cost price cannot be negative").default(0),
  sellingPrice: z.coerce.number().min(0, "Selling price cannot be negative").default(0),
  initialStock: z.coerce.number().min(0).default(0).optional(),
  lowStockThreshold: z.coerce.number().int().min(0).optional().nullable(),
  description: z.string().optional().nullable(),
  imageUrl: z.string().optional().nullable(),
  isActive: z.boolean().default(true),
});

// --- Stock Movements ---
export const stockAdjustmentSchema = z.object({
  productId: z.string().uuid(),
  qtyChange: z.coerce.number().refine((val) => val !== 0, "Quantity change cannot be 0"),
  reason: z.string().min(3, "Reason is mandatory for adjustments"),
});

export const receiveStockItemSchema = z.object({
  productId: z.string().uuid(),
  quantity: z.coerce.number().positive("Quantity must be greater than 0"),
  unitCost: z.coerce.number().min(0, "Unit cost cannot be negative").optional(),
  updateCostPrice: z.boolean().default(false),
});

export const receiveStockSchema = z.object({
  items: z.array(receiveStockItemSchema).min(1, "At least one item is required"),
  supplier: z.string().optional().nullable(),
  note: z.string().optional().nullable(),
});

// --- Customer ---
export const customerSchema = z.object({
  name: z.string().min(2, "Customer name is required"),
  phone: z.string().optional().nullable(),
  email: z.string().email().optional().nullable().or(z.literal("")),
  address: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  creditLimit: z.coerce.number().min(0, "Credit limit cannot be negative").optional().nullable(),
});

// --- Sales ---
export const saleItemInputSchema = z.object({
  productId: z.string().uuid(),
  qty: z.coerce.number().positive("Quantity must be greater than 0"),
  unitPrice: z.coerce.number().min(0, "Price cannot be negative"),
  discount: z.coerce.number().min(0).default(0),
});

export const createSaleSchema = z.object({
  customerId: z.string().optional().nullable().or(z.literal("")),
  customerName: z.string().optional().nullable().or(z.literal("")),
  customerPhone: z.string().optional().nullable().or(z.literal("")),
  items: z.array(saleItemInputSchema).min(1, "Sale must include at least one item"),
  discountTotal: z.coerce.number().min(0).default(0),
  amountPaid: z.coerce.number().min(0).default(0),
  paymentMethod: z.enum(["cash", "card", "bank_transfer", "mobile_money", "other"]).default("cash"),
  dueDate: z.string().optional().nullable(), // ISO string date
  notes: z.string().optional().nullable(),
});

export const voidSaleSchema = z.object({
  saleId: z.string().uuid(),
  reason: z.string().min(3, "Reason is mandatory to void a sale"),
});

// --- Payments & Debts ---
export const recordPaymentSchema = z.object({
  customerId: z.string().uuid(),
  saleId: z.string().uuid().optional().nullable(),
  amount: z.coerce.number().positive("Payment amount must be greater than 0"),
  method: z.enum(["cash", "card", "bank_transfer", "mobile_money", "other"]).default("cash"),
  paidAt: z.string().optional().nullable(),
  note: z.string().optional().nullable(),
});

export const reversePaymentSchema = z.object({
  paymentId: z.string().uuid(),
  reason: z.string().min(3, "Reason is mandatory to reverse a payment"),
});
