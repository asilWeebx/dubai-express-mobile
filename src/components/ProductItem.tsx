"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";

import { animateToCart } from "@/lib/cart/animate-cart";
import { useCart } from "@/lib/cart/CartProvider";
import { unitKey } from "@/lib/cart/lines";
import { fmtQty, isWeightUnit, money } from "@/lib/storefront/currency";
import { firstAvailableUnit, getPhone, hasVariants, unitMaxQty } from "@/lib/storefront/product-view";
import { useStore } from "@/lib/storefront/StoreProvider";
import type { Product } from "@/lib/storefront/types";

import { ICaret } from "./icons";
import { QuantityInput } from "./QuantityInput";
import { isRenderableImageUrl, NoImage, SafeImage } from "./SafeImage";

/** Grid columns: 4 → 3 (≤1200px) → 2 (≤860px), see `.product-grid`. */
const CARD_SIZES = "(max-width: 860px) 45vw, (max-width: 1200px) 30vw, 290px";

/** At or below this the stock count turns amber. */
const LOW_STOCK = 2;

export function ProductItem({
  p,
  showImages,
  eager = false,
}: {
  p: Product;
  showImages: boolean;
  /** First cards on screen: load the photo at once, it is the largest paint. */
  eager?: boolean;
}) {
  const router = useRouter();
  const { currency: base } = useStore();
  const { items: cart, addUnit, setQty } = useCart();
  const variants = hasVariants(p);

  const [unitId, setUnitId] = useState(firstAvailableUnit(p)?.unit_id ?? null);
  const [added, setAdded] = useState(false);
  const addBtnRef = useRef<HTMLButtonElement>(null);

  const href = `/product/${p.id}`;
  const openDetail = () => router.push(href);

  const unit = !variants ? p.units?.find((u) => u.unit_id === unitId) || p.units?.[0] : null;
  const isWeight = isWeightUnit(unit?.unit_name);
  const maxQty = variants ? (p.in_stock ? 1 : 0) : unitMaxQty(p, unit);
  const cartKey = unitKey(p.id, unit);
  const inCart = !variants ? cart.find((x) => x.key === cartKey)?.qty || 0 : 0;
  const out = variants ? !p.in_stock : maxQty <= 0;

  // Each price in its own currency; an empty one is the store's (dollars here).
  const first = variants ? p.variants[0] : unit;
  const dispCur = first?.currency ?? "";
  const dispVal = first?.cur_price ?? first?.price ?? 0;
  const dispOrigVal = first?.cur_original_price ?? null;

  // A phone card is the MODEL, priced from its cheapest copy. It never goes
  // straight into the cart — the configuration or copy is picked first.
  const phone = getPhone(p);

  const handleAdd = (event: React.MouseEvent) => {
    event.stopPropagation();
    if (phone) {
      openDetail();
      return;
    }
    if (out || added || variants) return;
    addUnit(p, unit);
    animateToCart(addBtnRef.current);
    setAdded(true);
    setTimeout(() => setAdded(false), 1200);
  };

  const placeholder = <NoImage size={48} label="Rasm tayyorlanmoqda" />;

  return (
    <article className="product-item fade-up">
      <Link className="product-card-link" href={href} aria-label={p.name}>
        <div className="product-img-wrap">
          {showImages && isRenderableImageUrl(p.image) ? (
            <span className="img-frame">
              <SafeImage src={p.image} alt={p.name} sizes={CARD_SIZES} eager={eager} fallback={placeholder} />
            </span>
          ) : (
            placeholder
          )}
          {out && (
            <div className="stock-out-overlay">
              <span className="stock-out-tag">Tugadi</span>
            </div>
          )}
          {inCart > 0 && <div className="in-cart-dot">{fmtQty(inCart)}</div>}
        </div>

        <div className="product-name clamp2">{p.name}</div>

        {phone && !out && (
          <div className={`product-meta ${p.stock <= LOW_STOCK ? "stock-low" : "stock-ok"}`}>
            {fmtQty(p.stock)} ta mavjud
          </div>
        )}
        {!phone && !variants && p.stock_type === "tracked" && !out && (
          <div className={`product-meta ${maxQty <= LOW_STOCK ? "stock-low" : "stock-ok"}`}>
            {fmtQty(maxQty)} {unit?.unit_name || "dona"} mavjud
          </div>
        )}
        {out && <div className="product-meta stock-out">Sotib bo&apos;lindi</div>}
        {variants && !out && (
          <div className="product-meta stock-ok">{p.variants.filter((v) => v.in_stock).length} variant mavjud</div>
        )}

        <div className="product-price">
          {!phone && dispOrigVal != null && (
            <span className="price-orig-strike">
              {variants ? "dan " : ""}
              {money(dispOrigVal, dispCur, base)}
            </span>
          )}
          {phone
            ? `${money(phone.from_cur_price ?? phone.from_price, phone.currency, base)} dan`
            : `${variants ? "dan " : ""}${money(dispVal, dispCur, base)}`}
          {p.discount_percent > 0 && <span className="disc-badge">−{Math.round(p.discount_percent)}%</span>}
        </div>
      </Link>

      {!phone && !variants && p.units?.length > 1 && (
        <div className="unit-row">
          <span className="unit-label">Birlik:</span>
          <div className="unit-select-wrap">
            <select
              className="unit-select"
              aria-label="Birlik"
              value={unitId ?? ""}
              onChange={(event) => setUnitId(Number(event.target.value))}
            >
              {p.units.map((u) => (
                <option key={u.unit_id ?? u.unit_name} value={u.unit_id ?? ""}>
                  {u.unit_name}
                </option>
              ))}
            </select>
            <span className="unit-caret">
              <ICaret s={11} />
            </span>
          </div>
        </div>
      )}

      <div className="controls-row">
        {variants ? (
          <button type="button" className="add-btn" style={{ flex: 1 }} onClick={openDetail} disabled={out}>
            {out ? "Tugadi" : "Tanlang"}
          </button>
        ) : inCart > 0 ? (
          // Already in the cart: a +/− stepper that edits the cart quantity.
          <div className="qty-wrap">
            <button
              type="button"
              className="qty-btn"
              aria-label="Miqdorni kamaytirish"
              onClick={() => setQty(cartKey, inCart - 1)}
            >
              −
            </button>
            <QuantityInput
              className="qty-num"
              value={inCart}
              max={maxQty}
              allowDecimal={isWeight}
              onCommit={(qty) => setQty(cartKey, qty)}
            />
            <button
              type="button"
              className="qty-btn"
              aria-label="Miqdorni oshirish"
              onClick={(event) => {
                if (maxQty === Infinity || inCart < maxQty) {
                  addUnit(p, unit);
                  animateToCart(event.currentTarget);
                }
              }}
            >
              +
            </button>
          </div>
        ) : (
          <button
            type="button"
            ref={addBtnRef}
            className={`add-btn${out ? " btn-tugadi" : added ? " btn-added" : ""}`}
            style={{ flex: 1 }}
            onClick={handleAdd}
            disabled={out}
          >
            {out ? "Tugadi" : added ? "✓" : "Savatga"}
          </button>
        )}
      </div>
    </article>
  );
}
