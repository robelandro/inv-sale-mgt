import {
  pgTable,
  uuid,
  text,
  boolean,
  integer,
  numeric,
  timestamp,
  jsonb,
  primaryKey,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// 1. Company
export const company = pgTable("company", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  logoUrl: text("logo_url"),
  currency: text("currency").notNull().default("USD"),
  phone: text("phone"),
  email: text("email"),
  address: text("address"),
  invoicePrefix: text("invoice_prefix").notNull().default("INV"),
  allowNegativeStock: boolean("allow_negative_stock").notNull().default(false),
  lowStockDefault: integer("low_stock_default").notNull().default(5),
  allowCredit: boolean("allow_credit").notNull().default(true),
  taxEnabled: boolean("tax_enabled").notNull().default(false),
  taxRate: numeric("tax_rate", { precision: 5, scale: 2 }).notNull().default("0.00"),
  accentColor: text("accent_color").notNull().default("indigo"),
  onboardedAt: timestamp("onboarded_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

// 2. Roles
export const roles = pgTable("roles", {
  id: uuid("id").defaultRandom().primaryKey(),
  key: text("key").unique().notNull(), // 'owner', 'admin', 'manager', 'cashier', 'storekeeper', 'viewer'
  name: text("name").notNull(),
  isSystem: boolean("is_system").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

// 3. Permissions
export const permissions = pgTable("permissions", {
  id: uuid("id").defaultRandom().primaryKey(),
  key: text("key").unique().notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

// 4. Role Permissions
export const rolePermissions = pgTable(
  "role_permissions",
  {
    roleId: uuid("role_id")
      .notNull()
      .references(() => roles.id, { onDelete: "cascade" }),
    permissionId: uuid("permission_id")
      .notNull()
      .references(() => permissions.id, { onDelete: "cascade" }),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.roleId, table.permissionId] }),
  })
);

// 5. Users
export const users = pgTable(
  "users",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: text("name").notNull(),
    email: text("email").unique().notNull(),
    passwordHash: text("password_hash").notNull(),
    roleId: uuid("role_id")
      .notNull()
      .references(() => roles.id),
    status: text("status").notNull().default("active"), // 'active', 'disabled', 'invited'
    mustChangePassword: boolean("must_change_password").notNull().default(false),
    lastLoginAt: timestamp("last_login_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    emailIdx: uniqueIndex("users_email_idx").on(table.email),
  })
);

// 6. Sessions
export const sessions = pgTable("sessions", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  token: text("token").unique().notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

// 7. Invites
export const invites = pgTable("invites", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  tokenHash: text("token_hash").notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  usedAt: timestamp("used_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

// 8. Categories
export const categories = pgTable("categories", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").unique().notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

// 9. Units
export const units = pgTable("units", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").unique().notNull(),
  shortName: text("short_name").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

// 10. Products
export const products = pgTable(
  "products",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: text("name").notNull(),
    sku: text("sku").unique().notNull(),
    barcode: text("barcode").unique(),
    categoryId: uuid("category_id").references(() => categories.id, {
      onDelete: "set null",
    }),
    unitId: uuid("unit_id").references(() => units.id, {
      onDelete: "set null",
    }),
    costPrice: numeric("cost_price", { precision: 14, scale: 2 }).notNull().default("0.00"),
    sellingPrice: numeric("selling_price", { precision: 14, scale: 2 })
      .notNull()
      .default("0.00"),
    stockQty: numeric("stock_qty", { precision: 14, scale: 3 }).notNull().default("0.000"),
    lowStockThreshold: integer("low_stock_threshold"),
    imageUrl: text("image_url"),
    description: text("description"),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    nameIdx: index("products_name_idx").on(table.name),
    skuIdx: uniqueIndex("products_sku_idx").on(table.sku),
    barcodeIdx: index("products_barcode_idx").on(table.barcode),
  })
);

// 11. Stock movements
export const stockMovements = pgTable(
  "stock_movements",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "restrict" }),
    type: text("type").notNull(), // 'opening', 'purchase', 'sale', 'sale_void', 'adjustment_in', 'adjustment_out', 'return'
    qtyChange: numeric("qty_change", { precision: 14, scale: 3 }).notNull(),
    qtyAfter: numeric("qty_after", { precision: 14, scale: 3 }).notNull(),
    unitCost: numeric("unit_cost", { precision: 14, scale: 2 }),
    referenceType: text("reference_type"), // 'sale', 'manual', 'adjustment', etc.
    referenceId: uuid("reference_id"),
    reason: text("reason"),
    createdBy: uuid("created_by").references(() => users.id),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    productIdx: index("stock_movements_product_idx").on(table.productId, table.createdAt),
  })
);

// 12. Customers
export const customers = pgTable("customers", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  phone: text("phone"),
  email: text("email"),
  address: text("address"),
  notes: text("notes"),
  creditLimit: numeric("credit_limit", { precision: 14, scale: 2 }),
  isWalkIn: boolean("is_walk_in").notNull().default(false),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

// 13. Sales
export const sales = pgTable(
  "sales",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    invoiceNo: text("invoice_no").unique().notNull(),
    customerId: uuid("customer_id")
      .notNull()
      .references(() => customers.id, { onDelete: "restrict" }),
    status: text("status").notNull().default("completed"), // 'completed', 'voided'
    subtotal: numeric("subtotal", { precision: 14, scale: 2 }).notNull(),
    discountTotal: numeric("discount_total", { precision: 14, scale: 2 })
      .notNull()
      .default("0.00"),
    taxTotal: numeric("tax_total", { precision: 14, scale: 2 }).notNull().default("0.00"),
    total: numeric("total", { precision: 14, scale: 2 }).notNull(),
    amountPaid: numeric("amount_paid", { precision: 14, scale: 2 }).notNull().default("0.00"),
    balanceDue: numeric("balance_due", { precision: 14, scale: 2 }).notNull().default("0.00"),
    paymentStatus: text("payment_status").notNull(), // 'paid', 'partial', 'unpaid'
    dueDate: timestamp("due_date", { withTimezone: true }),
    notes: text("notes"),
    createdBy: uuid("created_by").references(() => users.id),
    voidedAt: timestamp("voided_at", { withTimezone: true }),
    voidedBy: uuid("voided_by").references(() => users.id),
    voidReason: text("void_reason"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    createdIdx: index("sales_created_idx").on(table.createdAt),
    customerIdx: index("sales_customer_idx").on(table.customerId),
    paymentStatusIdx: index("sales_payment_status_idx").on(table.paymentStatus),
  })
);

// 14. Sale Items
export const saleItems = pgTable("sale_items", {
  id: uuid("id").defaultRandom().primaryKey(),
  saleId: uuid("sale_id")
    .notNull()
    .references(() => sales.id, { onDelete: "cascade" }),
  productId: uuid("product_id")
    .notNull()
    .references(() => products.id, { onDelete: "restrict" }),
  productNameSnapshot: text("product_name_snapshot").notNull(),
  skuSnapshot: text("sku_snapshot").notNull(),
  qty: numeric("qty", { precision: 14, scale: 3 }).notNull(),
  unitPrice: numeric("unit_price", { precision: 14, scale: 2 }).notNull(),
  unitCost: numeric("unit_cost", { precision: 14, scale: 2 }).notNull(),
  discount: numeric("discount", { precision: 14, scale: 2 }).notNull().default("0.00"),
  lineTotal: numeric("line_total", { precision: 14, scale: 2 }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

// 15. Payments
export const payments = pgTable(
  "payments",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    customerId: uuid("customer_id")
      .notNull()
      .references(() => customers.id, { onDelete: "restrict" }),
    method: text("method").notNull(), // 'cash', 'card', 'bank_transfer', 'mobile_money', 'other'
    amount: numeric("amount", { precision: 14, scale: 2 }).notNull(),
    paidAt: timestamp("paid_at", { withTimezone: true }).defaultNow().notNull(),
    note: text("note"),
    createdBy: uuid("created_by").references(() => users.id),
    reversedAt: timestamp("reversed_at", { withTimezone: true }),
    reversedBy: uuid("reversed_by").references(() => users.id),
    reverseReason: text("reverse_reason"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    customerIdx: index("payments_customer_idx").on(table.customerId),
  })
);

// 16. Payment Allocations
export const paymentAllocations = pgTable(
  "payment_allocations",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    paymentId: uuid("payment_id")
      .notNull()
      .references(() => payments.id, { onDelete: "cascade" }),
    saleId: uuid("sale_id")
      .notNull()
      .references(() => sales.id, { onDelete: "restrict" }),
    amount: numeric("amount", { precision: 14, scale: 2 }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    saleIdx: index("payment_allocations_sale_idx").on(table.saleId),
  })
);

// 17. Audit Logs
export const auditLogs = pgTable("audit_logs", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").references(() => users.id),
  action: text("action").notNull(),
  entityType: text("entity_type").notNull(),
  entityId: text("entity_id"),
  details: jsonb("details"),
  ip: text("ip"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

// Relations
export const usersRelations = relations(users, ({ one }) => ({
  role: one(roles, {
    fields: [users.roleId],
    references: [roles.id],
  }),
}));

export const rolesRelations = relations(roles, ({ many }) => ({
  rolePermissions: many(rolePermissions),
  users: many(users),
}));

export const permissionsRelations = relations(permissions, ({ many }) => ({
  rolePermissions: many(rolePermissions),
}));

export const rolePermissionsRelations = relations(rolePermissions, ({ one }) => ({
  role: one(roles, {
    fields: [rolePermissions.roleId],
    references: [roles.id],
  }),
  permission: one(permissions, {
    fields: [rolePermissions.permissionId],
    references: [permissions.id],
  }),
}));

export const productsRelations = relations(products, ({ one, many }) => ({
  category: one(categories, {
    fields: [products.categoryId],
    references: [categories.id],
  }),
  unit: one(units, {
    fields: [products.unitId],
    references: [units.id],
  }),
  stockMovements: many(stockMovements),
  saleItems: many(saleItems),
}));

export const salesRelations = relations(sales, ({ one, many }) => ({
  customer: one(customers, {
    fields: [sales.customerId],
    references: [customers.id],
  }),
  creator: one(users, {
    fields: [sales.createdBy],
    references: [users.id],
  }),
  items: many(saleItems),
  allocations: many(paymentAllocations),
}));

export const saleItemsRelations = relations(saleItems, ({ one }) => ({
  sale: one(sales, {
    fields: [saleItems.saleId],
    references: [sales.id],
  }),
  product: one(products, {
    fields: [saleItems.productId],
    references: [products.id],
  }),
}));

export const paymentsRelations = relations(payments, ({ one, many }) => ({
  customer: one(customers, {
    fields: [payments.customerId],
    references: [customers.id],
  }),
  allocations: many(paymentAllocations),
}));

export const paymentAllocationsRelations = relations(paymentAllocations, ({ one }) => ({
  payment: one(payments, {
    fields: [paymentAllocations.paymentId],
    references: [payments.id],
  }),
  sale: one(sales, {
    fields: [paymentAllocations.saleId],
    references: [sales.id],
  }),
}));
