"use client";

import { useRouter } from "next/navigation";

import { useCart } from "@/lib/cart/CartProvider";
import { fmtQty } from "@/lib/storefront/currency";
import { useDialogA11y } from "@/lib/dialog";

import { CartContents } from "./CartContents";
import { IX } from "./icons";
import { useShopUi } from "./ShopUiContext";

/** The slide-up cart, opened from the header or the bottom navigation. */
export function CartSheet() {
  const router = useRouter();
  const { cartOpen: open, closeCart: onClose } = useShopUi();
  const { count } = useCart();
  const dialogRef = useDialogA11y(open, onClose);

  if (!open) return null;

  return (
    <div className="overlay-bg fade-in">
      <div className="overlay-dim" aria-hidden="true" onClick={onClose} />
      <div
        ref={dialogRef}
        className="cart-sheet-new slide-up"
        role="dialog"
        aria-modal="true"
        aria-labelledby="cart-title"
        tabIndex={-1}
      >
        <div className="cart-handle" />
        <div className="cart-head-new">
          <div style={{ display: "flex", alignItems: "center" }}>
            <span className="cart-title-new" id="cart-title">
              Savatcha
            </span>
            {count > 0 && <span className="cart-count-chip">{fmtQty(count)} ta</span>}
          </div>
          <button type="button" className="close-btn" aria-label="Savatchani yopish" onClick={onClose}>
            <IX />
          </button>
        </div>

        <CartContents
          onCheckout={() => {
            onClose();
            router.push("/checkout");
          }}
        />
      </div>
    </div>
  );
}
