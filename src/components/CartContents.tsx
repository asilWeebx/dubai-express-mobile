"use client";

import { Fragment } from "react";

import { useCart } from "@/lib/cart/CartProvider";
import { fmtQty, groupTotal, linePrice } from "@/lib/storefront/currency";
import { useStore } from "@/lib/storefront/StoreProvider";

import { IBox, IX } from "./icons";
import { QuantityInput } from "./QuantityInput";
import { SafeImage } from "./SafeImage";

/**
 * Cart lines, then the total and the checkout button — shared by the slide-up
 * cart sheet and the `/cart` page.
 */
export function CartContents({ onCheckout }: { onCheckout: () => void }) {
  const { items, ready, setQty, remove } = useCart();
  const { currency: base } = useStore();

  return (
    <>
      <div className="cart-items-list">
        {!ready ? (
          <div className="skel" style={{ height: 160, margin: "8px 22px" }} />
        ) : items.length === 0 ? (
          <div className="cart-empty-new">
            <div className="cart-empty-icon">🛒</div>
            <div className="cart-empty-text">Savat bo&apos;sh</div>
            <div className="cart-empty-sub">Mahsulot qo&apos;shish uchun katalogga qayting</div>
          </div>
        ) : (
          items.map((it, idx) => (
            <Fragment key={it.key}>
              <div className="cart-item-new">
                <div className="cart-thumb-new">
                  {it.image ? (
                    <SafeImage src={it.image} alt={it.name} sizes="62px" fallback={<IBox s={28} />} />
                  ) : (
                    <IBox s={28} />
                  )}
                </div>
                <div className="cart-info-new">
                  <div className="cart-name-new clamp2">
                    {it.name}
                    {it.variant_name ? ` · ${it.variant_name}` : ""}
                  </div>
                  {it.imei && <div className="cart-item-imei">{it.imei}</div>}
                  {it.spec_label && <div className="cart-item-imei">{it.spec_label}</div>}
                  <div className="cart-price-new">
                    {linePrice(it, it.qty, base)}
                  </div>
                  <div className="cart-unit-new">
                    {linePrice(it, 1, base)} × {fmtQty(it.qty)} {it.unit_name}
                  </div>
                </div>
                {it.weight ? (
                  <div className="cart-qty-ctrl">
                    <QuantityInput
                      className="cart-qty-input"
                      value={it.qty}
                      max={it.maxQty}
                      allowDecimal
                      onCommit={(qty) => setQty(it.key, qty)}
                    />
                    <span className="cqu">{it.unit_name}</span>
                    <button
                      type="button"
                      className="cqb cqb-del"
                      aria-label={`${it.name} mahsulotini o‘chirish`}
                      onClick={() => remove(it.key)}
                    >
                      <IX s={12} />
                    </button>
                  </div>
                ) : (
                  <div className="cart-qty-ctrl">
                    <button
                      type="button"
                      className={`cqb${it.qty === 1 ? " cqb-del" : ""}`}
                      aria-label={it.qty === 1 ? "Mahsulotni o‘chirish" : "Miqdorni kamaytirish"}
                      onClick={() => (it.qty === 1 ? remove(it.key) : setQty(it.key, it.qty - 1))}
                    >
                      {it.qty === 1 ? <IX s={12} /> : "−"}
                    </button>
                    <QuantityInput
                      className="cqn"
                      value={it.qty}
                      max={it.maxQty}
                      onCommit={(qty) => setQty(it.key, qty)}
                    />
                    <button
                      type="button"
                      className="cqb"
                      aria-label="Miqdorni oshirish"
                      onClick={() => setQty(it.key, it.qty + 1)}
                    >
                      +
                    </button>
                  </div>
                )}
              </div>
              {idx < items.length - 1 && <div className="cart-divider" />}
            </Fragment>
          ))
        )}
      </div>

      <div className="cart-footer-new">
        <div className="cart-total-card">
          <span className="cart-total-lbl">Jami summa</span>
          <span className="cart-total-val">{groupTotal(items, base)}</span>
        </div>
        <button
          type="button"
          className="cart-checkout-btn"
          disabled={!ready || items.length === 0}
          onClick={onCheckout}
        >
          Buyurtma berish
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <line x1="5" y1="12" x2="19" y2="12" />
            <polyline points="12 5 19 12 12 19" />
          </svg>
        </button>
      </div>
    </>
  );
}
