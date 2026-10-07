"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  ShoppingCart,
  PlusCircle,
  Package,
  Layers,
  Users,
  CreditCard,
  BarChart3,
  Settings,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  Building2,
  ListOrdered,
  FileText,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { can, PERMISSIONS } from "@/lib/permissions";
import type { AuthUser } from "@/lib/auth";

interface SidebarProps {
  user: AuthUser;
  companyName: string;
  logoUrl?: string | null;
  currency: string;
}

export function Sidebar({ user, companyName, logoUrl, currency }: SidebarProps) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = React.useState(false);

  const canManageCompany = can(user, PERMISSIONS.COMPANY_MANAGE);
  const canManageUsers = can(user, PERMISSIONS.USERS_MANAGE);
  const canViewReports = can(user, PERMISSIONS.REPORTS_VIEW);
  const canViewProducts = can(user, PERMISSIONS.PRODUCTS_VIEW);
  const canCreateSale = can(user, PERMISSIONS.SALES_CREATE);
  const canViewSales = can(user, PERMISSIONS.SALES_VIEW);
  const canViewDebts = can(user, PERMISSIONS.DEBTS_VIEW);
  const canViewCustomers = can(user, PERMISSIONS.CUSTOMERS_VIEW);
  const canViewAudit = can(user, PERMISSIONS.AUDIT_VIEW);
  const canManageProducts = can(user, PERMISSIONS.PRODUCTS_MANAGE);

  const navItems = [
    {
      title: "Dashboard",
      href: "/dashboard",
      icon: LayoutDashboard,
      visible: true,
    },
    {
      title: "New Sale",
      href: "/sales/new",
      icon: PlusCircle,
      visible: canCreateSale,
      highlight: true,
    },
    {
      title: "Sales",
      href: "/sales",
      icon: ShoppingCart,
      visible: canViewSales,
    },
    {
      title: "Products",
      href: "/products",
      icon: Package,
      visible: canViewProducts,
    },
    {
      title: "Stock Ledger",
      href: "/stock",
      icon: Layers,
      visible: canViewProducts,
    },
    {
      title: "Customers",
      href: "/customers",
      icon: Users,
      visible: canViewCustomers,
    },
    {
      title: "Debts & Credit",
      href: "/debts",
      icon: CreditCard,
      visible: canViewDebts,
    },
    {
      title: "Reports",
      href: "/reports",
      icon: BarChart3,
      visible: canViewReports,
    },
  ];

  const settingsItems = [
    {
      title: "Company Settings",
      href: "/settings/company",
      icon: Building2,
      visible: canManageCompany,
    },
    {
      title: "User Management",
      href: "/settings/users",
      icon: ShieldCheck,
      visible: canManageUsers,
    },
    {
      title: "Catalog Setup",
      href: "/settings/catalog",
      icon: ListOrdered,
      visible: canManageProducts,
    },
    {
      title: "Audit Log",
      href: "/settings/audit",
      icon: FileText,
      visible: canViewAudit,
    },
  ].filter((s) => s.visible);

  return (
    <aside
      className={cn(
        "sticky top-0 hidden md:flex flex-col border-r bg-card h-screen transition-all duration-300 z-30 select-none",
        collapsed ? "w-16" : "w-64"
      )}
    >
      {/* Brand Header */}
      <div className="flex items-center h-16 px-4 border-b gap-3 overflow-hidden">
        {logoUrl ? (
          <img
            src={logoUrl}
            alt={companyName}
            className="h-8 w-8 rounded object-contain shrink-0 bg-white border p-0.5"
          />
        ) : (
          <div className="h-8 w-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-bold text-sm shrink-0 border border-primary/20">
            {companyName.slice(0, 2).toUpperCase()}
          </div>
        )}
        {!collapsed && (
          <div className="flex flex-col min-w-0">
            <span className="font-semibold text-sm truncate text-foreground leading-tight">
              {companyName}
            </span>
            <span className="text-[10px] text-muted-foreground font-mono">
              {currency}
            </span>
          </div>
        )}
      </div>

      {/* Main Navigation */}
      <div className="flex-1 overflow-y-auto py-3 px-2 space-y-1">
        {navItems
          .filter((item) => item.visible)
          .map((item) => {
            const Icon = item.icon;
            const isActive =
              item.href === "/dashboard"
                ? pathname === "/dashboard"
                : pathname === item.href || (item.href !== "/sales/new" && pathname.startsWith(item.href + "/"));

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                  isActive
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : item.highlight
                    ? "text-primary hover:bg-primary/10 border border-primary/20"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground",
                  collapsed && "justify-center px-2"
                )}
                title={collapsed ? item.title : undefined}
              >
                <Icon className={cn("h-4 w-4 shrink-0", item.highlight && !isActive && "text-primary")} />
                {!collapsed && <span>{item.title}</span>}
              </Link>
            );
          })}

        {/* Settings Section */}
        {settingsItems.length > 0 && (
          <div className="pt-4 mt-4 border-t space-y-1">
            {!collapsed && (
              <span className="px-3 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                Management
              </span>
            )}
            {settingsItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                    isActive
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground",
                    collapsed && "justify-center px-2"
                  )}
                  title={collapsed ? item.title : undefined}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  {!collapsed && <span>{item.title}</span>}
                </Link>
              );
            })}
          </div>
        )}
      </div>

      {/* Collapse Toggle Footer */}
      <div className="p-2 border-t flex justify-end">
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="p-1.5 rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </button>
      </div>
    </aside>
  );
}
