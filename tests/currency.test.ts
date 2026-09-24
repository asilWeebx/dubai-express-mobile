import assert from "node:assert/strict";
import test from "node:test";

import {
  fmtQty,
  groupTotal,
  isWeightUnit,
  linePrice,
  money,
  normalizeCurrency,
  resolveCurrency,
} from "../src/lib/storefront/currency.ts";

test("the store's symbol and the products' codes normalise to one code", () => {
  assert.equal(normalizeCurrency("$"), "USD");
  assert.equal(normalizeCurrency(" us$ "), "USD");
  assert.equal(normalizeCurrency("so'm"), "UZS");
  assert.equal(normalizeCurrency("usd"), "USD");
  assert.equal(normalizeCurrency(null), "");
});

test("an empty product currency means the store's own", () => {
  assert.equal(resolveCurrency("", "$"), "USD");
  assert.equal(resolveCurrency("UZS", "$"), "UZS");
  assert.equal(resolveCurrency("", ""), "UZS", "unknown store currency falls back to so'm");
});

test("each price is shown in its own currency, an empty one in the store's", () => {
  assert.equal(money(235, "", "USD"), "$235");
  assert.equal(money(1234.5, "USD", "USD"), "$1 234.50");
  assert.equal(money(50000, "UZS", "USD"), "50 000 so'm");
  assert.equal(money(999.6, "UZS"), "1 000 so'm");
  assert.equal(money(12, "EUR", "USD"), "EUR 12");
  assert.equal(money(null, "", "USD"), "$0");
});

test("a cart line shows dollars for dollar goods and the base price otherwise", () => {
  const dollarPhone = { currency: "", price: 235, cur_price: 235 };
  assert.equal(linePrice(dollarPhone, 2, "USD"), "$470");
  const somCase = { currency: "UZS", price: 5, cur_price: 60000 };
  assert.equal(linePrice(somCase, 1, "USD"), "$5", "the ERP's price is in the store currency");
  const usdInSomStore = { currency: "USD", price: 6050000, cur_price: 500 };
  assert.equal(linePrice(usdInSomStore, 1, "UZS"), "$500");
});

test("cart totals are summed per currency, never converted", () => {
  const items = [
    { currency: "", price: 235, cur_price: 235, qty: 2 },
    { currency: "UZS", price: 5, cur_price: 60000, qty: 1 },
  ];
  assert.equal(groupTotal(items, "USD"), "$470  +  60 000 so'm");
  assert.equal(groupTotal([], "USD"), "$0");
});

test("weight units allow fractions; other units do not", () => {
  for (const name of ["kg", "Kilogramm", "gramm", "g"]) assert.equal(isWeightUnit(name), true, name);
  for (const name of ["dona", "Metr", "Komplet", ""]) assert.equal(isWeightUnit(name), false, name);
});

test("quantities show without trailing float noise", () => {
  assert.equal(fmtQty(2), "2");
  assert.equal(fmtQty(0.1 + 0.2), "0.3");
  assert.equal(fmtQty(1.2346), "1.235");
});
