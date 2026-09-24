"use client";

import { createContext, useContext } from "react";

export type NavId = "home" | "search" | "cart" | "catalog";

/**
 * State shared by the header, bottom navigation, category drawer and the home
 * catalog. It lives in the layout, so it survives moving between pages — a
 * filter picked in the drawer on a product page is waiting on the home page.
 */
export interface ShopUiValue {
  cartOpen: boolean;
  openCart: () => void;
  closeCart: () => void;

  drawerOpen: boolean;
  toggleDrawer: () => void;
  closeDrawer: () => void;

  /** The full-width search row in the header (mobile, or opened from the nav). */
  searchOpen: boolean;
  toggleSearch: () => void;
  openSearch: () => void;
  closeSearch: () => void;

  /** Filters the home catalog by name. Typing elsewhere goes to the home page. */
  search: string;
  setSearch: (query: string) => void;

  selTop: number | null;
  selSub: number | null;
  /** Picks a category (and optionally a subcategory) and shows the home catalog. */
  selectCategory: (top: number | null, sub: number | null) => void;
  setSelSub: (sub: number | null) => void;

  navActive: NavId;
  /** Clears filters and search and scrolls the home page back to the top. */
  goHome: () => void;
  /** Increments on every `goHome`, so the home catalog can reset its own state. */
  homeResetKey: number;
  /** Back within the site when there is history, otherwise to the home page. */
  goBack: () => void;
}

export const ShopUiContext = createContext<ShopUiValue | null>(null);

export function useShopUi() {
  const value = useContext(ShopUiContext);
  if (!value) throw new Error("useShopUi must be used inside StorefrontShell");
  return value;
}
