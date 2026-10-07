import { format, formatDistanceToNow } from "date-fns";

export function formatDate(date: Date | string | null | undefined, formatStr: string = "MMM d, yyyy"): string {
  if (!date) return "—";
  try {
    const d = typeof date === "string" ? new Date(date) : date;
    return format(d, formatStr);
  } catch {
    return "—";
  }
}

export function formatDateTime(date: Date | string | null | undefined): string {
  return formatDate(date, "MMM d, yyyy HH:mm");
}

export function formatRelativeTime(date: Date | string | null | undefined): string {
  if (!date) return "—";
  try {
    const d = typeof date === "string" ? new Date(date) : date;
    return formatDistanceToNow(d, { addSuffix: true });
  } catch {
    return "—";
  }
}

export function getStatusBadgeVariant(status: string): {
  label: string;
  className: string;
} {
  switch (status.toLowerCase()) {
    case "paid":
      return {
        label: "Paid",
        className: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800",
      };
    case "partial":
      return {
        label: "Partial",
        className: "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400 border-amber-200 dark:border-amber-800",
      };
    case "unpaid":
      return {
        label: "Unpaid / Credit",
        className: "bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400 border-rose-200 dark:border-rose-800",
      };
    case "voided":
      return {
        label: "Voided",
        className: "bg-zinc-100 text-zinc-500 line-through dark:bg-zinc-800 dark:text-zinc-400 border-zinc-200 dark:border-zinc-700",
      };
    case "active":
      return {
        label: "Active",
        className: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800",
      };
    case "disabled":
      return {
        label: "Disabled",
        className: "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400 border-zinc-200 dark:border-zinc-700",
      };
    case "invited":
      return {
        label: "Invited",
        className: "bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400 border-blue-200 dark:border-blue-800",
      };
    case "low":
      return {
        label: "Low Stock",
        className: "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400 border-amber-200 dark:border-amber-800",
      };
    case "out":
      return {
        label: "Out of Stock",
        className: "bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400 border-rose-200 dark:border-rose-800",
      };
    default:
      return {
        label: status,
        className: "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 border-zinc-200 dark:border-zinc-700",
      };
  }
}
