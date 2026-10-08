"use client";

import * as React from "react";
import { Languages, Check } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useTranslation } from "@/lib/i18n/context";
import { Locale } from "@/lib/i18n/types";

interface LanguageSwitcherProps {
  variant?: "icon" | "full" | "mobile";
  className?: string;
}

export function LanguageSwitcher({ variant = "icon", className = "" }: LanguageSwitcherProps) {
  const { locale, setLocale, locales, currentLocaleInfo, t } = useTranslation();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors text-xs font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 ${className}`}
          aria-label={t.common.language}
          title={t.common.language}
        >
          <Languages className="h-4 w-4 shrink-0 text-primary" />
          {variant !== "icon" && (
            <span className="flex items-center gap-1 font-medium">
              <span>{currentLocaleInfo.flag}</span>
              <span className="truncate">{currentLocaleInfo.nativeName}</span>
            </span>
          )}
          {variant === "icon" && (
            <span className="text-[11px] font-semibold uppercase tracking-wider hidden sm:inline">
              {currentLocaleInfo.code}
            </span>
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuLabel className="text-xs text-muted-foreground flex items-center justify-between">
          <span>{t.common.language}</span>
          <Languages className="h-3.5 w-3.5" />
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {locales.map((item) => {
          const isSelected = item.code === locale;
          return (
            <DropdownMenuItem
              key={item.code}
              onClick={() => setLocale(item.code as Locale)}
              className="flex items-center justify-between cursor-pointer text-xs py-2"
            >
              <div className="flex items-center gap-2">
                <span className="text-sm">{item.flag}</span>
                <div className="flex flex-col">
                  <span className="font-medium text-foreground">{item.nativeName}</span>
                  <span className="text-[10px] text-muted-foreground">{item.name}</span>
                </div>
              </div>
              {isSelected && <Check className="h-4 w-4 text-primary shrink-0 ml-2" />}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
