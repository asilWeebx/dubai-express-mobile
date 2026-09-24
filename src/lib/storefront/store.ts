import "server-only";

import { cache } from "react";

import {
  StorefrontError,
  getCatalog,
  getStoreInfo,
  getTopProductIds,
  media,
} from "./client";
import {
  bannerImage,
  buildCategories,
  categoryImageMap,
  normalizeCategories,
  rankTopProducts,
} from "./catalog";
import { DEFAULT_CURRENCY, normalizeCurrency } from "./currency";
import type {
  CatalogResponse,
  Category,
  Product,
  StoreBanner,
  StoreInfo,
} from "./types";

/** Shown until `/storefront/info/` answers, and when it never does. */
const STORE_NAME = "Dubai Express Mobile";

/**
 * Why the storefront has no data. A rejected key needs a person to fix the
 * configuration; a network blip resolves itself, so the two must not show the
 * same message.
 */
export type FailureReason = "auth" | "unavailable";

/** Everything the shell needs, with safe defaults when the API is unreachable. */
export interface StoreSummary {
  name: string;
  /** Normalised code the store prices in (`"USD"`, `"UZS"`); empty product currencies mean this. */
  currency: string;
  banners: StoreBanner[];
  /** False when the storefront key is missing or rejected. */
  configured: boolean;
  reason?: FailureReason;
  error?: string;
}

export interface CatalogView {
  products: Product[];
  categories: Category[];
  categoryImages: Record<number, string>;
  topProducts: Product[];
  showImages: boolean;
  showStock: boolean;
  configured: boolean;
  reason?: FailureReason;
  error?: string;
}

function describe(error: unknown): string {
  return error instanceof Error ? error.message : "Do'kon ma'lumotlari yuklanmadi";
}

/** A missing or rejected key is a setup problem; anything else is transient. */
function classify(error: unknown): FailureReason {
  if (error instanceof StorefrontError) {
    if (error.status === 401 || error.status === 403 || error.status === 500) {
      return "auth";
    }
  }
  return "unavailable";
}

function summarize(info: StoreInfo): StoreSummary {
  return {
    name: info.store || STORE_NAME,
    currency: normalizeCurrency(info.currency) || DEFAULT_CURRENCY,
    // Banners uploaded under "Online do'kon → Bannerlar", as a URL or an object.
    banners: (info.banners ?? [])
      .map((banner) => ({
        image: media(bannerImage(banner)),
        title: typeof banner === "string" ? "" : banner.title || "",
      }))
      .filter((banner) => banner.image),
    configured: true,
  };
}

/**
 * Image URLs arrive either absolute (a CDN or a URL the shop owner pasted) or
 * relative to the API host. Resolving them here means client components only
 * ever see absolute URLs. Category fields are normalized here too, so the
 * category bar, the grid sections, the filters and the drawer all read the
 * same, complete two-level tree.
 */
function view(raw: CatalogResponse, topIds: number[]): CatalogView {
  const products = normalizeCategories(
    (raw.results ?? []).map((product) => ({
      ...product,
      image: media(product.image),
    })),
  );
  const categoryImages = categoryImageMap(
    (raw.category_images ?? []).map((c) => ({ ...c, image: media(c.image) })),
  );

  return {
    products,
    categories: buildCategories(products),
    categoryImages,
    topProducts: rankTopProducts(topIds, products),
    showImages: raw.show_images !== false,
    showStock: raw.show_stock !== false,
    configured: true,
  };
}

/**
 * A failed store call must not blank the whole site — the layout renders the
 * shell either way and surfaces the reason on the page instead.
 */
export const getStore = cache(async (): Promise<StoreSummary> => {
  try {
    return summarize(await getStoreInfo());
  } catch (error) {
    return {
      name: STORE_NAME,
      currency: DEFAULT_CURRENCY,
      banners: [],
      configured: false,
      reason: classify(error),
      error: describe(error),
    };
  }
});

/**
 * The catalog, its derived categories and the best-seller list, resolved in
 * one place. The API has no per-product endpoint, so every page that needs a
 * product reads it out of this list.
 */
export const getCatalogView = cache(
  async (customerCode?: string): Promise<CatalogView> => {
    try {
      const [raw, top] = await Promise.all([
        getCatalog(customerCode),
        // Best sellers are a nice-to-have; never fail the page over them.
        getTopProductIds(12).catch(() => ({ product_ids: [] })),
      ]);
      return view(raw, top.product_ids ?? []);
    } catch (error) {
      return {
        products: [],
        categories: [],
        categoryImages: {},
        topProducts: [],
        showImages: true,
        showStock: true,
        configured: false,
        reason: classify(error),
        error: describe(error),
      };
    }
  },
);

export const findProduct = cache(async (
  id: number,
  customerCode?: string,
): Promise<Product | null> => {
  const { products } = await getCatalogView(customerCode);
  return products.find((product) => product.id === id) ?? null;
});
