import assert from "node:assert/strict";
import test from "node:test";

import {
  addBucketLine,
  addSerialLine,
  addUnitLine,
  addVariantLine,
  revalidateCart,
  sanitizeStoredCart,
  setLineQty,
  toOrderItem,
} from "../src/lib/cart/lines.ts";
import type { CartItem } from "../src/lib/cart/types.ts";

import { bucket, product, serial, unit, variant } from "./fixtures.ts";

test("unit lines use the single-page cart keys and stop at the stock", () => {
  const p = product({ id: 7, stock: 3, units: [unit({ unit_id: null })] });
  let cart = addUnitLine([], p, p.units[0]);
  assert.equal(cart[0].key, "7_base");
  cart = addUnitLine(cart, p, p.units[0], 5);
  assert.equal(cart[0].qty, 3);
  assert.equal(addUnitLine(cart, p, p.units[0]), cart, "no change at the limit");
});

test("a multiplier unit is limited by whole boxes; untracked stock is stored as 9999", () => {
  const box = unit({ unit_id: 4, unit_name: "Komplet", multiplier: 12 });
  const p = product({ stock: 30, units: [unit({ unit_id: 3 }), box] });
  assert.equal(addUnitLine([], p, box, 9)[0].qty, 2);
  const free = product({ stock_type: "untracked", stock: 0 });
  assert.equal(addUnitLine([], free, free.units[0])[0].maxQty, 9999);
});

test("sold-out units are not added", () => {
  const p = product({ stock: 0 });
  assert.deepEqual(addUnitLine([], p, p.units[0]), []);
});

test("weight units keep fractional stock", () => {
  const kg = unit({ unit_id: 9, unit_name: "kg" });
  const p = product({ stock: 2.5, units: [kg] });
  const cart = addUnitLine([], p, kg, 2.25);
  assert.equal(cart[0].qty, 2.25);
  assert.equal(cart[0].weight, true);
  assert.equal(cart[0].maxQty, 2.5);
});

test("variants, single phones and phone buckets each get their own line", () => {
  const p = product({ id: 3, has_variants: true, variants: [variant({ id: 11, stock: 2 })] });
  const v = addVariantLine([], p, p.variants[0], 5);
  assert.equal(v[0].key, "3_v11");
  assert.equal(v[0].qty, 2);

  const phone = product({ id: 4 });
  const s = addSerialLine([], phone, serial({ id: 77 }));
  assert.equal(s[0].key, "4_s77");
  assert.equal(addSerialLine(s, phone, serial({ id: 77 })), s, "one phone is one piece");

  const b = addBucketLine([], phone, bucket({ count: 3, color_label: "Qora", region: "LL/A" }), 5);
  assert.equal(b[0].key, "4_b64 GB|||USD|500.0");
  assert.equal(b[0].qty, 3);
  assert.equal(b[0].spec_label, "64 GB · Qora · LL/A");
});

test("setting a quantity caps it, and zero removes the line", () => {
  const p = product({ stock: 4 });
  const cart = addUnitLine([], p, p.units[0]);
  assert.equal(setLineQty(cart, cart[0].key, 10)[0].qty, 4);
  assert.deepEqual(setLineQty(cart, cart[0].key, 0), []);
});

test("the order payload carries ids, and bucket identity for grouped phones", () => {
  const phone = product({ id: 4 });
  const [line] = addBucketLine([], phone, bucket({ storage: "128 GB", color: "black", region: "CH" }), 2);
  assert.deepEqual(toOrderItem(line), {
    product_id: 4,
    base_price: 500,
    currency: "USD",
    storage: "128 GB",
    color: "black",
    region: "CH",
    qty: 2,
  });

  const withUnit = product({ id: 5, units: [unit({ unit_id: 8 })] });
  assert.deepEqual(toOrderItem(addUnitLine([], withUnit, withUnit.units[0], 2)[0]), {
    product_id: 5,
    unit_id: 8,
    qty: 2,
  });
  assert.deepEqual(toOrderItem(addSerialLine([], phone, serial({ id: 9 }))[0]), {
    product_id: 4,
    serial_id: 9,
    qty: 1,
  });
});

test("revalidation refreshes prices, caps to stock and drops vanished lines", () => {
  const p = product({ id: 1, stock: 10 });
  const gone = product({ id: 2 });
  const cart = [...addUnitLine([], p, p.units[0], 6), ...addUnitLine([], gone, gone.units[0])];

  const fresh = product({ id: 1, stock: 4, units: [unit({ price: 12000, cur_price: 12000 })] });
  const next = revalidateCart(cart, [fresh]);
  assert.equal(next.length, 1);
  assert.equal(next[0].qty, 4);
  assert.equal(next[0].price, 12000);
});

test("revalidation drops sold phones and empty buckets", () => {
  const phone = product({
    id: 4,
    phone: { mode: "grouped", from_price: 0, from_cur_price: 0, currency: "USD", groups: [], buckets: [bucket({ count: 0 })] },
  });
  const cart = addBucketLine([], product({ id: 4 }), bucket(), 1);
  assert.deepEqual(revalidateCart(cart, [phone]), []);
});

test("a plain product with no units keeps its bare line through revalidation", () => {
  const p = product({ id: 8, units: [] });
  const cart = addUnitLine([], p, p.units[0]);
  assert.equal(cart[0].key, "8_base");
  assert.equal(revalidateCart(cart, [p]), cart);
});

test("a unit line is dropped once its product is sold only as variants", () => {
  const p = product({ id: 8, units: [] });
  const cart = addUnitLine([], p, p.units[0]);
  const nowVariants = product({ id: 8, units: [], has_variants: true, variants: [variant()] });
  assert.deepEqual(revalidateCart(cart, [nowVariants]), []);
});

test("revalidation returns the same array when nothing changed", () => {
  const p = product();
  const cart = addUnitLine([], p, p.units[0]);
  assert.equal(revalidateCart(cart, [p]), cart);
  assert.equal(revalidateCart(cart, []), cart, "an empty catalog (API down) keeps the cart");
});

test("saved carts are accepted only when well-formed, and cleaned", () => {
  const saved = [
    { key: "1_base", product_id: 1, qty: "2", maxQty: null },
    { key: 5, qty: 1 },
    { key: "2_base", qty: 0 },
    null,
  ];
  const cart = sanitizeStoredCart(saved) as CartItem[];
  assert.equal(cart.length, 1);
  assert.equal(cart[0].qty, 2);
  assert.equal(cart[0].maxQty, 9999, "Infinity comes back from JSON as null");
  assert.deepEqual(sanitizeStoredCart({ not: "an array" }), []);
});
