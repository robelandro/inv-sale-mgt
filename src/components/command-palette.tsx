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
  Search,
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
import { useTranslation } from "@/lib/i18n/context";

export function CommandPalette() {
  const [open, setOpen] = React.useState(false);
  const router = useRouter();
  const { t } = useTranslation();

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
        className="flex items-center justify-center sm:justify-start gap-2 rounded-md border border-input bg-muted/40 p-2 sm:px-3 sm:py-1.5 text-xs text-muted-foreground hover:bg-muted transition-colors h-9 w-9 sm:w-64 shrink-0"
        title={t.nav.searchOrQuickAction}
        aria-label={t.nav.searchOrQuickAction}
      >
        <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
        <span className="truncate hidden sm:inline">{t.nav.searchOrQuickAction}</span>
        <kbd className="ml-auto pointer-events-none hidden sm:inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
          <span className="text-xs">⌘</span>K
        </kbd>
      </button>

      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput placeholder={t.nav.searchCommands} />
        <CommandList>
          <CommandEmpty>{t.nav.noResultsFound}</CommandEmpty>
          <CommandGroup heading={t.nav.quickActions}>
            <CommandItem
              onSelect={() => runCommand(() => router.push("/sales/new"))}
            >
              <ShoppingCart className="mr-2 h-4 w-4 text-emerald-600" />
              <span>{t.nav.newSale}</span>
            </CommandItem>
            <CommandItem
              onSelect={() => runCommand(() => router.push("/products?action=create"))}
            >
              <PlusCircle className="mr-2 h-4 w-4 text-blue-600" />
              <span>{t.products.addProduct}</span>
            </CommandItem>
            <CommandItem
              onSelect={() => runCommand(() => router.push("/stock?action=receive"))}
            >
              <ArrowDownToLine className="mr-2 h-4 w-4 text-amber-600" />
              <span>{t.stock.receiveStock}</span>
            </CommandItem>
            <CommandItem
              onSelect={() => runCommand(() => router.push("/stock?action=adjust"))}
            >
              <SlidersHorizontal className="mr-2 h-4 w-4 text-violet-600" />
              <span>{t.stock.adjustStock}</span>
            </CommandItem>
            <CommandItem
              onSelect={() => runCommand(() => router.push("/debts"))}
            >
              <CreditCard className="mr-2 h-4 w-4 text-rose-600" />
              <span>{t.debts.recordPayment}</span>
            </CommandItem>
          </CommandGroup>
          <CommandSeparator />
          <CommandGroup heading={t.nav.navigation}>
            <CommandItem onSelect={() => runCommand(() => router.push("/dashboard"))}>
              <BarChart3 className="mr-2 h-4 w-4" />
              <span>{t.nav.dashboard}</span>
            </CommandItem>
            <CommandItem onSelect={() => runCommand(() => router.push("/sales"))}>
              <ShoppingCart className="mr-2 h-4 w-4" />
              <span>{t.nav.sales}</span>
            </CommandItem>
            <CommandItem onSelect={() => runCommand(() => router.push("/products"))}>
              <Package className="mr-2 h-4 w-4" />
              <span>{t.nav.products}</span>
            </CommandItem>
            <CommandItem onSelect={() => runCommand(() => router.push("/stock"))}>
              <ArrowDownToLine className="mr-2 h-4 w-4" />
              <span>{t.nav.stock}</span>
            </CommandItem>
            <CommandItem onSelect={() => runCommand(() => router.push("/customers"))}>
              <Users className="mr-2 h-4 w-4" />
              <span>{t.nav.customers}</span>
            </CommandItem>
            <CommandItem onSelect={() => runCommand(() => router.push("/debts"))}>
              <CreditCard className="mr-2 h-4 w-4" />
              <span>{t.nav.debts}</span>
            </CommandItem>
            <CommandItem onSelect={() => runCommand(() => router.push("/reports"))}>
              <Calculator className="mr-2 h-4 w-4" />
              <span>{t.nav.reports}</span>
            </CommandItem>
            <CommandItem onSelect={() => runCommand(() => router.push("/settings/users"))}>
              <Settings className="mr-2 h-4 w-4" />
              <span>{t.nav.usersRoles}</span>
            </CommandItem>
            <CommandItem onSelect={() => runCommand(() => router.push("/profile"))}>
              <User className="mr-2 h-4 w-4" />
              <span>{t.nav.profile}</span>
            </CommandItem>
          </CommandGroup>
        </CommandList>
      </CommandDialog>
    </>
  );
}
