"use client";

import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { useCart } from "@/lib/cart/CartProvider";
import type { Category, Product } from "@/lib/storefront/types";

import { BottomNav } from "./BottomNav";
import { CartSheet } from "./CartSheet";
import { CategoryDrawer } from "./CategoryDrawer";
import { Header } from "./Header";
import { ShopUiContext, type NavId, type ShopUiValue } from "./ShopUiContext";
import { StoreFooter } from "./StoreFooter";

export function StorefrontShell({
  products,
  categories,
  categoryImages,
  children,
}: {
  products: Product[];
  categories: Category[];
  categoryImages: Record<number, string>;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { syncProducts } = useCart();

  const [cartOpen, setCartOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [search, setSearchState] = useState("");
  const [selTop, setSelTop] = useState<number | null>(null);
  const [selSub, setSelSub] = useState<number | null>(null);
  const [navActive, setNavActive] = useState<NavId>("home");
  const [homeResetKey, setHomeResetKey] = useState(0);

  // Pages seen in this visit, to tell "back" from "leave the site".
  const visited = useRef(0);
  const headingHome = useRef(false);
  const navTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  // Saved cart lines are re-priced and re-capped whenever the catalog changes
  // (first load, sign-in, or a fresh ERP catalog).
  useEffect(() => {
    syncProducts(products);
  }, [products, syncProducts]);

  useEffect(() => {
    visited.current += 1;
    headingHome.current = false;
  }, [pathname]);

  useEffect(() => () => clearTimeout(navTimer.current), []);

  const showHome = useCallback(() => {
    if (pathname === "/" || headingHome.current) return;
    headingHome.current = true;
    router.push("/");
  }, [pathname, router]);

  const value = useMemo<ShopUiValue>(
    () => ({
      cartOpen,
      openCart: () => {
        setCartOpen(true);
        setNavActive("cart");
        clearTimeout(navTimer.current);
        navTimer.current = setTimeout(() => setNavActive("home"), 300);
      },
      closeCart: () => setCartOpen(false),

      drawerOpen,
      toggleDrawer: () => {
        setDrawerOpen((open) => !open);
        setNavActive("catalog");
      },
      closeDrawer: () => setDrawerOpen(false),

      searchOpen,
      toggleSearch: () => {
        setSearchOpen((open) => !open);
        setNavActive("search");
      },
      openSearch: () => setSearchOpen(true),
      closeSearch: () => {
        setSearchOpen(false);
        setSearchState("");
      },

      search,
      setSearch: (query) => {
        setSearchState(query);
        if (!query) return;
        // Search spans the whole catalog. A category picked earlier, perhaps
        // on another page, would otherwise hide every match outside it.
        setSelTop(null);
        setSelSub(null);
        showHome();
      },

      selTop,
      selSub,
      selectCategory: (top, sub) => {
        setSelTop(top);
        setSelSub(sub);
        setNavActive("home");
        showHome();
      },
      setSelSub,

      navActive,
      goHome: () => {
        setSelTop(null);
        setSelSub(null);
        setSearchState("");
        setSearchOpen(false);
        setNavActive("home");
        setHomeResetKey((key) => key + 1);
        if (pathname === "/") window.scrollTo({ top: 0, behavior: "smooth" });
        else showHome();
      },
      homeResetKey,
      goBack: () => {
        if (visited.current > 1) router.back();
        else router.push("/");
      },
    }),
    [cartOpen, drawerOpen, searchOpen, search, selTop, selSub, navActive, homeResetKey, pathname, router, showHome],
  );

  // Product pages end on their similar-products rail instead of the footer.
  const showFooter = !pathname.startsWith("/product/");

  return (
    <ShopUiContext.Provider value={value}>
      <Header />
      {children}
      {showFooter && <StoreFooter />}
      <CartSheet />
      <CategoryDrawer categories={categories} categoryImages={categoryImages} />
      <BottomNav />
    </ShopUiContext.Provider>
  );
}
