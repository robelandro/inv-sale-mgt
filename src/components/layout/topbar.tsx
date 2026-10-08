"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  User,
  LogOut,
  Menu,
  Shield,
  X,
  LayoutDashboard,
  ShoppingCart,
  PlusCircle,
  Package,
  Layers,
  Users,
  CreditCard,
  BarChart3,
  Settings,
} from "lucide-react";
import { CommandPalette } from "@/components/command-palette";
import { ThemeToggle } from "@/components/theme-toggle";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { logoutAction } from "@/app/actions/auth.actions";
import { LanguageSwitcher } from "@/components/language-switcher";
import { SyncStatusBadge } from "@/components/sync-status-badge";
import { useTranslation } from "@/lib/i18n/context";
import type { AuthUser } from "@/lib/auth";

interface TopbarProps {
  user: AuthUser;
  companyName: string;
}

export function Topbar({ user, companyName }: TopbarProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);
  const [mounted, setMounted] = React.useState(false);
  const pathname = usePathname();
  const { t } = useTranslation();

  React.useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <>
      <header className="h-16 border-b bg-card/80 backdrop-blur sticky top-0 z-20 flex items-center justify-between px-4 sm:px-6">
        {/* Left side: Mobile menu toggle & title / search */}
        <div className="flex items-center gap-3">
          {/* Mobile menu trigger */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 rounded-md hover:bg-muted text-muted-foreground"
            aria-label="Toggle menu"
          >
            <Menu className="h-5 w-5" />
          </button>

          {/* Command palette */}
          <CommandPalette />
        </div>

        {/* Right side: Sync Status, Language switcher, Theme toggle, and User dropdown */}
        <div className="flex items-center gap-1.5 sm:gap-2.5">
          <SyncStatusBadge />
          <LanguageSwitcher />
          <ThemeToggle />

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-2 p-1 rounded-full hover:bg-muted transition-colors focus:outline-none focus:ring-2 focus:ring-primary/20">
                <Avatar className="h-8 w-8 border">
                  <AvatarFallback className="bg-primary/10 text-primary text-xs font-bold">
                    {user.name.slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="hidden sm:flex flex-col text-left mr-1">
                  <span className="text-xs font-semibold leading-tight text-foreground">
                    {user.name}
                  </span>
                  <span className="text-[10px] text-muted-foreground capitalize">
                    {user.roleName}
                  </span>
                </div>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium leading-none">{user.name}</p>
                  <p className="text-xs leading-none text-muted-foreground">{user.email}</p>
                  <div className="pt-1">
                    <span className="inline-flex items-center gap-1 rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary">
                      <Shield className="h-3 w-3" />
                      {user.roleName}
                    </span>
                  </div>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href="/profile" className="cursor-pointer flex items-center">
                  <User className="mr-2 h-4 w-4" />
                  <span>{t.nav.profile}</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => logoutAction()}
                className="text-destructive focus:text-destructive cursor-pointer"
              >
                <LogOut className="mr-2 h-4 w-4" />
                <span>{t.nav.logout}</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      {/* Mobile Drawer Navigation portaled to body to guarantee z-index layering */}
      {mounted &&
        mobileMenuOpen &&
        createPortal(
          <div className="fixed inset-0 z-[999] md:hidden">
            {/* Backdrop */}
            <div
              className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
              onClick={() => setMobileMenuOpen(false)}
              aria-hidden="true"
            />

            {/* Drawer Panel */}
            <div
              className="fixed inset-y-0 left-0 z-[1000] w-72 max-w-[85vw] bg-card border-r shadow-2xl flex flex-col p-4 overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between border-b pb-3 mb-2">
                <div className="font-bold text-base truncate pr-2 text-foreground">
                  {companyName}
                </div>
                <button
                  onClick={() => setMobileMenuOpen(false)}
                  className="p-1 rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
                  aria-label="Close menu"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Language Switcher in Mobile Drawer */}
              <div className="py-1 mb-1 border-b">
                <LanguageSwitcher variant="full" className="w-full justify-between" />
              </div>

              <nav className="flex flex-col space-y-1 py-1">
                <Link
                  href="/dashboard"
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium ${
                    pathname === "/dashboard"
                      ? "bg-primary text-primary-foreground"
                      : "hover:bg-muted text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <LayoutDashboard className="h-4 w-4" />
                  {t.nav.dashboard}
                </Link>
                <Link
                  href="/sales/new"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-3 px-3 py-2 rounded-md bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium my-1"
                >
                  <PlusCircle className="h-4 w-4" />
                  {t.nav.newSale}
                </Link>
                <Link
                  href="/sales"
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium ${
                    pathname === "/sales"
                      ? "bg-primary text-primary-foreground"
                      : "hover:bg-muted text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <ShoppingCart className="h-4 w-4" />
                  {t.nav.sales}
                </Link>
                <Link
                  href="/products"
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium ${
                    pathname === "/products"
                      ? "bg-primary text-primary-foreground"
                      : "hover:bg-muted text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Package className="h-4 w-4" />
                  {t.nav.products}
                </Link>
                <Link
                  href="/stock"
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium ${
                    pathname === "/stock"
                      ? "bg-primary text-primary-foreground"
                      : "hover:bg-muted text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Layers className="h-4 w-4" />
                  {t.nav.stock}
                </Link>
                <Link
                  href="/customers"
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium ${
                    pathname === "/customers"
                      ? "bg-primary text-primary-foreground"
                      : "hover:bg-muted text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Users className="h-4 w-4" />
                  {t.nav.customers}
                </Link>
                <Link
                  href="/debts"
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium ${
                    pathname === "/debts"
                      ? "bg-primary text-primary-foreground"
                      : "hover:bg-muted text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <CreditCard className="h-4 w-4" />
                  {t.nav.debts}
                </Link>
                <Link
                  href="/reports"
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium ${
                    pathname === "/reports"
                      ? "bg-primary text-primary-foreground"
                      : "hover:bg-muted text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <BarChart3 className="h-4 w-4" />
                  {t.nav.reports}
                </Link>
                <div className="border-t my-2 pt-2">
                  <Link
                    href="/profile"
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium ${
                      pathname === "/profile"
                        ? "bg-primary text-primary-foreground"
                        : "hover:bg-muted text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <User className="h-4 w-4" />
                    {t.nav.profile}
                  </Link>
                  {user.roleName === "admin" && (
                    <Link
                      href="/settings/company"
                      onClick={() => setMobileMenuOpen(false)}
                      className="flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium hover:bg-muted text-muted-foreground hover:text-foreground"
                    >
                      <Settings className="h-4 w-4" />
                      {t.nav.companySettings}
                    </Link>
                  )}
                </div>
              </nav>
            </div>
          </div>,
          document.body
        )}
    </>
  );
}
