import { isWeightUnit } from "./currency.ts";
import type { PhoneGroup, PhoneInfo, Product, ProductUnit } from "./types";

export function hasVariants(p: Product): boolean {
  return Boolean(p.has_variants && p.variants?.length);
}

/**
 * The phone block, when the product is a phone with copies in stock. The card
 * is the MODEL; the customer picks a configuration or copy on the detail page.
 */
export function getPhone(p: Product): PhoneInfo | null {
  return p.phone && (p.phone.groups?.length || p.phone.buckets?.length) ? p.phone : null;
}

/**
 * Whether a phone is sold by count from priced buckets rather than copy by
 * copy. `mode` names the list the ERP filled, but when it points at an empty
 * list the other one wins, or the stock would show on the card with no way
 * to pick it on the detail page.
 */
export function isGroupedPhone(phone: PhoneInfo): boolean {
  const hasBuckets = Boolean(phone.buckets?.length);
  const hasGroups = Boolean(phone.groups?.length);
  return hasBuckets && hasGroups ? phone.mode === "grouped" : hasBuckets;
}

/**
 * The options at each step of picking a phone copy by copy: storage, then the
 * colours within it, then the regions within that colour. A blank value is an
 * option of its own ("—"), not a wildcard, or a configuration with a blank
 * storage could only be reached when it happened to be listed first.
 */
export function phoneChoices(groups: PhoneGroup[], selected: PhoneGroup | null) {
  const colors = groups.filter((g) => g.storage === selected?.storage);
  return {
    storages: [...new Set(groups.map((g) => g.storage))],
    colors,
    regions: colors.filter((g) => g.color === selected?.color),
  };
}

/** How many of a unit can be bought: fractional for weights, `Infinity` when untracked. */
export function unitMaxQty(p: Product, unit: ProductUnit | null | undefined): number {
  if (p.stock_type !== "tracked") return Infinity;
  const available = p.stock / (unit?.multiplier || 1);
  return isWeightUnit(unit?.unit_name) ? available : Math.floor(available);
}

/** The unit selected by default: the first one that is actually in stock. */
export function firstAvailableUnit(p: Product): ProductUnit | undefined {
  if (!hasVariants(p) && p.stock_type === "tracked") {
    return p.units?.find((u) => Math.floor(p.stock / (u.multiplier || 1)) > 0) || p.units?.[0];
  }
  return p.units?.[0];
}
