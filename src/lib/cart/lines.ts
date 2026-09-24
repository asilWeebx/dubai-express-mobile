import { isWeightUnit } from "../storefront/currency.ts";
import { getPhone, hasVariants, unitMaxQty } from "../storefront/product-view.ts";
import type {
  OrderItemPayload,
  PhoneBucket,
  PhoneSerialUnit,
  Product,
  ProductUnit,
  ProductVariant,
} from "../storefront/types";

import type { CartItem } from "./types";

/**
 * Pure cart reducers: each takes the current lines and returns the next ones,
 * or the same array when nothing changes. `CartProvider` persists the result.
 */

/** "No limit" as stored: `Infinity` does not survive JSON. */
const UNLIMITED = 9999;
const storable = (max: number) => (Number.isFinite(max) ? max : UNLIMITED);

export function unitKey(productId: number, unit: ProductUnit | null | undefined) {
  return `${productId}_${unit?.unit_id ?? "base"}`;
}

export function variantKey(productId: number, variant: ProductVariant | null | undefined) {
  return `${productId}_v${variant?.id ?? "base"}`;
}

/** Adds `qty` of a unit (fractional for weights), never beyond the stock. */
export function addUnitLine(
  cart: CartItem[],
  p: Product,
  unit: ProductUnit | null | undefined,
  qty = 1,
): CartItem[] {
  const key = unitKey(p.id, unit);
  const weight = isWeightUnit(unit?.unit_name);
  const max = unitMaxQty(p, unit);
  if (max <= 0) return cart;

  const existing = cart.find((x) => x.key === key);
  if (existing) {
    if (existing.qty >= max) return cart;
    return cart.map((x) => (x.key === key ? { ...x, qty: Math.min(x.qty + qty, max) } : x));
  }
  return [
    ...cart,
    {
      key,
      product_id: p.id,
      unit_id: unit?.unit_id,
      variant_id: null,
      variant_name: "",
      unit_name: unit?.unit_name || "dona",
      weight,
      name: p.name,
      price: unit?.price ?? 0,
      currency: unit?.currency || "",
      cur_price: unit?.cur_price,
      qty: Math.min(qty, max),
      maxQty: storable(max),
      image: p.image,
    },
  ];
}

export function addVariantLine(
  cart: CartItem[],
  p: Product,
  variant: ProductVariant,
  qty: number,
): CartItem[] {
  const key = variantKey(p.id, variant);
  const max = variant.stock != null ? Math.floor(variant.stock) : Infinity;
  if (max <= 0) return cart;

  if (cart.some((x) => x.key === key)) {
    return cart.map((x) => (x.key === key ? { ...x, qty: Math.min(x.qty + qty, max) } : x));
  }
  return [
    ...cart,
    {
      key,
      product_id: p.id,
      unit_id: null,
      variant_id: variant.id,
      variant_name: variant.name,
      unit_name: "dona",
      name: p.name,
      price: variant.price,
      currency: variant.currency || "",
      cur_price: variant.cur_price,
      qty: Math.min(qty, max),
      maxQty: storable(max),
      image: p.image,
    },
  ];
}

/** One phone (IMEI) is exactly one piece and its own line. */
export function addSerialLine(cart: CartItem[], p: Product, unit: PhoneSerialUnit): CartItem[] {
  const key = `${p.id}_s${unit.id}`;
  if (cart.some((x) => x.key === key)) return cart;
  return [
    ...cart,
    {
      key,
      product_id: p.id,
      serial_id: unit.id,
      unit_id: null,
      variant_id: null,
      variant_name: "",
      unit_name: "dona",
      name: p.name,
      imei: unit.imei_masked,
      price: unit.price,
      currency: unit.currency || "",
      cur_price: unit.cur_price,
      qty: 1,
      maxQty: 1,
      image: p.image,
    },
  ];
}

/**
 * N phones from a spec + price bucket, without IMEIs — when the order lands,
 * the ERP reserves exactly N copies from that bucket.
 */
export function addBucketLine(
  cart: CartItem[],
  p: Product,
  bucket: PhoneBucket,
  qty: number,
): CartItem[] {
  const key = `${p.id}_b${bucket.key}`;
  const max = bucket.count || 1;
  const add = Math.min(qty, max);
  if (add <= 0) return cart;

  const existing = cart.find((x) => x.key === key);
  if (existing) {
    if (existing.qty >= max) return cart;
    return cart.map((x) => (x.key === key ? { ...x, qty: Math.min(x.qty + add, max) } : x));
  }
  return [
    ...cart,
    {
      key,
      product_id: p.id,
      bucket_key: bucket.key,
      base_price: bucket.base_price,
      order_currency: bucket.currency || "",
      storage: bucket.storage || "",
      color: bucket.color || "",
      region: bucket.region || "",
      unit_id: null,
      variant_id: null,
      serial_id: null,
      variant_name: "",
      unit_name: "dona",
      name: p.name,
      spec_label: [bucket.storage, bucket.color_label, bucket.region].filter(Boolean).join(" · "),
      price: bucket.price,
      currency: bucket.currency || "",
      cur_price: bucket.cur_price,
      qty: add,
      maxQty: max,
      image: p.image,
    },
  ];
}

/** Sets a line's quantity, capped at its stock; zero or less removes it. */
export function setLineQty(cart: CartItem[], key: string, qty: number): CartItem[] {
  const item = cart.find((x) => x.key === key);
  if (!item) return cart;
  const capped = item.maxQty ? Math.min(qty, item.maxQty) : qty;
  if (capped <= 0) return cart.filter((x) => x.key !== key);
  if (capped === item.qty) return cart;
  return cart.map((x) => (x.key === key ? { ...x, qty: capped } : x));
}

export function removeLine(cart: CartItem[], key: string): CartItem[] {
  return cart.some((x) => x.key === key) ? cart.filter((x) => x.key !== key) : cart;
}

/**
 * Re-checks saved lines against the current catalog: prices and names are
 * refreshed, quantities capped to stock, and lines whose product, variant,
 * phone or bucket is gone (or sold out) are dropped.
 */
export function revalidateCart(cart: CartItem[], products: Product[]): CartItem[] {
  if (!products.length) return cart;
  const byId = new Map(products.map((p) => [p.id, p]));

  const next = cart.flatMap((it): CartItem[] => {
    const p = byId.get(it.product_id);
    if (!p) return [];

    if (it.variant_id) {
      const v = p.variants?.find((x) => x.id === it.variant_id);
      if (!v || !v.in_stock) return [];
      const maxQty = v.stock != null ? Math.floor(v.stock) : UNLIMITED;
      if (maxQty <= 0) return [];
      return [{
        ...it,
        name: p.name,
        variant_name: v.name,
        price: v.price,
        currency: v.currency || "",
        cur_price: v.cur_price,
        image: p.image,
        maxQty,
        qty: Math.min(it.qty, maxQty),
      }];
    }

    if (it.serial_id) {
      const units = (p.phone?.groups ?? []).flatMap((g) => g.units ?? []);
      const u = units.find((x) => x.id === it.serial_id);
      if (!u) return [];
      return [{
        ...it,
        name: p.name,
        imei: u.imei_masked,
        price: u.price,
        currency: u.currency || "",
        cur_price: u.cur_price,
        image: p.image,
        maxQty: 1,
        qty: 1,
      }];
    }

    if (it.bucket_key) {
      const b = (p.phone?.buckets ?? []).find((x) => x.key === it.bucket_key);
      const maxQty = b?.count || 0;
      if (!b || maxQty <= 0) return [];
      return [{
        ...it,
        name: p.name,
        price: b.price,
        currency: b.currency || "",
        cur_price: b.cur_price,
        image: p.image,
        maxQty,
        qty: Math.min(it.qty, maxQty),
      }];
    }

    const unit = p.units?.find((u) => u.unit_id === it.unit_id) || p.units?.[0];
    // A plain product with no units went in as its bare base unit (see
    // `addUnitLine`) and stays that way. Only a product now sold as variants
    // or phones has no plain line left to keep.
    if (!unit && (hasVariants(p) || getPhone(p))) return [];
    const maxQty = storable(unitMaxQty(p, unit));
    if (maxQty <= 0) return [];
    return [{
      ...it,
      unit_id: unit?.unit_id,
      unit_name: unit?.unit_name || "dona",
      weight: isWeightUnit(unit?.unit_name),
      name: p.name,
      price: unit?.price ?? 0,
      currency: unit?.currency || "",
      cur_price: unit?.cur_price,
      image: p.image,
      maxQty,
      qty: Math.min(it.qty, maxQty),
    }];
  });

  return JSON.stringify(next) === JSON.stringify(cart) ? cart : next;
}

/** Accepts only well-formed lines from a saved cart, which may be from an older build. */
export function sanitizeStoredCart(saved: unknown): CartItem[] {
  if (!Array.isArray(saved)) return [];
  return saved
    .filter((it) => it && typeof it.key === "string" && Number(it.qty) > 0)
    .map((it) => ({
      ...it,
      qty: Number(it.qty),
      // `Infinity` does not survive JSON: it comes back as null.
      maxQty: Number(it.maxQty) > 0 ? Number(it.maxQty) : UNLIMITED,
    }));
}

/** Strips display-only fields down to what `POST /storefront/orders/` wants. */
export function toOrderItem(it: CartItem): OrderItemPayload {
  return {
    product_id: it.product_id,
    ...(it.variant_id ? { variant_id: it.variant_id } : {}),
    ...(it.unit_id ? { unit_id: it.unit_id } : {}),
    ...(it.serial_id ? { serial_id: it.serial_id } : {}),
    // Grouped phones: no IMEI, the bucket identity (spec + raw price) instead,
    // with the serial's own currency.
    ...(it.base_price != null
      ? {
          base_price: it.base_price,
          currency: it.order_currency || "",
          storage: it.storage || "",
          color: it.color || "",
          region: it.region || "",
        }
      : {}),
    qty: it.qty,
  };
}
