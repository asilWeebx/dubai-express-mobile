import assert from "node:assert/strict";
import test from "node:test";

import { isGroupedPhone, phoneChoices } from "../src/lib/storefront/product-view.ts";

import { bucket, group, phoneInfo } from "./fixtures.ts";

test("a phone reads whichever list holds copies when its mode points at an empty one", () => {
  assert.equal(isGroupedPhone(phoneInfo({ mode: "individual", buckets: [bucket()] })), true);
  assert.equal(isGroupedPhone(phoneInfo({ mode: "grouped", groups: [group()] })), false);
  assert.equal(isGroupedPhone(phoneInfo({ mode: "unknown", buckets: [bucket()] })), true);
  // With both lists filled, `mode` decides.
  assert.equal(isGroupedPhone(phoneInfo({ mode: "grouped", groups: [group()], buckets: [bucket()] })), true);
  assert.equal(isGroupedPhone(phoneInfo({ mode: "individual", groups: [group()], buckets: [bucket()] })), false);
});

test("a blank storage is a choice of its own, so its copies stay reachable", () => {
  const known = group({ key: "a", storage: "128 GB" });
  const blank = group({ key: "b", storage: "", color: "blue" });

  const fromKnown = phoneChoices([known, blank], known);
  assert.deepEqual(fromKnown.storages, ["128 GB", ""]);
  assert.deepEqual(fromKnown.colors.map((g) => g.key), ["a"]);
  assert.deepEqual(phoneChoices([known, blank], blank).colors.map((g) => g.key), ["b"]);
});

test("regions follow the chosen colour, a blank colour included", () => {
  const us = group({ key: "us", color: "red", region: "US" });
  const eu = group({ key: "eu", color: "red", region: "EU" });
  const plain = group({ key: "plain", color: "", region: "" });
  assert.deepEqual(phoneChoices([us, eu, plain], us).regions.map((g) => g.key), ["us", "eu"]);
  assert.deepEqual(phoneChoices([us, eu, plain], plain).regions.map((g) => g.key), ["plain"]);
});
