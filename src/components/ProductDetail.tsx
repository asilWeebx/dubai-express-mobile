"use client";

import { useRef, useState } from "react";

import { animateToCart } from "@/lib/cart/animate-cart";
import { useCart } from "@/lib/cart/CartProvider";
import { unitKey, variantKey } from "@/lib/cart/lines";
import { fmtQty, isWeightUnit, money } from "@/lib/storefront/currency";
import {
  firstAvailableUnit,
  getPhone,
  hasVariants,
  isGroupedPhone,
  phoneChoices,
  unitMaxQty,
} from "@/lib/storefront/product-view";
import { useStore } from "@/lib/storefront/StoreProvider";
import type { PhoneGroup, Product } from "@/lib/storefront/types";

import { ProductItem } from "./ProductItem";
import { QuantityInput } from "./QuantityInput";
import { isRenderableImageUrl, NoImage, SafeImage } from "./SafeImage";
import { useShopUi } from "./ShopUiContext";

const CART_ICON =
  "M15.55 13c.75 0 1.41-.41 1.75-1.03l3.58-6.49c.37-.66-.11-1.48-.87-1.48H5.21l-.94-2H1v2h2l3.6 7.59-1.35 2.44C5.18 13.55 5 13.76 5 14c0 1.1.9 2 2 2h12v-2H7.42c-.14 0-.25-.11-.25-.25l.03-.12.9-1.63h7.45zM7 18c-1.1 0-1.99.9-1.99 2S5.9 22 7 22s2-.9 2-2-.9-2-2-2zm10 0c-1.1 0-1.99.9-1.99 2s.89 2 1.99 2 2-.9 2-2-.9-2-2-2z";

/**
 * The product page's interactive part. Rendered with `key={product.id}`, so
 * moving to another product starts from fresh selections.
 */
export function ProductDetail({
  product: p,
  similar,
  showImages,
}: {
  product: Product;
  similar: Product[];
  showImages: boolean;
}) {
  const { goBack } = useShopUi();
  const { name: storeName, currency: base } = useStore();
  const { items: cart, addUnit, addVariant, addSerial, addBucket } = useCart();
  const variants = hasVariants(p);

  // ── Phone (IMEI) ─────────────────────────────────────────────────────
  // The card is the MODEL; copies are grouped by colour + storage + region.
  // "grouped": spec + price buckets, the customer picks how many;
  // "individual": every IMEI listed (groups + units).
  const phone = getPhone(p);
  const isGrouped = Boolean(phone && isGroupedPhone(phone));
  const phGroups: PhoneGroup[] = phone && !isGrouped ? phone.groups || [] : [];
  const phBuckets = phone && isGrouped ? phone.buckets || [] : [];
  const [phKey, setPhKey] = useState(phGroups[0]?.key ?? null);
  const [phBKey, setPhBKey] = useState(phBuckets[0]?.key ?? null);
  const phSel = phone && !isGrouped ? phGroups.find((g) => g.key === phKey) || phGroups[0] : null;
  const phBSel = phBuckets.find((b) => b.key === phBKey) || phBuckets[0] || null;
  const { storages: phStorages, colors: phColors, regions: phRegions } = phoneChoices(phGroups, phSel);
  /** Moves to the closest configuration that has the requested option. */
  const pickPhone = (patch: Partial<Pick<PhoneGroup, "storage" | "color" | "region">>) => {
    const want = { storage: phSel?.storage, color: phSel?.color, region: phSel?.region, ...patch };
    const g =
      phGroups.find((x) => x.storage === want.storage && x.color === want.color && x.region === want.region) ||
      phGroups.find((x) => x.storage === want.storage && x.color === want.color) ||
      phGroups.find((x) => x.storage === want.storage);
    if (g) setPhKey(g.key);
  };

  const [variantId, setVariantId] = useState(
    variants ? (p.variants.find((v) => v.in_stock) || p.variants[0])?.id ?? null : null,
  );
  const [unitId, setUnitId] = useState(firstAvailableUnit(p)?.unit_id ?? null);
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);
  const addRef = useRef<HTMLButtonElement>(null);

  const selVariant = variants ? p.variants.find((v) => v.id === variantId) || p.variants[0] : null;
  const unit = !variants ? p.units?.find((u) => u.unit_id === unitId) || p.units?.[0] : null;

  // Each price in its own currency; an empty one is the store's (dollars here).
  const selected = variants ? selVariant : unit;
  const dispCur = selected?.currency ?? "";
  const dispVal = selected?.cur_price ?? selected?.price ?? 0;
  const dispOrigVal = selected?.cur_original_price ?? null;

  const isWeight = !variants && isWeightUnit(unit?.unit_name);
  const maxQty = variants
    ? selVariant?.in_stock
      ? selVariant.stock != null
        ? Math.floor(selVariant.stock)
        : Infinity
      : 0
    : unitMaxQty(p, unit);
  const cartKey = variants ? variantKey(p.id, selVariant) : unitKey(p.id, unit);
  const inCart = cart.find((x) => x.key === cartKey)?.qty || 0;
  const out = maxQty <= 0;
  const availableToAdd = maxQty === Infinity ? Infinity : Math.max(0, maxQty - inCart);
  const atCartLimit = availableToAdd <= 0;

  const handleAdd = () => {
    if (out || atCartLimit || added) return;
    const requested = isWeight ? Math.max(0.001, +qty || 0) : Math.max(1, Math.floor(+qty || 1));
    const q = availableToAdd === Infinity ? requested : Math.min(requested, availableToAdd);
    if (!q) return;
    if (variants && selVariant) addVariant(p, selVariant, q);
    else addUnit(p, unit, q);
    animateToCart(addRef.current);
    setAdded(true);
    setTimeout(() => setAdded(false), 1400);
  };

  const shareProduct = async () => {
    const url = window.location.href;
    try {
      if (navigator.share) await navigator.share({ title: p.name, text: `${p.name} — ${storeName}`, url });
      else await navigator.clipboard?.writeText(url);
    } catch {
      // The customer closed the share sheet; nothing to do.
    }
  };

  const placeholder = <NoImage size={100} label="Mahsulot rasmi tayyorlanmoqda" />;

  return (
    <div className="detail-page">
      <div className="detail-topbar">
        <button type="button" className="detail-back" onClick={goBack}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <polyline points="15 18 9 12 15 6" />
          </svg>
          Boshqa mahsulotlar
        </button>
        <div className="detail-topbar-actions">
          <button
            type="button"
            className="detail-close-btn"
            onClick={shareProduct}
            title="Mahsulot havolasini ulashish"
            aria-label="Mahsulot havolasini ulashish"
          >
            ↗
          </button>
        </div>
      </div>

      <div className="detail-body">
        <div className="detail-img-side">
          {showImages && isRenderableImageUrl(p.image) ? (
            <span className="img-frame">
              <SafeImage
                src={p.image}
                alt={p.name}
                sizes="(max-width: 640px) 80vw, 420px"
                eager
                fallback={placeholder}
              />
            </span>
          ) : (
            placeholder
          )}
        </div>

        <div className="detail-info-side">
          {p.category_name && <div className="detail-cat">{p.category_name}</div>}
          <h1 className="detail-name">{p.name}</h1>
          <div className="detail-price">
            {phone ? (
              <>
                {money(phone.from_cur_price ?? phone.from_price ?? 0, phone.currency, base)}
                {(phGroups.length > 1 || phBuckets.length > 1 || (phSel?.count ?? 0) > 1) && (
                  <span className="ph-from">dan</span>
                )}
              </>
            ) : (
              <>
                {dispOrigVal != null && dispOrigVal !== 0 && (
                  <span className="price-orig-strike">{money(dispOrigVal, dispCur, base)}</span>
                )}
                {money(dispVal, dispCur, base)}
              </>
            )}
            {p.discount_percent > 0 && <span className="disc-badge">−{Math.round(p.discount_percent)}%</span>}
          </div>

          {variants && (
            <>
              <div className="detail-unit-label">Variant tanlang</div>
              <div className="detail-unit-select">
                {p.variants.map((v) => (
                  <button
                    key={v.id}
                    className={`detail-unit-chip variant-chip${variantId === v.id ? " active" : ""}${v.in_stock ? "" : " unavailable"}`}
                    type="button"
                    aria-pressed={variantId === v.id}
                    disabled={!v.in_stock}
                    onClick={() => {
                      if (v.in_stock) {
                        setVariantId(v.id);
                        setQty(1);
                      }
                    }}
                  >
                    <span className="vc-name">{v.name}</span>
                    {(v.cur_original_price ?? v.original_price) != null && (
                      <span className="vc-orig">{money(v.cur_original_price ?? v.original_price, v.currency, base)}</span>
                    )}
                    <span className="vc-price">{money(v.cur_price ?? v.price, v.currency, base)}</span>
                    {v.stock != null && <span className="vc-stock">{Math.floor(v.stock)} ta</span>}
                    {!v.in_stock && <span className="vc-out">Tugadi</span>}
                  </button>
                ))}
              </div>
            </>
          )}

          {!variants && p.units?.length > 1 && (
            <>
              <div className="detail-unit-label">Birlik tanlang</div>
              <div className="detail-unit-select">
                {p.units.map((u) => (
                  <button
                    key={u.unit_id ?? u.unit_name}
                    className={`detail-unit-chip${unitId === u.unit_id ? " active" : ""}`}
                    type="button"
                    aria-pressed={unitId === u.unit_id}
                    onClick={() => {
                      setUnitId(u.unit_id);
                      setQty(1);
                    }}
                  >
                    {u.unit_name}
                  </button>
                ))}
              </div>
            </>
          )}

          {/* ── Phone, one by one: configuration, then the copy ── */}
          {phone && !isGrouped && (
            <>
              {phStorages.length > 1 && (
                <>
                  <div className="detail-unit-label">Xotira</div>
                  <div className="detail-unit-select">
                    {phStorages.map((st) => (
                      <button
                        key={st || "—"}
                        type="button"
                        className={`detail-unit-chip${phSel?.storage === st ? " active" : ""}`}
                        aria-pressed={phSel?.storage === st}
                        onClick={() => pickPhone({ storage: st })}
                      >
                        {st || "—"}
                      </button>
                    ))}
                  </div>
                </>
              )}

              {phColors.length > 1 && (
                <>
                  <div className="detail-unit-label">Rang</div>
                  <div className="detail-unit-select">
                    {phColors.map((g) => (
                      <button
                        key={g.key}
                        type="button"
                        className={`detail-unit-chip ph-color${phSel?.color === g.color ? " active" : ""}`}
                        aria-pressed={phSel?.color === g.color}
                        onClick={() => pickPhone({ storage: g.storage, color: g.color })}
                      >
                        {g.color_hex && <i className="ph-dot" style={{ background: g.color_hex }} />}
                        {g.color_label || "Rang"}
                      </button>
                    ))}
                  </div>
                </>
              )}

              {phRegions.length > 1 && (
                <>
                  <div className="detail-unit-label">Region</div>
                  <div className="detail-unit-select">
                    {phRegions.map((g) => (
                      <button
                        key={g.key}
                        type="button"
                        className={`detail-unit-chip${phSel?.region === g.region ? " active" : ""}`}
                        aria-pressed={phSel?.region === g.region}
                        onClick={() => pickPhone({ storage: g.storage, color: g.color, region: g.region })}
                      >
                        {g.region || "—"}
                      </button>
                    ))}
                  </div>
                </>
              )}

              {/* The photo is shared by the model, so the actual colour is spelled out. */}
              {phSel?.color_label && (
                <div className="ph-real-color">
                  {phSel.color_hex && <i className="ph-dot lg" style={{ background: phSel.color_hex }} />}
                  Haqiqiy rangi: <b>{phSel.color_label}</b>
                  <span className="ph-note">rasm namunaviy</span>
                </div>
              )}

              {phSel && phSel.uniform ? (
                <>
                  <div className="detail-stock ok">✓ Mavjud: {phSel.count} ta</div>
                  <div className="ph-unit-meta">
                    {phSel.units[0].condition_label}
                    {phSel.units[0].battery_health != null && ` · 🔋 ${phSel.units[0].battery_health}%`}
                    {phSel.units[0].battery_cycles != null && ` · ${phSel.units[0].battery_cycles} sikl`}
                  </div>
                  <div className="detail-controls">
                    <button
                      type="button"
                      className="detail-add-btn"
                      onClick={(event) => {
                        addSerial(p, phSel.units[0]);
                        animateToCart(event.currentTarget);
                      }}
                    >
                      Savatga qo&apos;shish
                    </button>
                  </div>
                </>
              ) : (
                phSel && (
                  <>
                    <div className="detail-unit-label">Mavjud nusxalar ({phSel.count} ta)</div>
                    <div className="ph-units">
                      {phSel.units.map((u) => (
                        <div key={u.id} className="ph-unit">
                          <div className="ph-unit-l">
                            <div className="ph-unit-top">
                              <span className={`ph-cond${u.condition === "new" ? " new" : ""}`}>{u.condition_label}</span>
                              {u.battery_health != null && <span className="ph-bat">🔋 {u.battery_health}%</span>}
                              {u.battery_cycles != null && <span className="ph-cyc">{u.battery_cycles} sikl</span>}
                            </div>
                            <div className="ph-imei">{u.imei_masked}</div>
                            {u.note && <div className="ph-note2">{u.note}</div>}
                          </div>
                          <div className="ph-unit-r">
                            <div className="ph-price">{money(u.cur_price ?? u.price, u.currency, base)}</div>
                            <button
                              type="button"
                              className="ph-pick"
                              onClick={(event) => {
                                addSerial(p, u);
                                animateToCart(event.currentTarget);
                              }}
                            >
                              Tanlash
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                )
              )}
            </>
          )}

          {/* ── Phone, by count: spec + price bucket, then how many ── */}
          {phone && isGrouped && (
            <>
              <div className="detail-unit-label">Variant / narx</div>
              <div className="ph-buckets">
                {phBuckets.map((b) => (
                  <button
                    key={b.key}
                    type="button"
                    className={`ph-bucket${phBSel?.key === b.key ? " active" : ""}`}
                    aria-pressed={phBSel?.key === b.key}
                    onClick={() => {
                      setPhBKey(b.key);
                      setQty(1);
                    }}
                  >
                    <div className="ph-bucket-l">
                      <div className="ph-bucket-spec">
                        {b.storage && <span className="ph-bspec">{b.storage}</span>}
                        {b.color_label && (
                          <span className="ph-bspec">
                            {b.color_hex && <i className="ph-dot" style={{ background: b.color_hex }} />}
                            {b.color_label}
                          </span>
                        )}
                        {b.region && <span className="ph-bspec">{b.region}</span>}
                      </div>
                      <div className="ph-bucket-cnt">{b.count} dona mavjud</div>
                    </div>
                    <div className="ph-bucket-price">{money(b.cur_price ?? b.price, b.currency, base)}</div>
                  </button>
                ))}
              </div>
              {phBSel && (
                <div className="detail-controls">
                  <div className="detail-qty-wrap">
                    <button
                      type="button"
                      className="detail-qty-btn"
                      aria-label="Miqdorni kamaytirish"
                      onClick={() => setQty((q) => Math.max(1, q - 1))}
                    >
                      −
                    </button>
                    <QuantityInput
                      className="detail-qty-input integer"
                      value={qty}
                      max={phBSel.count || 1}
                      onCommit={setQty}
                    />
                    <button
                      type="button"
                      className="detail-qty-btn"
                      aria-label="Miqdorni oshirish"
                      onClick={() => setQty((q) => Math.min(q + 1, phBSel.count || 1))}
                    >
                      +
                    </button>
                  </div>
                  <button
                    type="button"
                    className="detail-add-btn"
                    onClick={(event) => {
                      addBucket(p, phBSel, qty);
                      animateToCart(event.currentTarget);
                    }}
                  >
                    Savatga qo&apos;shish
                  </button>
                </div>
              )}
            </>
          )}

          {variants && !out && selVariant?.stock != null && (
            <div className="detail-stock ok">✓ Stokda: {Math.floor(selVariant.stock)} ta</div>
          )}
          {variants && out && <div className="detail-stock out">❌ Stokda yo&apos;q</div>}
          {!variants && !phone && p.stock_type === "tracked" && (
            <div className={`detail-stock${out ? " out" : " ok"}`}>
              {out ? "❌ Stokda yo'q" : `✓ Stokda: ${fmtQty(maxQty)} ${unit?.unit_name || "dona"}`}
            </div>
          )}

          {inCart > 0 && (
            <div className="detail-added-badge">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <polyline points="20 6 9 17 4 12" />
              </svg>
              Savatda: {fmtQty(inCart)} {isWeight ? unit?.unit_name || "kg" : "ta"}
            </div>
          )}

          {!phone && (
            <div className="detail-controls">
              {isWeight ? (
                // Weighed goods: type the amount (0.5 kg), no whole-unit steps.
                <div className="detail-qty-wrap weight">
                  <QuantityInput
                    className="detail-qty-input"
                    value={qty}
                    max={availableToAdd}
                    allowDecimal
                    disabled={atCartLimit}
                    onCommit={setQty}
                  />
                  <span className="detail-qty-unit">{unit?.unit_name || "kg"}</span>
                </div>
              ) : (
                <div className="detail-qty-wrap">
                  <button
                    type="button"
                    className="detail-qty-btn"
                    aria-label="Miqdorni kamaytirish"
                    disabled={atCartLimit}
                    onClick={() => setQty((q) => Math.max(1, q - 1))}
                  >
                    −
                  </button>
                  <QuantityInput
                    className="detail-qty-input integer"
                    value={qty}
                    max={availableToAdd}
                    disabled={atCartLimit}
                    onCommit={setQty}
                  />
                  <button
                    type="button"
                    className="detail-qty-btn"
                    aria-label="Miqdorni oshirish"
                    disabled={atCartLimit}
                    onClick={() => setQty((q) => Math.min(q + 1, availableToAdd))}
                  >
                    +
                  </button>
                </div>
              )}
              <button
                type="button"
                ref={addRef}
                className={`detail-add-btn${added ? " btn-added" : ""}`}
                onClick={handleAdd}
                disabled={out || atCartLimit}
              >
                {added ? (
                  <>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                      <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
                    </svg>{" "}
                    Qo&apos;shildi!
                  </>
                ) : (
                  <>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                      <path d={CART_ICON} />
                    </svg>{" "}
                    {out ? "Stokda yo'q" : atCartLimit ? "Maksimum savatda" : "Savatga qo'shish"}
                  </>
                )}
              </button>
            </div>
          )}

          {p.description && <p className="detail-desc">{p.description}</p>}
        </div>
      </div>

      {similar.length > 0 && (
        <div className="detail-similar">
          <div className="detail-similar-title">O&apos;xshash mahsulotlar</div>
          <div className="detail-similar-rail">
            {similar.map((sp) => (
              <div className="detail-similar-item" key={sp.id}>
                <ProductItem p={sp} showImages={showImages} />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
