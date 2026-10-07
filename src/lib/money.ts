/**
 * Money utilities using integer minor units (cents / 2 decimal places)
 * to avoid IEEE 754 floating point precision errors.
 */

export function toCents(amount: number | string): number {
  if (typeof amount === "string") {
    const cleaned = amount.trim().replace(/,/g, "");
    const parsed = parseFloat(cleaned);
    if (isNaN(parsed)) return 0;
    return Math.round(parsed * 100);
  }
  return Math.round(amount * 100);
}

export function fromCents(cents: number): string {
  return (cents / 100).toFixed(2);
}

export function fromCentsNum(cents: number): number {
  return Math.round(cents) / 100;
}

export function addMoney(a: number | string, b: number | string): string {
  return fromCents(toCents(a) + toCents(b));
}

export function subtractMoney(a: number | string, b: number | string): string {
  return fromCents(toCents(a) - toCents(b));
}

export function multiplyMoney(amount: number | string, multiplier: number | string): string {
  const c = toCents(amount);
  const m = typeof multiplier === "string" ? parseFloat(multiplier) : multiplier;
  return fromCents(Math.round(c * m));
}

export function divideMoney(amount: number | string, divisor: number | string): string {
  const c = toCents(amount);
  const d = typeof divisor === "string" ? parseFloat(divisor) : divisor;
  if (d === 0) return "0.00";
  return fromCents(Math.round(c / d));
}

/**
 * Format currency with Intl.NumberFormat
 */
export function formatCurrency(
  amount: number | string | null | undefined,
  currency: string = "USD",
  locale: string = "en-US"
): string {
  if (amount === null || amount === undefined) amount = 0;
  const num = typeof amount === "string" ? parseFloat(amount) : amount;
  const safeNum = isNaN(num) ? 0 : num;

  try {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency: currency || "USD",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(safeNum);
  } catch (err) {
    // Fallback if currency code is custom or invalid
    return `${currency} ${safeNum.toFixed(2)}`;
  }
}

/**
 * Format quantity up to 3 decimal places (strips trailing zeros)
 */
export function formatQuantity(qty: number | string | null | undefined): string {
  if (qty === null || qty === undefined) return "0";
  const num = typeof qty === "string" ? parseFloat(qty) : qty;
  if (isNaN(num)) return "0";
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 3,
  }).format(num);
}
