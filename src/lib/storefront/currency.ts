/**
 * Money formatting for a multi-currency catalog.
 *
 * Every price is shown in its OWN currency: a product costed in USD shows
 * `$50`, one costed in so'm shows `50 000 so'm`. An empty currency means the
 * store's base currency, which `/storefront/info/` reports — for Dubai Express
 * Mobile that is dollars. The store reports it as a symbol (`"$"`) while
 * products use codes (`"USD"`), so both are normalised before comparing.
 */

/** Used only when the store's own currency is unknown (the info call failed). */
export const DEFAULT_CURRENCY = "UZS";

/** `"$"` and `"US$"` → `"USD"`, `"so'm"` → `"UZS"`, anything else upper-cased. */
export function normalizeCurrency(currency: string | null | undefined): string {
  const code = String(currency ?? "").trim().toUpperCase();
  if (code === "$" || code === "US$") return "USD";
  if (code === "SO'M" || code === "SUM") return "UZS";
  return code;
}

/** A product's currency, falling back to the store's base currency. */
export function resolveCurrency(
  productCurrency: string | null | undefined,
  storeCurrency: string | null | undefined,
): string {
  return normalizeCurrency(productCurrency) || normalizeCurrency(storeCurrency) || DEFAULT_CURRENCY;
}

/** Thin-space thousands separators, the convention used across UZ retail. */
function withThousands(value: string): string {
  return value.replace(/\B(?=(\d{3})+(?!\d))/g, " ");
}

/**
 * `money(50, "USD") -> "$50"`, `money(50000, "UZS") -> "50 000 so'm"`.
 * An empty `currency` is priced in `baseCurrency`.
 */
export function money(
  amount: number | null | undefined,
  currency?: string | null,
  baseCurrency: string = DEFAULT_CURRENCY,
): string {
  const code = resolveCurrency(currency, baseCurrency);
  if (code === "UZS") return `${withThousands(Math.round(Number(amount) || 0).toString())} so'm`;

  const value = Math.round((Number(amount) || 0) * 100) / 100;
  const [whole, fraction] = Number.isInteger(value)
    ? [value.toString(), ""]
    : value.toFixed(2).split(".");

  const prefix = code === "USD" ? "$" : `${code} `;
  return prefix + withThousands(whole) + (fraction ? `.${fraction}` : "");
}

interface PricedLine {
  currency?: string;
  price: number;
  cur_price?: number | null;
  qty: number;
}

/**
 * A cart line's price: dollar goods show their dollar price, everything else
 * the ERP's `price`, which is in the store's base currency.
 */
export function linePrice(line: Omit<PricedLine, "qty">, qty: number, baseCurrency: string): string {
  const code = resolveCurrency(line.currency, baseCurrency);
  return code === "USD" && line.cur_price != null
    ? money(line.cur_price * qty, "USD", baseCurrency)
    : money(line.price * qty, baseCurrency, baseCurrency);
}

/**
 * A cart can hold items priced in different currencies, and the API offers no
 * conversion, so totals are summed per currency and shown side by side:
 * `"$52  +  300 000 so'm"`.
 */
export function groupTotal(items: PricedLine[], baseCurrency: string = DEFAULT_CURRENCY): string {
  const totals = new Map<string, number>();
  for (const item of items ?? []) {
    const code = resolveCurrency(item.currency, baseCurrency);
    totals.set(code, (totals.get(code) ?? 0) + (item.cur_price ?? item.price) * item.qty);
  }
  if (totals.size === 0) return money(0, baseCurrency, baseCurrency);
  return [...totals.entries()].map(([code, sum]) => money(sum, code, baseCurrency)).join("  +  ");
}

/** Weight-based units (kg, gramm) are sold in fractional quantities. */
export function isWeightUnit(unitName: string | null | undefined): boolean {
  return /kilogram|kilogramm|gramm|\bkg\b|\bg\b/i.test((unitName ?? "").trim());
}

/** A whole quantity shows as "2", a fraction as "0.5" (at most 3 decimals). */
export function fmtQty(qty: number): string {
  return Number.isInteger(+qty) ? String(+qty) : String(+(+qty).toFixed(3));
}
