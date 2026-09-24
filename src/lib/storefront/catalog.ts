import type { Category, CategoryImage, Product, RawStoreBanner } from "./types";

/**
 * Synthetic top-level category for products the ERP never assigned one to.
 * Real category ids come from the ERP as positive integers, so this can't
 * collide with one.
 */
export const UNCATEGORIZED_ID = -1;
const UNCATEGORIZED_NAME = "Boshqa mahsulotlar";

/** After `normalizeCategories`, a product has a category id exactly when it has a named category to sit in. */
export function isUncategorized(p: Product): boolean {
  return !p.category_id;
}

interface NamedCategory {
  id: number;
  name: string;
}

/**
 * Rewrites each product's category fields into the two levels the storefront
 * shows: a top category, and at most one subcategory under it.
 *
 * The API sends no category tree, only each product's category and that
 * category's parent, and nothing guarantees those rows are complete. Taken
 * as they come, a product drops out of the home grid without a trace when its
 * category has no name (deleted or renamed in the ERP), when its parent has
 * no name so the category hangs under nothing, or when the tree is three
 * levels deep so its parent is itself a subcategory. So:
 *  - a name missing on one row is taken from any other row that has it;
 *  - a nameless category hands its products to its nearest named ancestor,
 *    or to "Boshqa mahsulotlar" when it has none;
 *  - a category whose parent is unknown becomes a top category;
 *  - anything deeper sits directly under its top category, labelled with the
 *    levels in between ("Erkaklar › Ko'ylaklar") so same-named leaves differ.
 *
 * `view()` runs this once, so every later derivation sees the same rows.
 */
export function normalizeCategories(products: Product[]): Product[] {
  const names = new Map<number, string>();
  const parents = new Map<number, number>();
  const learnName = (id: number | null, name: string | null) => {
    const trimmed = name?.trim();
    if (id && trimmed && !names.has(id)) names.set(id, trimmed);
  };
  for (const p of products) {
    learnName(p.category_id, p.category_name);
    learnName(p.category_parent_id, p.category_parent_name);
    const { category_id: id, category_parent_id: parentId } = p;
    if (id && parentId && parentId !== id && !parents.has(id)) parents.set(id, parentId);
  }

  /** The named categories from `id` up to its root, nearest first. */
  const namedChain = (id: number): NamedCategory[] => {
    const chain: NamedCategory[] = [];
    const seen = new Set<number>();
    for (let current: number | undefined = id; current !== undefined; ) {
      seen.add(current);
      const name = names.get(current);
      if (name) chain.push({ id: current, name });
      let up = parents.get(current);
      // A loop in the ERP data: cut it here, so every later walk agrees on
      // where the tree ends.
      if (up !== undefined && seen.has(up)) {
        parents.delete(current);
        up = undefined;
      }
      current = up;
    }
    return chain;
  };

  return products.map((p) => {
    const anchor = p.category_id || p.category_parent_id;
    const chain = anchor ? namedChain(anchor) : [];
    const top = chain.at(-1);
    if (!top) {
      return { ...p, category_id: null, category_name: null, category_parent_id: null, category_parent_name: null };
    }
    if (chain.length === 1) {
      return { ...p, category_id: top.id, category_name: top.name, category_parent_id: null, category_parent_name: null };
    }
    return {
      ...p,
      category_id: chain[0].id,
      category_name: chain.slice(0, -1).reverse().map((c) => c.name).join(" › "),
      category_parent_id: top.id,
      category_parent_name: top.name,
    };
  });
}

/**
 * The API returns no category tree — each product just carries its category
 * and that category's parent. The flat list is rebuilt here from the product
 * rows (after `normalizeCategories`), sorted alphabetically — this store's
 * category bar has always read A→Z. Products with no category at all are
 * collected under a synthetic catch-all, appended after the sorted ones, so
 * they still have somewhere to appear instead of vanishing from the grid.
 */
export function buildCategories(products: Product[]): Category[] {
  const map = new Map<number, Category>();
  let hasUncategorized = false;
  for (const p of products) {
    if (p.category_id && p.category_name) {
      map.set(p.category_id, {
        id: p.category_id,
        name: p.category_name,
        parentId: p.category_parent_id || null,
      });
    } else if (isUncategorized(p)) {
      hasUncategorized = true;
    }
    if (p.category_parent_id && p.category_parent_name && !map.has(p.category_parent_id)) {
      map.set(p.category_parent_id, {
        id: p.category_parent_id,
        name: p.category_parent_name,
        parentId: null,
      });
    }
  }
  const categories = [...map.values()].sort((a, b) => a.name.localeCompare(b.name, "uz"));
  if (hasUncategorized) {
    categories.push({ id: UNCATEGORIZED_ID, name: UNCATEGORIZED_NAME, parentId: null });
  }
  return categories;
}

export function categoryImageMap(images: CategoryImage[] | undefined): Record<number, string> {
  return Object.fromEntries((images ?? []).map((c) => [c.id, c.image]));
}

/** Sold out regardless of which unit or variant is picked. */
export function isOutOfStock(p: Product): boolean {
  return p.has_variants && p.variants?.length
    ? !p.in_stock
    : p.stock_type === "tracked" && (p.stock ?? 0) <= 0;
}

/** Rough price used only to order "similar" products by closeness. */
export function approxPrice(p: Product): number {
  return p.units?.[0]?.price ?? p.variants?.[0]?.price ?? 0;
}

/**
 * Products in the same category (then the same parent category), nearest in
 * price first. Derived from the loaded catalog — no API call. Uncategorized
 * products only match other uncategorized products, since they share no
 * category or parent to compare.
 */
export function similarProducts(p: Product | null, all: Product[], limit = 10): Product[] {
  if (!p) return [];
  const sameCat: Product[] = [];
  const sameParent: Product[] = [];
  for (const x of all) {
    if (x.id === p.id) continue;
    if (isUncategorized(p)) {
      if (isUncategorized(x)) sameCat.push(x);
    } else if (p.category_id && x.category_id === p.category_id) sameCat.push(x);
    else if (p.category_parent_id && x.category_parent_id === p.category_parent_id) sameParent.push(x);
  }
  const base = approxPrice(p);
  const byCloseness = (list: Product[]) =>
    [...list].sort((a, b) => Math.abs(approxPrice(a) - base) - Math.abs(approxPrice(b) - base));
  return [...byCloseness(sameCat), ...byCloseness(sameParent)].slice(0, limit);
}

/** Search text for a product — name, SKU and both category levels. */
function haystack(p: Product): string {
  return [p.name, p.sku, p.category_name, p.category_parent_name]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

/** Character pairs, used to score how close two strings look. */
function bigrams(value: string): Set<string> {
  const normalized = value.toLowerCase().replace(/[^a-z0-9а-яёўқғҳ]+/gi, " ").trim();
  const pairs = new Set<string>();
  for (let i = 0; i < normalized.length - 1; i++) pairs.add(normalized.slice(i, i + 2));
  return pairs;
}

/**
 * When a search has no exact match: products whose name, SKU or category
 * shares any word with the query, most shared words first.
 *
 * Word overlap runs first because it ranks meaningfully — two shared words
 * beat one. Only when it finds nothing does the bigram pass run, so a
 * misspelling ("kiyum") still returns something instead of an empty panel.
 */
export function searchSuggestions(query: string, all: Product[], limit = 8): Product[] {
  const words = query.toLowerCase().trim().split(/\s+/).filter(Boolean);
  if (!words.length) return [];

  const scored: [Product, number][] = [];
  for (const p of all) {
    const hay = haystack(p);
    const score = words.reduce((s, w) => s + (hay.includes(w) ? 1 : 0), 0);
    if (score > 0) scored.push([p, score]);
  }
  if (scored.length) {
    scored.sort((a, b) => b[1] - a[1]);
    return scored.slice(0, limit).map((s) => s[0]);
  }

  const queryPairs = bigrams(query);
  if (!queryPairs.size) return [];
  return all
    .map((p) => {
      const productPairs = bigrams(haystack(p));
      let overlap = 0;
      queryPairs.forEach((pair) => {
        if (productPairs.has(pair)) overlap++;
      });
      return { p, score: overlap / queryPairs.size };
    })
    .filter(({ score }) => score >= 0.22)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(({ p }) => p);
}

/** The home grid: a subcategory, else a top category (with its children), then a name search. */
export function filterProducts(
  products: Product[],
  selTop: number | null,
  selSub: number | null,
  search: string,
): Product[] {
  let list = products;
  if (selSub) list = list.filter((p) => p.category_id === selSub);
  else if (selTop === UNCATEGORIZED_ID) list = list.filter(isUncategorized);
  else if (selTop) list = list.filter((p) => p.category_id === selTop || p.category_parent_id === selTop);
  if (search) {
    const q = search.toLowerCase();
    list = list.filter((p) => p.name.toLowerCase().includes(q));
  }
  return list;
}

export interface CategorySection {
  cat: Category;
  items: Product[];
}

/**
 * Groups products under their top-level category, keeping ERP order; empty
 * groups are dropped. A product whose top category isn't listed (a row that
 * skipped `normalizeCategories`) goes to the catch-all instead of vanishing,
 * so the sections always add up to the product count.
 */
export function groupByTopCategory(products: Product[], topCats: Category[]): CategorySection[] {
  const byCat = new Map<number, Product[]>(topCats.map((c) => [c.id, []]));
  const stray: Product[] = [];
  for (const p of products) {
    const topId = p.category_parent_id || p.category_id || UNCATEGORIZED_ID;
    (byCat.get(topId) ?? byCat.get(UNCATEGORIZED_ID) ?? stray).push(p);
  }
  const sections = topCats
    .map((cat) => ({ cat, items: byCat.get(cat.id) ?? [] }))
    .filter((g) => g.items.length > 0);
  if (stray.length > 0) {
    sections.push({ cat: { id: UNCATEGORIZED_ID, name: UNCATEGORIZED_NAME, parentId: null }, items: stray });
  }
  return sections;
}

/**
 * Products for a list of IDs, in the list's order, unknown IDs skipped. IDs
 * are compared as strings: the best-seller endpoint and the catalog have not
 * always agreed on whether an ID is a number or a string.
 */
export function matchProductsByIds<T extends { id: unknown }>(ids: unknown[], products: T[]): T[] {
  const byId = new Map<string, T>();
  for (const product of products ?? []) {
    if (product?.id != null) byId.set(String(product.id), product);
  }
  return (ids ?? [])
    .map((id) => (id == null ? undefined : byId.get(String(id))))
    .filter((p): p is T => Boolean(p));
}

/** Best-seller IDs matched against the catalog in rank order, sold-out ones skipped. */
export function rankTopProducts(ids: unknown[], products: Product[]): Product[] {
  if (!ids.length || !products.length) return [];
  return matchProductsByIds(ids, products).filter((p) => !isOutOfStock(p));
}

/** Keys the ERP has used for a banner's picture, most specific first. */
const BANNER_IMAGE_KEYS = ["image_url", "image", "url", "photo", "file"] as const;

/**
 * A banner's picture under whichever key the ERP used. A key missing from the
 * list above must not make an uploaded banner disappear from the carousel, so
 * any other value that names an image file is taken instead.
 */
export function bannerImage(banner: RawStoreBanner | null | undefined): string {
  if (typeof banner === "string") return banner;
  if (!banner || typeof banner !== "object") return "";
  const known = BANNER_IMAGE_KEYS.map((key) => banner[key]).find(
    (value): value is string => typeof value === "string" && value !== "",
  );
  if (known) return known;
  const other = Object.values(banner).find(
    (value) => typeof value === "string" && /\.(avif|gif|jpe?g|png|svg|webp)(\?|$)/i.test(value),
  );
  return typeof other === "string" ? other : "";
}
