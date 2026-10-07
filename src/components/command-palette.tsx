"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  Calculator,
  PlusCircle,
  Package,
  ShoppingCart,
  Users,
  CreditCard,
  BarChart3,
  Settings,
  User,
  ArrowDownToLine,
  SlidersHorizontal,
} from "lucide-react";
import {
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandSeparator,
} from "@/components/ui/command";

export function CommandPalette() {
  const [open, setOpen] = React.useState(false);
  const router = useRouter();

  React.useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if ((e.key === "k" || e.key === "K") && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };

    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  const runCommand = (command: () => void) => {
    setOpen(false);
    command();
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 rounded-md border border-input bg-muted/40 px-3 py-1.5 text-xs text-muted-foreground hover:bg-muted transition-colors w-48 sm:w-64"
      >
        <span className="truncate">Search or quick action...</span>
        <kbd className="ml-auto pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
          <span className="text-xs">⌘</span>K
        </kbd>
      </button>

      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput placeholder="Type a command or search..." />
        <CommandList>
          <CommandEmpty>No results found.</CommandEmpty>
          <CommandGroup heading="Quick Actions">
            <CommandItem
              onSelect={() => runCommand(() => router.push("/sales/new"))}
            >
              <ShoppingCart className="mr-2 h-4 w-4 text-emerald-600" />
              <span>New Sale (POS)</span>
            </CommandItem>
            <CommandItem
              onSelect={() => runCommand(() => router.push("/products?action=create"))}
            >
              <PlusCircle className="mr-2 h-4 w-4 text-blue-600" />
              <span>Create Product</span>
            </CommandItem>
            <CommandItem
              onSelect={() => runCommand(() => router.push("/stock?action=receive"))}
            >
              <ArrowDownToLine className="mr-2 h-4 w-4 text-amber-600" />
              <span>Receive Purchased Stock</span>
            </CommandItem>
            <CommandItem
              onSelect={() => runCommand(() => router.push("/stock?action=adjust"))}
            >
              <SlidersHorizontal className="mr-2 h-4 w-4 text-violet-600" />
              <span>Adjust Stock (Count / Loss)</span>
            </CommandItem>
            <CommandItem
              onSelect={() => runCommand(() => router.push("/debts"))}
            >
              <CreditCard className="mr-2 h-4 w-4 text-rose-600" />
              <span>Record Debt Payment</span>
            </CommandItem>
          </CommandGroup>
          <CommandSeparator />
          <CommandGroup heading="Navigation">
            <CommandItem onSelect={() => runCommand(() => router.push("/dashboard"))}>
              <BarChart3 className="mr-2 h-4 w-4" />
              <span>Dashboard</span>
            </CommandItem>
            <CommandItem onSelect={() => runCommand(() => router.push("/sales"))}>
              <ShoppingCart className="mr-2 h-4 w-4" />
              <span>Sales Ledger</span>
            </CommandItem>
            <CommandItem onSelect={() => runCommand(() => router.push("/products"))}>
              <Package className="mr-2 h-4 w-4" />
              <span>Products & Catalog</span>
            </CommandItem>
            <CommandItem onSelect={() => runCommand(() => router.push("/stock"))}>
              <ArrowDownToLine className="mr-2 h-4 w-4" />
              <span>Stock Ledger</span>
            </CommandItem>
            <CommandItem onSelect={() => runCommand(() => router.push("/customers"))}>
              <Users className="mr-2 h-4 w-4" />
              <span>Customers</span>
            </CommandItem>
            <CommandItem onSelect={() => runCommand(() => router.push("/debts"))}>
              <CreditCard className="mr-2 h-4 w-4" />
              <span>Debts & Overdue</span>
            </CommandItem>
            <CommandItem onSelect={() => runCommand(() => router.push("/reports"))}>
              <Calculator className="mr-2 h-4 w-4" />
              <span>Reports & Analytics</span>
            </CommandItem>
            <CommandItem onSelect={() => runCommand(() => router.push("/settings/users"))}>
              <Settings className="mr-2 h-4 w-4" />
              <span>Settings: Users & Roles</span>
            </CommandItem>
            <CommandItem onSelect={() => runCommand(() => router.push("/profile"))}>
              <User className="mr-2 h-4 w-4" />
              <span>My Profile</span>
            </CommandItem>
          </CommandGroup>
        </CommandList>
      </CommandDialog>
    </>
  );
}
