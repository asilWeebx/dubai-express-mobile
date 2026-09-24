"use client";

import { useCallback, useMemo, useSyncExternalStore } from "react";

import { createPersistentStore } from "@/lib/persistent-store";
import type {
  PhoneBucket,
  PhoneSerialUnit,
  Product,
  ProductUnit,
  ProductVariant,
} from "@/lib/storefront/types";

import {
  addBucketLine,
  addSerialLine,
  addUnitLine,
  addVariantLine,
  removeLine,
  revalidateCart,
  sanitizeStoredCart,
  setLineQty,
} from "./lines";
import type { CartItem } from "./types";

/** The single-page store kept the cart in memory only; now it survives a reload. */
const store = createPersistentStore<CartItem[]>("sf_cart_v1", [], sanitizeStoredCart);

export function CartProvider({ children }: { children: React.ReactNode }) {
  // Kept as a component so the tree has an obvious mount point, even though
  // the store itself is module-level and needs no context.
  return <>{children}</>;
}

export function useCart() {
  const { value: items, ready } = useSyncExternalStore(
    store.subscribe,
    store.getSnapshot,
    store.getServerSnapshot,
  );

  const addUnit = useCallback(
    (product: Product, unit: ProductUnit | null | undefined, qty = 1) =>
      store.set((current) => addUnitLine(current, product, unit, qty)),
    [],
  );
  const addVariant = useCallback(
    (product: Product, variant: ProductVariant, qty: number) =>
      store.set((current) => addVariantLine(current, product, variant, qty)),
    [],
  );
  const addSerial = useCallback(
    (product: Product, unit: PhoneSerialUnit) =>
      store.set((current) => addSerialLine(current, product, unit)),
    [],
  );
  const addBucket = useCallback(
    (product: Product, bucket: PhoneBucket, qty: number) =>
      store.set((current) => addBucketLine(current, product, bucket, qty)),
    [],
  );
  const setQty = useCallback(
    (key: string, qty: number) => store.set((current) => setLineQty(current, key, qty)),
    [],
  );
  const remove = useCallback(
    (key: string) => store.set((current) => removeLine(current, key)),
    [],
  );
  const clear = useCallback(() => store.set(() => []), []);

  /** Refreshes saved lines against the catalog after login or an ERP update. */
  const syncProducts = useCallback(
    (products: Product[]) => store.set((current) => revalidateCart(current, products)),
    [],
  );

  const count = useMemo(() => items.reduce((sum, item) => sum + item.qty, 0), [items]);

  return {
    items,
    count,
    ready,
    addUnit,
    addVariant,
    addSerial,
    addBucket,
    setQty,
    remove,
    clear,
    syncProducts,
  };
}
