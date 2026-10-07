export const PERMISSIONS = {
  COMPANY_MANAGE: "company.manage",
  USERS_MANAGE: "users.manage",
  PRODUCTS_VIEW: "products.view",
  PRODUCTS_MANAGE: "products.manage",
  PRODUCTS_VIEW_COST: "products.view_cost",
  STOCK_ADJUST: "stock.adjust",
  STOCK_RECEIVE: "stock.receive",
  SALES_CREATE: "sales.create",
  SALES_VIEW: "sales.view",
  SALES_VOID: "sales.void",
  SALES_DISCOUNT: "sales.discount",
  CUSTOMERS_MANAGE: "customers.manage",
  CUSTOMERS_VIEW: "customers.view",
  PAYMENTS_RECORD: "payments.record",
  DEBTS_VIEW: "debts.view",
  REPORTS_VIEW: "reports.view",
  AUDIT_VIEW: "audit.view",
} as const;

export type PermissionKey = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

export const ALL_PERMISSIONS: { key: PermissionKey; description: string }[] = [
  { key: PERMISSIONS.COMPANY_MANAGE, description: "Manage company settings and logo" },
  { key: PERMISSIONS.USERS_MANAGE, description: "Invite, edit, disable users and change roles" },
  { key: PERMISSIONS.PRODUCTS_VIEW, description: "View products catalog and prices" },
  { key: PERMISSIONS.PRODUCTS_MANAGE, description: "Create, edit, and archive products" },
  { key: PERMISSIONS.PRODUCTS_VIEW_COST, description: "View product cost prices" },
  { key: PERMISSIONS.STOCK_ADJUST, description: "Perform manual stock adjustments" },
  { key: PERMISSIONS.STOCK_RECEIVE, description: "Receive purchased stock into inventory" },
  { key: PERMISSIONS.SALES_CREATE, description: "Create and process sales" },
  { key: PERMISSIONS.SALES_VIEW, description: "View sales history" },
  { key: PERMISSIONS.SALES_VOID, description: "Void completed sales and restore stock" },
  { key: PERMISSIONS.SALES_DISCOUNT, description: "Apply discounts to sales" },
  { key: PERMISSIONS.CUSTOMERS_MANAGE, description: "Create and edit customer accounts" },
  { key: PERMISSIONS.CUSTOMERS_VIEW, description: "View customer details and balances" },
  { key: PERMISSIONS.PAYMENTS_RECORD, description: "Record debt repayments" },
  { key: PERMISSIONS.DEBTS_VIEW, description: "View debts ledger and overdue accounts" },
  { key: PERMISSIONS.REPORTS_VIEW, description: "View business reports and profit analysis" },
  { key: PERMISSIONS.AUDIT_VIEW, description: "View system audit logs" },
];

export const ROLE_DEFINITIONS: Record<
  string,
  { name: string; isSystem: boolean; permissions: PermissionKey[] }
> = {
  owner: {
    name: "Owner",
    isSystem: true,
    permissions: Object.values(PERMISSIONS),
  },
  admin: {
    name: "Admin",
    isSystem: true,
    permissions: [
      PERMISSIONS.COMPANY_MANAGE,
      PERMISSIONS.USERS_MANAGE,
      PERMISSIONS.PRODUCTS_VIEW,
      PERMISSIONS.PRODUCTS_MANAGE,
      PERMISSIONS.PRODUCTS_VIEW_COST,
      PERMISSIONS.STOCK_ADJUST,
      PERMISSIONS.STOCK_RECEIVE,
      PERMISSIONS.SALES_CREATE,
      PERMISSIONS.SALES_VIEW,
      PERMISSIONS.SALES_VOID,
      PERMISSIONS.SALES_DISCOUNT,
      PERMISSIONS.CUSTOMERS_MANAGE,
      PERMISSIONS.CUSTOMERS_VIEW,
      PERMISSIONS.PAYMENTS_RECORD,
      PERMISSIONS.DEBTS_VIEW,
      PERMISSIONS.REPORTS_VIEW,
      PERMISSIONS.AUDIT_VIEW,
    ],
  },
  manager: {
    name: "Manager",
    isSystem: true,
    permissions: [
      PERMISSIONS.PRODUCTS_VIEW,
      PERMISSIONS.PRODUCTS_MANAGE,
      PERMISSIONS.PRODUCTS_VIEW_COST,
      PERMISSIONS.STOCK_ADJUST,
      PERMISSIONS.STOCK_RECEIVE,
      PERMISSIONS.SALES_CREATE,
      PERMISSIONS.SALES_VIEW,
      PERMISSIONS.SALES_VOID,
      PERMISSIONS.SALES_DISCOUNT,
      PERMISSIONS.CUSTOMERS_MANAGE,
      PERMISSIONS.CUSTOMERS_VIEW,
      PERMISSIONS.PAYMENTS_RECORD,
      PERMISSIONS.DEBTS_VIEW,
      PERMISSIONS.REPORTS_VIEW,
    ],
  },
  cashier: {
    name: "Cashier / Sales",
    isSystem: true,
    permissions: [
      PERMISSIONS.PRODUCTS_VIEW,
      PERMISSIONS.SALES_CREATE,
      PERMISSIONS.SALES_VIEW,
      PERMISSIONS.SALES_DISCOUNT,
      PERMISSIONS.CUSTOMERS_MANAGE,
      PERMISSIONS.CUSTOMERS_VIEW,
      PERMISSIONS.PAYMENTS_RECORD,
      PERMISSIONS.DEBTS_VIEW,
    ],
  },
  storekeeper: {
    name: "Storekeeper",
    isSystem: true,
    permissions: [
      PERMISSIONS.PRODUCTS_VIEW,
      PERMISSIONS.PRODUCTS_MANAGE,
      PERMISSIONS.PRODUCTS_VIEW_COST,
      PERMISSIONS.STOCK_ADJUST,
      PERMISSIONS.STOCK_RECEIVE,
    ],
  },
  viewer: {
    name: "Viewer / Accountant",
    isSystem: true,
    permissions: [
      PERMISSIONS.PRODUCTS_VIEW,
      PERMISSIONS.PRODUCTS_VIEW_COST,
      PERMISSIONS.SALES_VIEW,
      PERMISSIONS.CUSTOMERS_VIEW,
      PERMISSIONS.DEBTS_VIEW,
      PERMISSIONS.REPORTS_VIEW,
    ],
  },
};

export interface UserWithPermissions {
  id: string;
  roleKey?: string;
  roleName?: string;
  permissions?: string[];
  [key: string]: any;
}

/**
 * Check if a user has a specific permission.
 * Single helper used by both UI and server.
 */
export function can(user: UserWithPermissions | null | undefined, permission: PermissionKey): boolean {
  if (!user) return false;
  if (user.roleKey === "owner") return true;
  if (!user.permissions) return false;
  return user.permissions.includes(permission);
}
