"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { useCart } from "@/lib/cart/CartProvider";
import { toOrderItem } from "@/lib/cart/lines";
import { useCustomer } from "@/lib/customer/CustomerProvider";
import { useDialogA11y } from "@/lib/dialog";
import { groupTotal } from "@/lib/storefront/currency";
import { useStore } from "@/lib/storefront/StoreProvider";
import type { CustomerAccountResponse, DeliveryType, OrderPayload } from "@/lib/storefront/types";

import { IMapIcon, IPin, IX } from "./icons";
import { MapPicker, reverseGeocode } from "./MapPicker";
import { useShopUi } from "./ShopUiContext";

/* Read from the stylesheet so this form follows the palette instead of
   pinning its own copy of it. */
const ACCENT = "var(--sage)";
const AD = "var(--sage-deep)";

export function CheckoutForm() {
  const router = useRouter();
  const { goBack } = useShopUi();
  const { items, ready, clear } = useCart();
  const { customer } = useCustomer();
  const { currency: base } = useStore();

  // Null means untouched, so the saved customer (and then their ERP profile)
  // can prefill the fields without overwriting anything typed.
  const [name, setName] = useState<string | null>(null);
  const [phone, setPhone] = useState<string | null>(null);
  const [profile, setProfile] = useState<{ code: string; name: string; phone: string } | null>(null);
  const [delivery, setDelivery] = useState<DeliveryType>("courier");
  const [payment, setPayment] = useState("cash");
  const [address, setAddress] = useState("");
  const [landmark, setLandmark] = useState("");
  const [lat, setLat] = useState<number | null>(null);
  const [lng, setLng] = useState<number | null>(null);
  const [locating, setLocating] = useState(false);
  const [mapOpen, setMapOpen] = useState(false);
  const [err, setErr] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [orderNo, setOrderNo] = useState<string | null>(null);
  const courier = delivery === "courier";

  const code = customer?.customer_code;
  useEffect(() => {
    if (!code) return;
    let cancelled = false;
    fetch(`/api/customer?code=${encodeURIComponent(code)}`)
      .then((response) => (response.ok ? (response.json() as Promise<CustomerAccountResponse>) : null))
      .then((data) => {
        if (cancelled || !data) return;
        const p = data.customer ?? {};
        setProfile({
          code,
          name: p.name || p.customer_name || "",
          phone: p.phone || p.phone_number || "",
        });
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [code]);

  const known = profile && profile.code === code ? profile : null;
  const nameValue = name ?? (known?.name || customer?.name || customer?.customer_name || "");
  const phoneValue = phone ?? (known?.phone || customer?.phone || customer?.phone_number || "");

  const locateMe = () => {
    if (!navigator.geolocation) {
      setErr("Qurilma joylashuvni qo'llamaydi");
      return;
    }
    setLocating(true);
    setErr("");
    navigator.geolocation.getCurrentPosition(
      async (p) => {
        setLat(p.coords.latitude);
        setLng(p.coords.longitude);
        const found = await reverseGeocode(p.coords.latitude, p.coords.longitude);
        if (found) setAddress(found);
        setLocating(false);
      },
      () => {
        setLocating(false);
        setErr("Joylashuvga ruxsat berilmadi");
      },
      { enableHighAccuracy: true, timeout: 15000 },
    );
  };

  const submit = async () => {
    if (!nameValue.trim() || !phoneValue.trim()) {
      setErr("Ism va telefon raqami majburiy");
      return;
    }
    if (courier && !address.trim() && lat == null) {
      setErr("Manzil kiriting yoki xaritadan belgilang");
      return;
    }
    setErr("");
    setSubmitting(true);

    const payload: OrderPayload = {
      customer_name: nameValue.trim(),
      phone: phoneValue.trim(),
      delivery_type: delivery,
      payment_method: payment,
      ...(courier ? { address: address.trim(), landmark: landmark.trim() } : {}),
      ...(courier && lat != null && lng != null ? { latitude: lat, longitude: lng } : {}),
      ...(code ? { customer_code: code } : {}),
      items: items.map(toOrderItem),
    };

    try {
      const response = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "Xatolik");
      setOrderNo(data.order_no);
      clear();
    } catch (cause) {
      setErr(cause instanceof Error ? cause.message : "Xatolik");
    } finally {
      setSubmitting(false);
    }
  };

  if (orderNo) return <Success orderNo={orderNo} onClose={() => router.push("/")} />;

  if (!ready) {
    return (
      <div className="sheet-page">
        <div className="skel" style={{ height: 420, borderRadius: 0 }} />
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="sheet-page">
        <div className="cart-empty-new">
          <div className="cart-empty-icon">🛒</div>
          <div className="cart-empty-text">Savat bo&apos;sh</div>
          <div className="cart-empty-sub">Mahsulot qo&apos;shish uchun katalogga qayting</div>
          <Link href="/#katalog" className="state-retry" style={{ display: "inline-flex", alignItems: "center" }}>
            Katalogga o&apos;tish
          </Link>
        </div>
      </div>
    );
  }

  const seg = (value: DeliveryType, label: string) => (
    <button
      type="button"
      aria-pressed={delivery === value}
      onClick={() => setDelivery(value)}
      style={{
        flex: 1,
        height: 48,
        borderRadius: 12,
        border: `1.5px solid ${delivery === value ? ACCENT : "rgba(150,150,150,.35)"}`,
        background: delivery === value ? ACCENT : "transparent",
        color: delivery === value ? "#fff" : "inherit",
        fontSize: 15,
        fontWeight: 600,
        cursor: "pointer",
      }}
    >
      {label}
    </button>
  );

  const payCard = (value: string, title: string, sub: string) => (
    <button
      type="button"
      aria-pressed={payment === value}
      onClick={() => setPayment(value)}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        width: "100%",
        textAlign: "left",
        padding: 14,
        borderRadius: 12,
        border: payment === value ? `2px solid ${ACCENT}` : "1.5px solid rgba(150,150,150,.3)",
        background: "transparent",
        color: "inherit",
        cursor: "pointer",
      }}
    >
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 15, fontWeight: 600 }}>{title}</div>
        <div style={{ fontSize: 12, color: "rgba(150,150,150,.95)", marginTop: 2 }}>{sub}</div>
      </div>
      <div
        style={{
          width: 20,
          height: 20,
          borderRadius: 10,
          border: `2px solid ${payment === value ? ACCENT : "rgba(150,150,150,.5)"}`,
          background: payment === value ? ACCENT : "transparent",
          flexShrink: 0,
        }}
      />
    </button>
  );

  return (
    <div className="sheet-page">
      <div className="sheet-header" style={{ paddingTop: 20 }}>
        <h1 className="sheet-title" id="checkout-title">
          Buyurtmani rasmiylashtirish
        </h1>
        <button type="button" className="close-btn" aria-label="Orqaga qaytish" onClick={goBack}>
          <IX />
        </button>
      </div>
      <div style={{ padding: "0 20px 28px", display: "flex", flexDirection: "column", gap: 14, marginTop: 8 }}>
        <div>
          <div className="form-label" style={{ marginBottom: 8 }}>
            YETKAZIB BERISH
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            {seg("courier", "Kuryer")} {seg("pickup", "Olib ketaman")}
          </div>
        </div>

        {courier && (
          <>
            <div className="form-field">
              <label className="form-label" htmlFor="checkout-address">
                Manzil
              </label>
              <input
                id="checkout-address"
                className="form-input"
                value={address}
                onChange={(event) => setAddress(event.target.value)}
                placeholder="Ko'cha, uy, xonadon"
              />
            </div>
            <div className="form-field">
              <label className="form-label" htmlFor="checkout-landmark">
                Mo&apos;ljal (ixtiyoriy)
              </label>
              <input
                id="checkout-landmark"
                className="form-input"
                value={landmark}
                onChange={(event) => setLandmark(event.target.value)}
                placeholder="Masalan: maktab yonida"
              />
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <button
                type="button"
                onClick={locateMe}
                disabled={locating}
                style={{
                  flex: 1,
                  height: 46,
                  borderRadius: 12,
                  border: "1.5px solid rgba(150,150,150,.35)",
                  background: "transparent",
                  color: "inherit",
                  fontSize: 14,
                  fontWeight: 700,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                }}
              >
                {locating ? (
                  "Aniqlanmoqda..."
                ) : (
                  <>
                    <IPin s={16} /> Meni topish
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={() => setMapOpen(true)}
                style={{
                  flex: 1,
                  height: 46,
                  borderRadius: 12,
                  border: `1.5px solid ${lat != null ? ACCENT : "rgba(150,150,150,.35)"}`,
                  background: lat != null ? ACCENT : "transparent",
                  color: lat != null ? "#fff" : "inherit",
                  fontSize: 14,
                  fontWeight: 700,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                }}
              >
                <IMapIcon s={16} /> Xaritadan belgilash
              </button>
            </div>
            {lat != null && (
              <div
                style={{
                  fontSize: 12,
                  color: "#16a34a",
                  fontWeight: 700,
                  marginTop: -4,
                  display: "flex",
                  alignItems: "center",
                  gap: 5,
                }}
              >
                ✓ Joylashuv belgilandi
              </div>
            )}
          </>
        )}

        <div>
          <div className="form-label" style={{ marginBottom: 8 }}>
            TO&apos;LOV USULI
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {payCard("cash", "Naqd pul", "Kuryerga qo'lma-qo'l topshirasiz")}
            {payCard("card", "Karta orqali", "Operator karta raqamini yuboradi")}
          </div>
        </div>

        <div className="form-field">
          <label className="form-label" htmlFor="checkout-name">
            Ismingiz
          </label>
          <input
            id="checkout-name"
            className="form-input"
            autoComplete="name"
            value={nameValue}
            onChange={(event) => setName(event.target.value)}
            placeholder="Ism Familiya"
          />
        </div>
        <div className="form-field">
          <label className="form-label" htmlFor="checkout-phone">
            Telefon raqam
          </label>
          <input
            id="checkout-phone"
            className="form-input"
            type="tel"
            autoComplete="tel"
            value={phoneValue}
            onChange={(event) => setPhone(event.target.value)}
            placeholder="+998 90 000 00 00"
          />
        </div>

        {err && (
          <div className="err-box" role="alert">
            {err}
          </div>
        )}
      </div>
      <div
        style={{
          padding: "12px 20px calc(16px + env(safe-area-inset-bottom))",
          borderTop: "1px solid rgba(150,150,150,.2)",
          background: "inherit",
        }}
      >
        <div className="total-row" style={{ marginBottom: 12 }}>
          <span className="total-label">Jami</span>
          <span className="total-val">{groupTotal(items, base)}</span>
        </div>
        <button type="button" className="primary-btn" onClick={submit} disabled={submitting}>
          {submitting ? "Yuborilmoqda..." : "Buyurtmani tasdiqlash"}
        </button>
      </div>
      <MapPicker
        open={mapOpen}
        initial={lat != null && lng != null ? { lat, lng } : null}
        onPick={(la, ln, found) => {
          setLat(la);
          setLng(ln);
          if (found) setAddress(found);
          setMapOpen(false);
        }}
        onClose={() => setMapOpen(false)}
      />
    </div>
  );
}

/** "Buyurtma qabul qilindi!" with the order number. */
function Success({ orderNo, onClose }: { orderNo: string; onClose: () => void }) {
  const dialogRef = useDialogA11y(true, onClose);
  return (
    <div className="modal-center fade-in">
      <div
        ref={dialogRef}
        className="modal-card pop-in"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="success-title"
        tabIndex={-1}
      >
        <div className="success-icon">✅</div>
        <div id="success-title" style={{ fontWeight: 800, fontSize: 20, color: "#111", marginBottom: 8 }}>
          Buyurtma qabul qilindi!
        </div>
        <div style={{ color: "#aaa", fontSize: 13, marginBottom: 4 }}>Buyurtma raqami</div>
        <div style={{ fontWeight: 800, fontSize: 20, color: AD, marginBottom: 8 }}>{orderNo}</div>
        <div style={{ color: "#bbb", fontSize: 13, marginBottom: 28 }}>Do&apos;kon tez orada siz bilan bog&apos;lanadi</div>
        <button type="button" className="dark-btn" onClick={onClose}>
          Xaridni davom ettirish
        </button>
      </div>
    </div>
  );
}
