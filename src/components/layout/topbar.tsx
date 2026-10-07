"use client";

import * as React from "react";
import Link from "next/link";
import { User, LogOut, Menu, Shield } from "lucide-react";
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
import type { AuthUser } from "@/lib/auth";

interface TopbarProps {
  user: AuthUser;
  companyName: string;
}

export function Topbar({ user, companyName }: TopbarProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);

  return (
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

      {/* Right side: Theme toggle and User dropdown */}
      <div className="flex items-center gap-2 sm:gap-3">
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
                <span>My Profile</span>
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => logoutAction()}
              className="text-destructive focus:text-destructive cursor-pointer"
            >
              <LogOut className="mr-2 h-4 w-4" />
              <span>Log out</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Mobile Drawer Navigation if toggled */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/50 md:hidden"
          onClick={() => setMobileMenuOpen(false)}
        >
          <div
            className="w-64 bg-card h-full p-4 flex flex-col space-y-3"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="font-bold text-lg border-b pb-2">{companyName}</div>
            <nav className="flex flex-col space-y-1">
              <Link
                href="/dashboard"
                onClick={() => setMobileMenuOpen(false)}
                className="px-3 py-2 rounded-md hover:bg-muted text-sm font-medium"
              >
                Dashboard
              </Link>
              <Link
                href="/sales/new"
                onClick={() => setMobileMenuOpen(false)}
                className="px-3 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium"
              >
                New Sale (POS)
              </Link>
              <Link
                href="/sales"
                onClick={() => setMobileMenuOpen(false)}
                className="px-3 py-2 rounded-md hover:bg-muted text-sm font-medium"
              >
                Sales
              </Link>
              <Link
                href="/products"
                onClick={() => setMobileMenuOpen(false)}
                className="px-3 py-2 rounded-md hover:bg-muted text-sm font-medium"
              >
                Products
              </Link>
              <Link
                href="/stock"
                onClick={() => setMobileMenuOpen(false)}
                className="px-3 py-2 rounded-md hover:bg-muted text-sm font-medium"
              >
                Stock Ledger
              </Link>
              <Link
                href="/customers"
                onClick={() => setMobileMenuOpen(false)}
                className="px-3 py-2 rounded-md hover:bg-muted text-sm font-medium"
              >
                Customers
              </Link>
              <Link
                href="/debts"
                onClick={() => setMobileMenuOpen(false)}
                className="px-3 py-2 rounded-md hover:bg-muted text-sm font-medium"
              >
                Debts & Credit
              </Link>
              <Link
                href="/reports"
                onClick={() => setMobileMenuOpen(false)}
                className="px-3 py-2 rounded-md hover:bg-muted text-sm font-medium"
              >
                Reports
              </Link>
              <Link
                href="/profile"
                onClick={() => setMobileMenuOpen(false)}
                className="px-3 py-2 rounded-md hover:bg-muted text-sm font-medium border-t pt-3"
              >
                Profile
              </Link>
            </nav>
          </div>
        </div>
      )}
    </header>
  );
}
