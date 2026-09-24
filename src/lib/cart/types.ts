/**
 * One cart line. A product enters the cart as a plain unit, a variant, a
 * single phone (IMEI) or a count from a phone bucket, and `key` keeps those
 * apart so the same product can appear as several lines:
 *
 *   `${id}_${unit_id ?? "base"}`  unit      `${id}_v${variant_id}`  variant
 *   `${id}_s${serial_id}`         IMEI      `${id}_b${bucket_key}`  bucket
 *
 * The shape is the one the single-page storefront kept in memory, now saved
 * under `sf_cart_v1` so a cart survives a reload.
 */
export interface CartItem {
  key: string;
  product_id: number;
  name: string;
  image: string;

  unit_id: number | null | undefined;
  variant_id: number | null;
  serial_id?: number | null;
  unit_name: string;
  variant_name: string;
  /** Weight units (kg, g) accept fractional quantities. */
  weight?: boolean;

  /** Masked IMEI of a single phone. */
  imei?: string;

  /** Grouped phones: the bucket's identity, echoed back in the order. */
  bucket_key?: string;
  base_price?: number;
  order_currency?: string;
  storage?: string;
  color?: string;
  region?: string;
  spec_label?: string;

  /** Price in the store's base currency. */
  price: number;
  /** The product's own currency; empty means the store's base currency. */
  currency: string;
  /** The price in `currency`. */
  cur_price: number | null | undefined;

  qty: number;
  maxQty: number;
}
