"use client";

import { createContext, useContext } from "react";

import type { StoreSummary } from "./store";

const StoreContext = createContext<StoreSummary | null>(null);

export function StoreProvider({
  value,
  children,
}: {
  value: StoreSummary;
  children: React.ReactNode;
}) {
  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

/** Store name and base currency, needed wherever a price is rendered. */
export function useStore(): StoreSummary {
  const context = useContext(StoreContext);
  if (!context) throw new Error("useStore must be used inside a StoreProvider");
  return context;
}
