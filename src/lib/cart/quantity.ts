/**
 * Turns the text typed into a quantity field into the quantity to apply, or
 * `null` to discard the edit and show the current value again.
 *
 * Empty and non-numeric input is discarded, so a customer can clear "1" and
 * type "10" without the line disappearing in between. Whole-unit products
 * drop the fraction and stay at one or more; weights keep up to three
 * decimals and stay at 0.001 or more. Nothing goes above `max`.
 */
export function commitQuantity(
  draft: string,
  { max = Infinity, allowDecimal = false }: { max?: number; allowDecimal?: boolean } = {},
): number | null {
  const raw = draft.trim();
  if (raw === "") return null;
  const parsed = Number(raw);
  if (!Number.isFinite(parsed)) return null;
  const min = allowDecimal ? 0.001 : 1;
  const normalized = allowDecimal ? Math.round(parsed * 1000) / 1000 : Math.floor(parsed);
  return Math.min(Math.max(min, normalized), max);
}

/** Next value of a +/− button: 0.001 steps for weights, whole steps otherwise. */
export function stepQuantity(qty: number, direction: 1 | -1, allowDecimal: boolean): number {
  if (!allowDecimal) return Math.max(1, qty + direction);
  return Math.max(0.001, Math.round((qty + direction * 0.001) * 1000) / 1000);
}
