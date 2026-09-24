import assert from "node:assert/strict";
import test from "node:test";

import {
  bannerImage,
  buildCategories,
  filterProducts,
  groupByTopCategory,
  isOutOfStock,
  matchProductsByIds,
  normalizeCategories,
  rankTopProducts,
  searchSuggestions,
  similarProducts,
  UNCATEGORIZED_ID,
} from "../src/lib/storefront/catalog.ts";
import type { Product } from "../src/lib/storefront/types.ts";

import { product, unit, variant } from "./fixtures.ts";

const used = product({ id: 1, name: "11 uzi 128 b/u", category_id: 188, category_name: "B/U iphone", category_parent_id: 10, category_parent_name: "Telefonlar", units: [unit({ price: 235 })] });
const fresh = product({ id: 2, name: "13 pro 256 new", category_id: 189, category_name: "New 0 cikl iphone", category_parent_id: 10, category_parent_name: "Telefonlar", units: [unit({ price: 650 })] });
const cases = product({ id: 3, name: "Chexol qora", category_id: 20, category_name: "Aksessuarlar", units: [unit({ price: 5 })] });
const bare = (id: number) => product({ id, category_id: null, category_name: null, category_parent_id: null, category_parent_name: null });

/** The storefront's own derivation: normalize the rows, rebuild categories, group the home grid. */
function homeGrid(rows: Product[]) {
  const products = normalizeCategories(rows);
  const cats = buildCategories(products);
  const tops = cats.filter((c) => !c.parentId);
  return { products, cats, tops, sections: groupByTopCategory(products, tops) };
}

const sectionIds = (sections: ReturnType<typeof groupByTopCategory>) =>
  sections.map((s) => [s.cat.id, s.items.map((p) => p.id)]);

// ── Best sellers ─────────────────────────────────────────────────────────

test("matches numeric top-product IDs to string product IDs, and the reverse", () => {
  const byString = [{ id: "12", name: "Phone" }];
  assert.deepEqual(matchProductsByIds([12], byString), [byString[0]]);
  const byNumber = [{ id: 12, name: "Phone" }];
  assert.deepEqual(matchProductsByIds(["12"], byNumber), [byNumber[0]]);
});

test("keeps ranking order and skips unknown IDs", () => {
  const products = [{ id: 1, name: "First" }, { id: "2", name: "Second" }];
  assert.deepEqual(matchProductsByIds(["2", "missing", 1], products), [products[1], products[0]]);
});

test("best sellers keep rank order and skip unknown or sold-out ids", () => {
  const sold = product({ id: 9, stock: 0 });
  assert.deepEqual(rankTopProducts([3, 99, 9, 1], [used, cases, sold]).map((p) => p.id), [3, 1]);
});

// ── Categories ───────────────────────────────────────────────────────────

test("categories are rebuilt from product rows, alphabetically", () => {
  assert.deepEqual(buildCategories([used, fresh, cases]), [
    { id: 20, name: "Aksessuarlar", parentId: null },
    { id: 188, name: "B/U iphone", parentId: 10 },
    { id: 189, name: "New 0 cikl iphone", parentId: 10 },
    { id: 10, name: "Telefonlar", parentId: null },
  ]);
});

test("products with no category get a synthetic catch-all, appended last", () => {
  const all = [used, fresh, cases, bare(6)];

  const cats = buildCategories(all);
  assert.deepEqual(cats.at(-1), { id: UNCATEGORIZED_ID, name: "Boshqa mahsulotlar", parentId: null });

  const tops = cats.filter((c) => !c.parentId);
  assert.deepEqual(groupByTopCategory(all, tops).at(-1)?.items.map((p) => p.id), [6]);
  assert.deepEqual(filterProducts(all, UNCATEGORIZED_ID, null, "").map((p) => p.id), [6]);
});

test("real categories stay alphabetical, with the catch-all after them", () => {
  const { tops } = homeGrid([bare(6), used, cases]);
  assert.deepEqual(tops.map((c) => c.name), ["Aksessuarlar", "Telefonlar", "Boshqa mahsulotlar"]);
});

test("a fully categorized catalog gets no catch-all category", () => {
  assert.equal(buildCategories([used, fresh, cases]).some((c) => c.id === UNCATEGORIZED_ID), false);
});

test("well-formed rows pass through normalization unchanged", () => {
  const rows = [used, fresh, cases, bare(6)];
  assert.deepEqual(normalizeCategories(rows), rows);
});

test("a name missing on one row is taken from another row of the same category", () => {
  const nameless = product({ id: 7, category_id: 188, category_name: null, category_parent_id: 10, category_parent_name: "" });
  const [, fixed] = normalizeCategories([used, nameless]);
  assert.equal(fixed.category_name, "B/U iphone");
  assert.equal(fixed.category_parent_name, "Telefonlar");
});

test("a nameless category hands its products to its named parent, else to the catch-all", () => {
  const underParent = product({ id: 30, category_id: 31, category_name: null, category_parent_id: 10, category_parent_name: "Telefonlar" });
  const alone = product({ id: 32, category_id: 33, category_name: null });
  const { products, tops, sections } = homeGrid([underParent, alone]);

  assert.deepEqual(tops.map((c) => c.id), [10, UNCATEGORIZED_ID]);
  assert.deepEqual(sectionIds(sections), [[10, [30]], [UNCATEGORIZED_ID, [32]]]);
  assert.deepEqual(filterProducts(products, UNCATEGORIZED_ID, null, "").map((p) => p.id), [32]);
});

test("a subcategory whose parent has no name becomes a top category", () => {
  const orphan = product({ id: 40, category_id: 41, category_name: "Zaryadkalar", category_parent_id: 99, category_parent_name: null });
  const { cats, sections } = homeGrid([cases, orphan]);

  assert.deepEqual(cats.find((c) => c.id === 41), { id: 41, name: "Zaryadkalar", parentId: null });
  assert.deepEqual(sectionIds(sections), [[20, [3]], [41, [40]]]);
});

test("a product with only a parent category sits in that parent", () => {
  const parentOnly = product({ id: 42, category_id: null, category_name: null, category_parent_id: 10, category_parent_name: "Telefonlar" });
  const { products, sections } = homeGrid([used, parentOnly]);

  assert.deepEqual(sectionIds(sections), [[10, [1, 42]]]);
  assert.deepEqual(filterProducts(products, UNCATEGORIZED_ID, null, "").map((p) => p.id), []);
});

test("a third level is lifted under its top category, labelled with the level between", () => {
  const inApple = product({ id: 50, category_id: 51, category_name: "Apple", category_parent_id: 10, category_parent_name: "Telefonlar" });
  const inAppleUsed = product({ id: 52, category_id: 53, category_name: "B/U", category_parent_id: 51, category_parent_name: "Apple" });

  // The ERP may mention the levels in either order.
  for (const rows of [[inApple, inAppleUsed], [inAppleUsed, inApple]]) {
    const { products, cats, sections } = homeGrid(rows);
    assert.deepEqual(cats.filter((c) => c.parentId === 10).map((c) => c.name).sort(), ["Apple", "Apple › B/U"]);
    assert.deepEqual(sectionIds(sections), [[10, rows.map((p) => p.id)]]);
    assert.deepEqual(filterProducts(products, 10, 53, "").map((p) => p.id), [52]);
  }
});

test("a loop in the category rows still ends at a single top category", () => {
  const x = product({ id: 60, category_id: 61, category_name: "X", category_parent_id: 62, category_parent_name: "Y" });
  const y = product({ id: 63, category_id: 62, category_name: "Y", category_parent_id: 61, category_parent_name: "X" });
  const { tops, sections } = homeGrid([x, y]);

  assert.equal(tops.length, 1);
  assert.deepEqual(sectionIds(sections), [[tops[0].id, [60, 63]]]);
});

test("every product lands in exactly one home section and behind a category chip", () => {
  const rows = [
    used,
    fresh,
    cases,
    bare(70),
    product({ id: 71, category_id: 81, category_name: null }),
    product({ id: 72, category_id: 82, category_name: null, category_parent_id: 20, category_parent_name: "Aksessuarlar" }),
    product({ id: 73, category_id: 83, category_name: "Yetim", category_parent_id: 98, category_parent_name: null }),
    product({ id: 74, category_id: 84, category_name: "Apple", category_parent_id: 10, category_parent_name: "Telefonlar" }),
    product({ id: 75, category_id: 85, category_name: "B/U", category_parent_id: 84, category_parent_name: "Apple" }),
    product({ id: 76, category_id: null, category_name: null, category_parent_id: 20, category_parent_name: "Aksessuarlar" }),
  ];
  const { products, cats, tops, sections } = homeGrid(rows);

  const inSections = sections.flatMap((s) => s.items.map((p) => p.id));
  assert.equal(inSections.length, rows.length, "the sections add up to the catalog");
  assert.equal(new Set(inSections).size, rows.length, "and hold no product twice");

  const behindChips = new Set(tops.flatMap((t) => filterProducts(products, t.id, null, "").map((p) => p.id)));
  assert.equal(behindChips.size, rows.length, "every product is behind a top category chip");
  for (const sub of cats.filter((c) => c.parentId)) {
    assert.ok(filterProducts(products, sub.parentId, sub.id, "").length > 0, `the "${sub.name}" chip is not empty`);
  }
});

test("rows that skipped normalization still get a section instead of vanishing", () => {
  const raw = product({ id: 90, category_id: 91, category_name: null });
  const tops = buildCategories([cases]).filter((c) => !c.parentId);
  assert.deepEqual(sectionIds(groupByTopCategory([cases, raw], tops)), [[20, [3]], [UNCATEGORIZED_ID, [90]]]);
});

// ── Grid, search, similar ────────────────────────────────────────────────

test("the grid filters by subcategory, then top category, then name", () => {
  const all = [used, fresh, cases];
  assert.deepEqual(filterProducts(all, 10, 189, "").map((p) => p.id), [2]);
  assert.deepEqual(filterProducts(all, 10, null, "").map((p) => p.id), [1, 2]);
  assert.deepEqual(filterProducts(all, null, null, "CHEXOL").map((p) => p.id), [3]);
});

test("search suggestions rank by shared words across name and category", () => {
  const all = [used, fresh, cases];
  assert.deepEqual(searchSuggestions("b/u telefonlar", all).map((p) => p.id), [1, 2]);
  assert.deepEqual(searchSuggestions("   ", all), []);
});

test("a misspelled query falls back to the closest names instead of nothing", () => {
  const all = [used, fresh, cases];
  // No word matches "chehol", so the bigram pass takes over.
  assert.deepEqual(searchSuggestions("chehol", all).map((p) => p.id), [3]);
  assert.deepEqual(searchSuggestions("zzzzxxxx", all), []);
});

test("similar products: same category first, then same parent, nearest price first", () => {
  const cheap = product({ id: 4, category_id: 188, category_parent_id: 10, units: [unit({ price: 220 })] });
  const pricey = product({ id: 5, category_id: 188, category_parent_id: 10, units: [unit({ price: 500 })] });
  assert.deepEqual(similarProducts(used, [pricey, fresh, cheap, used, cases]).map((p) => p.id), [4, 5, 2]);
});

test("similar products: an uncategorized product only matches other uncategorized ones", () => {
  assert.deepEqual(similarProducts(bare(6), [used, bare(7), cases]).map((p) => p.id), [7]);
});

test("stock: variants follow in_stock, tracked units follow stock", () => {
  assert.equal(isOutOfStock(product({ stock: 0 })), true);
  assert.equal(isOutOfStock(product({ stock_type: "untracked", stock: 0 })), false);
  assert.equal(isOutOfStock(product({ has_variants: true, variants: [variant()], in_stock: false })), true);
});

// ── Banners ──────────────────────────────────────────────────────────────

test("a banner image is found under any key the ERP used", () => {
  assert.equal(bannerImage("/media/a.png"), "/media/a.png");
  assert.equal(bannerImage({ id: 11, image: "https://cdn/banner-1.png", title: "" }), "https://cdn/banner-1.png");
  assert.equal(bannerImage({ image_url: "/a.jpg", image: "/b.jpg" }), "/a.jpg");
  assert.equal(bannerImage({ id: 1, title: "Aksiya", picture: "/media/banners/x.webp?v=2" }), "/media/banners/x.webp?v=2");
  assert.equal(bannerImage({ id: 1, title: "Aksiya" }), "");
});
