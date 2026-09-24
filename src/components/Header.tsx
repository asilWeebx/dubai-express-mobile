"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef } from "react";

import logo from "@/assets/logo.png";
import { useCart } from "@/lib/cart/CartProvider";
import { useCustomer } from "@/lib/customer/CustomerProvider";
import { fmtQty } from "@/lib/storefront/currency";
import { useStore } from "@/lib/storefront/StoreProvider";

import { ICart, ISearch } from "./icons";
import { useShopUi } from "./ShopUiContext";

/**
 * Logo, product search and the cart and account buttons. On phones the search
 * field collapses into a button that swaps the whole row for a search field.
 */
export function Header() {
  const store = useStore();
  const { count, ready } = useCart();
  const { customer } = useCustomer();
  const { search, setSearch, searchOpen, openSearch, closeSearch, openCart, goHome } = useShopUi();
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (searchOpen) searchRef.current?.focus();
  }, [searchOpen]);

  const initial = (customer?.name || customer?.customer_name || "?").charAt(0).toUpperCase();

  return (
    <header className="site-header">
      <div className="header-inner">
        {searchOpen ? (
          <>
            <div className="header-search fade-in" style={{ maxWidth: "none", flex: 1 }}>
              <ISearch s={16} />
              <input
                ref={searchRef}
                aria-label="Mahsulot qidirish"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Mahsulot qidirish..."
                style={{ flex: 1, border: "none", background: "transparent", fontSize: 14, color: "#111" }}
              />
            </div>
            <button type="button" className="login-btn" onClick={closeSearch}>
              Bekor
            </button>
          </>
        ) : (
          <>
            <Link
              href="/"
              className="header-logo"
              title={store.name}
              onClick={(event) => {
                event.preventDefault();
                goHome();
              }}
            >
              <Image src={logo} alt="Dubai Express" width={38} height={38} priority />
              <span className="brand-txt">
                Dubai <span>Express</span> Mobile
              </span>
            </Link>

            <div className="header-search">
              <ISearch s={16} />
              <input
                aria-label="Mahsulot qidirish"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Mahsulot qidirish..."
              />
            </div>

            <div className="header-actions">
              <button
                type="button"
                className="icon-btn mobile-search-trigger"
                onClick={openSearch}
                title="Qidirish"
                aria-label="Qidirish"
              >
                <ISearch s={18} />
              </button>
              <button
                type="button"
                className="icon-btn"
                onClick={openCart}
                title="Savat"
                aria-label={`Savat, ${ready ? fmtQty(count) : 0} ta mahsulot`}
              >
                <ICart s={18} />
                {/* Rendered only after localStorage is read, so SSR markup matches. */}
                {ready && count > 0 && <span className="badge">{count > 9 ? "9+" : fmtQty(count)}</span>}
              </button>
              {customer ? (
                <Link href="/account" className="avatar-btn" aria-label="Mening hisobim">
                  {initial}
                </Link>
              ) : (
                <Link href="/account" className="login-btn">
                  Hamkorlar uchun
                </Link>
              )}
            </div>
          </>
        )}
      </div>
    </header>
  );
}
