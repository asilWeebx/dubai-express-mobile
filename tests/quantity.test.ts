import assert from "node:assert/strict";
import test from "node:test";

import { commitQuantity, stepQuantity } from "../src/lib/cart/quantity.ts";

test("empty or non-numeric input is discarded, not applied", () => {
  for (const raw of ["", "   ", "abc"]) assert.equal(commitQuantity(raw), null, JSON.stringify(raw));
});

test("a typed whole number is used as is, capped at the stock", () => {
  assert.equal(commitQuantity("10", { max: 50 }), 10);
  assert.equal(commitQuantity("500", { max: 50 }), 50);
});

test("whole-unit products drop the fraction and never go below one", () => {
  assert.equal(commitQuantity("2.9"), 2);
  assert.equal(commitQuantity("0.5"), 1);
  assert.equal(commitQuantity("-3"), 1);
});

test("weights keep up to three decimals and at least 0.001", () => {
  assert.equal(commitQuantity("1.23456", { allowDecimal: true }), 1.235);
  assert.equal(commitQuantity("0", { allowDecimal: true }), 0.001);
  assert.equal(commitQuantity("3", { allowDecimal: true, max: 2.5 }), 2.5);
});

test("+/− step by one, or by 0.001 for weights", () => {
  assert.equal(stepQuantity(3, 1, false), 4);
  assert.equal(stepQuantity(1, -1, false), 1);
  assert.equal(stepQuantity(0.5, 1, true), 0.501);
  assert.equal(stepQuantity(0.001, -1, true), 0.001);
});
