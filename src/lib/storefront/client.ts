import "server-only";

import type {
  CatalogResponse,
  Customer,
  CustomerAccountResponse,
  OrderPayload,
  OrderResponse,
  StoreInfo,
  TopProductsResponse,
} from "./types";

/**
 * Every dukonline storefront talks to the same host — the tenant is chosen
 * purely by the `X-Storefront-Key` header, so only the key changes per store.
 */
export const API_URL =
  process.env.DUKONLINE_API_URL?.replace(/\/$/, "") ??
  "https://api.dukonline.uz/api";

const STOREFRONT_KEY = process.env.DUKONLINE_STOREFRONT_KEY ?? "";

/**
 * api.dukonline.uz sits behind a filter that returns a bare 403 "Blocked" (not
 * the API's own JSON) to any request that arrives without a User-Agent — which
 * is exactly what server-side `fetch` sends by default, so every storefront
 * call was rejected before it reached the tenant check. Identifying the
 * storefront honestly is enough to pass; nothing here pretends to be a browser.
 */
const USER_AGENT = "dukonline-storefront/1.0 (dubai-express-mobile)";

/** Media paths come back either absolute (CDN) or relative to the API host. */
export function media(url: string | null | undefined): string {
  if (!url) return "";
  if (/^(https?:|data:|blob:)/.test(url)) return url;
  return API_URL.replace(/\/api\/?$/, "") + url;
}

export class StorefrontError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "StorefrontError";
  }
}

interface RequestOptions {
  method?: "GET" | "POST";
  body?: unknown;
  /** Seconds to cache. `0` disables caching (writes, per-customer reads). */
  revalidate?: number;
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  if (!STOREFRONT_KEY) {
    throw new StorefrontError(
      "DUKONLINE_STOREFRONT_KEY is not set. Copy it from the ERP SuperAdmin panel (organization -> Online Store) into .env.local.",
      500,
    );
  }

  const { method = "GET", body, revalidate = 0 } = options;

  const res = await fetch(API_URL + path, {
    method,
    headers: {
      "Content-Type": "application/json",
      "X-Storefront-Key": STOREFRONT_KEY,
      "User-Agent": USER_AGENT,
    },
    body: body === undefined ? undefined : JSON.stringify(body),
    cache: revalidate > 0 ? undefined : "no-store",
    next: revalidate > 0 ? { revalidate } : undefined,
  });

  if (!res.ok) {
    const detail = await res
      .json()
      .catch(() => ({}) as { error?: string });
    // A non-JSON failure (a proxy error page, say) still says which status it was.
    throw new StorefrontError(detail?.error || `Xatolik (${res.status})`, res.status);
  }

  return res.json() as Promise<T>;
}

/** Store name, display currency and the banners uploaded in the ERP. */
export function getStoreInfo() {
  return request<StoreInfo>("/storefront/info/", { revalidate: 300 });
}

/**
 * The entire catalog in one response — the API has no pagination, no search
 * and no per-product endpoint, so this is the only source of product data.
 *
 * Passing a `customerCode` applies that customer's price tier, which makes the
 * response personal and therefore uncacheable.
 */
export function getCatalog(customerCode?: string) {
  const query = customerCode
    ? `?customer_code=${encodeURIComponent(customerCode)}`
    : "";
  return request<CatalogResponse>(`/storefront/products/${query}`, {
    revalidate: customerCode ? 0 : 60,
  });
}

/** Best sellers, returned as bare IDs to match against the catalog. */
export function getTopProductIds(limit = 12) {
  return request<TopProductsResponse>(
    `/storefront/top-products/?limit=${limit}`,
    { revalidate: 300 },
  );
}

/** Exchanges a customer code printed in-store for the customer record. */
export function login(code: string) {
  return request<Customer>("/storefront/login/", {
    method: "POST",
    body: { code },
  });
}

/** Debt, balance and purchase history for a signed-in customer. */
export function getCustomer(code: string) {
  return request<CustomerAccountResponse>(
    `/storefront/customer/?code=${encodeURIComponent(code)}`,
  );
}

export function createOrder(payload: OrderPayload) {
  return request<OrderResponse>("/storefront/orders/", {
    method: "POST",
    body: payload,
  });
}
