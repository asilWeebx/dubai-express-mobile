"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";

import logo from "@/assets/logo.png";
import { useStore } from "@/lib/storefront/StoreProvider";

import { useShopUi } from "./ShopUiContext";

export function StoreFooter() {
  const store = useStore();
  const pathname = usePathname();
  const { openCart } = useShopUi();

  return (
    <footer className="site-footer-main">
      <div className="footer-inner">
        <div className="footer-brand">
          <Image src={logo} alt="Dubai Express Mobile" width={160} height={160} />
          <p>{store.name} onlayn katalogi. Mahsulot qoldig&apos;i va narxlar do&apos;kon tizimidan yuklanadi.</p>
        </div>
        <div className="footer-col">
          <h3>Katalog</h3>
          <Link
            href="/#katalog"
            className="footer-link"
            onClick={(event) => {
              // Already on the catalog: glide to it instead of jumping.
              const title = pathname === "/" ? document.getElementById("katalog") : null;
              if (!title) return;
              event.preventDefault();
              title.scrollIntoView({ behavior: "smooth", block: "start" });
            }}
          >
            Barcha mahsulotlar
          </Link>
          <button type="button" className="footer-link" onClick={openCart}>
            Savat
          </button>
        </div>
        <div className="footer-col">
          <h3>Hamkorlar</h3>
          <Link href="/account" className="footer-link">
            Shaxsiy narxlar
          </Link>
          <Link href="/account" className="footer-link">
            Mijoz hisobiga kirish
          </Link>
        </div>
      </div>
    </footer>
  );
}
