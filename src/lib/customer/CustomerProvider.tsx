"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useSyncExternalStore } from "react";

import { createPersistentStore } from "@/lib/persistent-store";
import type { Customer } from "@/lib/storefront/types";

/**
 * Customers identify themselves with a code printed in the physical store;
 * there are no passwords, so the record is simply kept in localStorage — under
 * the same key the single-page storefront used, so sign-ins carry over.
 */
const store = createPersistentStore<Customer | null>("sf_cust", null, (saved) =>
  saved && typeof saved === "object" && typeof (saved as Customer).customer_code === "string"
    ? (saved as Customer)
    : null,
);

export function CustomerProvider({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

export function useCustomer() {
  const router = useRouter();
  const { value: customer, ready } = useSyncExternalStore(
    store.subscribe,
    store.getSnapshot,
    store.getServerSnapshot,
  );
  const syncedCode = useRef<string | null>(null);

  // Migrates customers saved by older builds from localStorage into the
  // server-readable session used for personalized catalog requests.
  useEffect(() => {
    if (!ready || !customer || syncedCode.current === customer.customer_code) return;
    syncedCode.current = customer.customer_code;
    void fetch("/api/session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: customer.customer_code }),
    })
      .then(async (response) => {
        if (!response.ok) throw new Error("Customer session sync failed");
        return response.json();
      })
      .then((data: { changed?: boolean }) => {
        if (data.changed) router.refresh();
      })
      .catch(() => {
        syncedCode.current = null;
      });
  }, [customer, ready, router]);

  const signIn = useCallback(
    (next: Customer) => {
      store.set(() => next);
      router.refresh();
    },
    [router],
  );
  const signOut = useCallback(() => {
    store.set(() => null);
    void fetch("/api/logout", { method: "POST" }).finally(() => router.refresh());
  }, [router]);

  return { customer, ready, signIn, signOut };
}
