/**
 * Types for the dukonline.uz Storefront API.
 *
 * Derived from live responses of `https://api.dukonline.uz/api/storefront/*`.
 * The API exposes exactly six endpoints — there is no product-detail,
 * category or pagination endpoint, so the whole catalog arrives in one call
 * and everything else is derived from it.
 *
 * Besides plain products (units, variants), a tenant can sell phones tracked
 * by IMEI. Those carry a `phone` block: the card is the MODEL, and the copies
 * in stock are grouped by storage + colour + region, either one by one
 * (`individual`, every IMEI listed) or as priced buckets (`grouped`, the
 * customer only picks how many).
 */

/** `tracked` products decrement stock; others are always sellable. */
export type StockType = "tracked" | "untracked" | (string & {});

/** A banner as the API sends it — a bare URL or an object. */
export type RawStoreBanner =
  | string
  | {
      id?: number;
      image_url?: string;
      image?: string;
      url?: string;
      photo?: string;
      file?: string;
      title?: string;
      [key: string]: unknown;
    };

export interface StoreBanner {
  image: string;
  title: string;
}

export interface StoreInfo {
  organization: string;
  store: string;
  /** May be a symbol (`"$"`), a code (`"USD"`) or a word (`"so'm"`). */
  currency: string;
  banners: RawStoreBanner[];
}

/**
 * A sellable unit of a product (piece, box, kg…). `multiplier` is how many
 * base stock units one of these consumes, so a "box of 12" has multiplier 12.
 */
export interface ProductUnit {
  unit_id: number | null;
  unit_name: string;
  multiplier: number;
  price: number;
  original_price: number | null;
  /** Empty string means "the store's base currency" (dollars for this store). */
  currency: string;
  /** The price in the product's own `currency`. */
  cur_price: number;
  cur_original_price: number | null;
}

export interface ProductVariant {
  id: number;
  name: string;
  price: number;
  original_price: number | null;
  currency: string;
  cur_price: number;
  cur_original_price: number | null;
  stock: number | null;
  in_stock: boolean;
}

/** One physical phone, identified by its (masked) IMEI. */
export interface PhoneSerialUnit {
  id: number;
  imei_masked: string;
  condition: string;
  condition_label: string;
  battery_health: number | null;
  battery_cycles: number | null;
  note: string;
  price: number;
  cur_price: number | null;
  currency: string;
}

/** Copies sharing storage, colour and region (`individual` mode). */
export interface PhoneGroup {
  key: string;
  storage: string;
  color: string;
  color_label: string;
  color_hex: string;
  region: string;
  count: number;
  /** Every copy is interchangeable, so no per-IMEI choice is offered. */
  uniform: boolean;
  units: PhoneSerialUnit[];
}

/** A spec + price bucket sold by count, without IMEIs (`grouped` mode). */
export interface PhoneBucket {
  key: string;
  storage: string;
  color: string;
  color_label: string;
  color_hex: string;
  region: string;
  /** Raw serial price in `currency`, echoed back in the order. */
  base_price: number;
  currency: string;
  price: number;
  original_price: number | null;
  cur_price: number | null;
  cur_original_price: number | null;
  count: number;
}

export interface PhoneInfo {
  mode: "grouped" | "individual" | (string & {});
  from_price: number;
  from_cur_price: number | null;
  currency: string;
  groups: PhoneGroup[];
  buckets: PhoneBucket[];
}

export interface Product {
  id: number;
  name: string;
  sku: string;
  description: string;
  category_id: number | null;
  category_name: string | null;
  category_parent_id: number | null;
  category_parent_name: string | null;
  image: string;
  stock_type: StockType;
  stock: number;
  in_stock: boolean;
  has_variants: boolean;
  variants: ProductVariant[];
  units: ProductUnit[];
  discount_percent: number;
  /** ERP product class, e.g. `"telefon"`. */
  product_type: string;
  attributes: Record<string, string>;
  phone?: PhoneInfo | null;
}

export interface CategoryImage {
  id: number;
  image: string;
}

export interface CatalogResponse {
  store: string;
  results: Product[];
  show_stock: boolean;
  show_images: boolean;
  category_images: CategoryImage[];
}

export interface TopProductsResponse {
  product_ids: number[];
}

export interface Customer {
  customer_code: string;
  code?: string;
  name?: string;
  customer_name?: string;
  phone?: string;
  phone_number?: string;
  debt?: number;
  credit?: number;
  currency_debts?: Record<string, number>;
  /** Advance-payment credit held in a foreign currency (mirrors `currency_debts`).
   *  The storefront UI renders this map directly; `/storefront/customer/` must
   *  include it for foreign-currency prepayments to be visible. */
  currency_credits?: Record<string, number>;
  [key: string]: unknown;
}

export interface CustomerSaleItem {
  name?: string;
  product_name?: string;
  qty?: number;
  quantity?: number;
  unit?: string;
  unit_name?: string;
  price?: number;
  /** The phone sold on this line, when it was tracked by IMEI. */
  serial?: {
    imei?: string;
    storage?: string;
    color?: string;
    region?: string;
    battery?: number | null;
  } | null;
}

export interface PaymentBreakdown {
  method?: string;
  amount?: number;
}

export interface CustomerSale {
  receipt_number?: string;
  created_at?: string;
  total?: number;
  paid?: number;
  debt?: number;
  debt_currency?: string;
  debt_currency_amount?: number;
  debt_rate?: number;
  payment_method?: string;
  payment_breakdown?: PaymentBreakdown[];
  items?: CustomerSaleItem[];
}

export interface CustomerOrder {
  order_no?: string;
  created_at?: string;
  total?: number;
  status?: string;
}

export interface CustomerPayment {
  amount?: number;
  currency?: string;
  created_at?: string;
  note?: string;
}

export interface CustomerAccountResponse {
  customer: Customer;
  sales: CustomerSale[];
  online_orders: CustomerOrder[];
  payments: CustomerPayment[];
}

export interface OrderItemPayload {
  product_id: number;
  variant_id?: number;
  unit_id?: number;
  serial_id?: number;
  /** Grouped phones: the bucket's identity (spec + raw price) instead of an IMEI. */
  base_price?: number;
  currency?: string;
  storage?: string;
  color?: string;
  region?: string;
  qty: number;
}

export type DeliveryType = "courier" | "pickup";

export interface OrderPayload {
  customer_name: string;
  phone: string;
  delivery_type: DeliveryType;
  payment_method: string;
  address?: string;
  landmark?: string;
  latitude?: number;
  longitude?: number;
  customer_code?: string;
  items: OrderItemPayload[];
}

export interface OrderResponse {
  order_no: string;
  [key: string]: unknown;
}

/** A category derived client-side from product rows; `parentId` null = top level. */
export interface Category {
  id: number;
  name: string;
  parentId: number | null;
}
