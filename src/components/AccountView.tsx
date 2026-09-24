"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { useCustomer } from "@/lib/customer/CustomerProvider";
import { money } from "@/lib/storefront/currency";
import { useStore } from "@/lib/storefront/StoreProvider";
import type { Customer, CustomerAccountResponse } from "@/lib/storefront/types";

import { IX } from "./icons";
import { useShopUi } from "./ShopUiContext";

const PM_LABELS: Record<string, string> = {
  cash: "Naqd",
  card: "Karta",
  transfer: "O'tkazma",
  credit: "Nasiya",
  mixed: "Aralash",
  click: "Click",
  payme: "Payme",
  uzum: "Uzum",
  humo: "Humo",
  uzcard: "UzCard",
  installment: "Bo'lib to'lash",
  exchange_credit: "Ayirboshlash",
};
const pmLabel = (m?: string) => PM_LABELS[m ?? ""] || m || "—";

const MONTHS = ["Yanvar", "Fevral", "Mart", "Aprel", "May", "Iyun", "Iyul", "Avgust", "Sentabr", "Oktabr", "Noyabr", "Dekabr"];
function fmtDate(iso?: string) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return `${String(d.getDate()).padStart(2, "0")} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

const TABS = [
  { k: "profile", l: "Hisobim" },
  { k: "sales", l: "Xaridlar" },
  { k: "orders", l: "Zakazlar" },
  { k: "payments", l: "To'lovlar" },
] as const;
type Tab = (typeof TABS)[number]["k"];

const STATUS: Record<string, [string, string]> = {
  new: ["Yangi", "#3b82f6"],
  confirmed: ["Tasdiqlangan", "#f59e0b"],
  sold: ["Yetkazilgan", "#22c55e"],
  cancelled: ["Bekor", "#9ca3af"],
};

/** Sign-in with the in-store customer code, or the signed-in customer's account. */
export function AccountView() {
  const { customer, ready, signIn, signOut } = useCustomer();

  if (!ready) {
    return (
      <div className="sheet-page">
        <div className="skel" style={{ height: 320, borderRadius: 0 }} />
      </div>
    );
  }
  return customer ? <CustomerPortal customer={customer} onLogout={signOut} /> : <Login onLogin={signIn} />;
}

function Login({ onLogin }: { onLogin: (customer: Customer) => void }) {
  const { goBack } = useShopUi();
  const [code, setCode] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  const go = async () => {
    if (!code.trim()) {
      setErr("ID kiriting");
      return;
    }
    setBusy(true);
    setErr("");
    try {
      const response = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: code.trim() }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "Xatolik");
      onLogin(data as Customer);
    } catch (cause) {
      setErr(cause instanceof Error ? cause.message : "Xatolik");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="modal-card pop-in" style={{ margin: "24px auto", boxShadow: "var(--shadow-card)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
        <h1 style={{ fontWeight: 700, fontSize: 17, color: "#111" }}>Mijoz sifatida kirish</h1>
        <button type="button" className="close-btn" aria-label="Orqaga qaytish" onClick={goBack}>
          <IX />
        </button>
      </div>
      <p style={{ fontSize: 13, color: "#aaa", marginBottom: 20, textAlign: "left" }}>
        Do&apos;kondan olgan ID raqamingizni kiriting
      </p>
      <label className="sr-only" htmlFor="customer-code">
        Mijoz ID raqami
      </label>
      <input
        id="customer-code"
        autoComplete="off"
        value={code}
        onChange={(event) => setCode(event.target.value.toUpperCase())}
        onKeyDown={(event) => {
          if (event.key === "Enter") void go();
        }}
        placeholder="CUST-XXXXXX"
        style={{
          width: "100%",
          height: 48,
          border: "1.5px solid #e5e5e5",
          borderRadius: 10,
          paddingLeft: 14,
          fontSize: 15,
          fontFamily: "monospace",
          letterSpacing: 2,
          color: "#111",
          background: "#fafafa",
          marginBottom: err ? 10 : 0,
        }}
      />
      {err && (
        <div className="err-box" role="alert" style={{ marginBottom: 10 }}>
          {err}
        </div>
      )}
      <button type="button" className="primary-btn" style={{ marginTop: 12 }} onClick={go} disabled={busy}>
        {busy ? "Tekshirilmoqda..." : "Kirish"}
      </button>
    </div>
  );
}

function CustomerPortal({ customer, onLogout }: { customer: Customer; onLogout: () => void }) {
  const router = useRouter();
  const { goBack } = useShopUi();
  const { currency: base } = useStore();
  const [result, setResult] = useState<{ code: string; data?: CustomerAccountResponse; error?: string } | null>(null);
  const [tab, setTab] = useState<Tab>("profile");
  const [openSale, setOpenSale] = useState<number | null>(null);

  /** Account figures (debt, balance, totals) are kept in the store's own currency. */
  const inBase = (amount: number | null | undefined) => money(amount, base, base);

  const code = customer.customer_code;
  useEffect(() => {
    let cancelled = false;
    fetch(`/api/customer?code=${encodeURIComponent(code)}`)
      .then(async (response) => {
        const body = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(body.error || "Xatolik");
        return body as CustomerAccountResponse;
      })
      .then((data) => {
        if (!cancelled) setResult({ code, data });
      })
      .catch((cause: unknown) => {
        if (!cancelled) setResult({ code, error: cause instanceof Error ? cause.message : "Xatolik" });
      });
    return () => {
      cancelled = true;
    };
  }, [code]);

  const current = result?.code === code ? result : null;
  const loading = !current;
  const data = current?.data;
  const err = current?.error;

  return (
    <div className="sheet-page">
      <div className="portal-head" style={{ paddingTop: 20 }}>
        <h1 className="portal-title">Mening hisobim</h1>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <button
            type="button"
            className="portal-logout"
            onClick={() => {
              onLogout();
              router.push("/");
            }}
          >
            Chiqish
          </button>
          <button type="button" className="close-btn" aria-label="Orqaga qaytish" onClick={goBack}>
            <IX />
          </button>
        </div>
      </div>

      <div className="portal-tabs" role="tablist" aria-label="Hisob bo‘limlari">
        {TABS.map((t) => (
          <button
            type="button"
            key={t.k}
            role="tab"
            aria-selected={tab === t.k}
            className={`portal-tab${tab === t.k ? " active" : ""}`}
            onClick={() => setTab(t.k)}
          >
            {t.l}
          </button>
        ))}
      </div>

      <div className="portal-body" role="tabpanel">
        {loading && <div className="portal-loading">Yuklanmoqda...</div>}
        {err && <div className="err-box">{err}</div>}

        {data && tab === "profile" && (
          <>
            <div className="portal-profile-card">
              <div className="portal-avatar">{(data.customer.name || "?")[0].toUpperCase()}</div>
              <div className="portal-profile-info">
                <div className="portal-profile-label">Mijoz</div>
                <div className="portal-profile-name">{data.customer.name}</div>
                <div className="portal-profile-meta">
                  {data.customer.code}
                  {data.customer.phone ? ` · ${data.customer.phone}` : ""}
                </div>
              </div>
            </div>
            <div className="portal-stat-grid">
              <div
                className={`portal-stat${
                  (data.customer.debt ?? 0) > 0 || Object.keys(data.customer.currency_debts || {}).length > 0 ? " debt" : ""
                }`}
              >
                <div className="portal-stat-label">Qarz</div>
                <div className="portal-stat-val">{inBase(data.customer.debt || 0)}</div>
                {Object.entries(data.customer.currency_debts || {}).map(([currency, amount]) => (
                  <div key={currency} className="portal-stat-val" style={{ fontSize: 14, marginTop: 2 }}>
                    {amount} {currency}
                  </div>
                ))}
              </div>
              <div className={`portal-stat${(data.customer.credit ?? 0) > 0 ? " credit" : ""}`}>
                <div className="portal-stat-label">Ortiqcha to&apos;lov</div>
                <div className="portal-stat-val">{inBase(data.customer.credit || 0)}</div>
              </div>
            </div>
            <div
              style={{
                border: "1.5px solid #f0f0f0",
                borderRadius: 14,
                padding: "14px 16px",
                background: "#fafafa",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <span style={{ fontSize: 12, color: "#888", fontWeight: 600 }}>Jami xarid qilingan</span>
              <span style={{ fontSize: 16, fontWeight: 800, color: "#111" }}>
                {inBase((data.sales ?? []).reduce((s, x) => s + (x.total || 0), 0))}
              </span>
            </div>
          </>
        )}

        {data && tab === "sales" &&
          (!data.sales?.length ? (
            <div className="portal-empty">🧾 Xaridlar yo&apos;q</div>
          ) : (
            data.sales.map((s, i) => {
              const total = +(s.total ?? 0) || 0;
              const debt = +(s.debt ?? 0) || 0;
              const paid = +(s.paid ?? 0) || 0;
              const breakdown = s.payment_breakdown || [];
              const expanded = openSale === i;
              const debtText =
                s.debt_currency && s.debt_currency_amount ? `${s.debt_currency_amount} ${s.debt_currency}` : inBase(debt);
              const toggle = () => setOpenSale(expanded ? null : i);
              return (
                <div key={i} style={{ border: "1.5px solid #eee", borderRadius: 14, overflow: "hidden", background: "#fff", flexShrink: 0 }}>
                  <div
                    role="button"
                    tabIndex={0}
                    aria-expanded={expanded}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      padding: "13px 16px",
                      cursor: "pointer",
                      background: "#fff",
                      minHeight: 52,
                    }}
                    onClick={toggle}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        toggle();
                      }
                    }}
                  >
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 700, fontSize: 13, color: "#111", marginBottom: 2 }}>
                        {s.receipt_number || `Xarid #${i + 1}`}
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                        <span style={{ fontSize: 11, color: "#999" }}>{fmtDate(s.created_at)}</span>
                        <span
                          style={{
                            fontSize: 10,
                            color: "#475569",
                            background: "#f1f5f9",
                            padding: "1px 6px",
                            borderRadius: 5,
                            fontWeight: 600,
                          }}
                        >
                          {pmLabel(s.payment_method)}
                        </span>
                      </div>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
                      <div style={{ textAlign: "right" }}>
                        <div style={{ fontWeight: 800, fontSize: 14, color: "#111", whiteSpace: "nowrap" }}>{inBase(total)}</div>
                        {debt > 0 && (
                          <div style={{ fontSize: 10, color: "#ef4444", fontWeight: 700, whiteSpace: "nowrap" }}>
                            Qarz: {debtText}
                          </div>
                        )}
                      </div>
                      <span
                        style={{
                          display: "inline-block",
                          width: 0,
                          height: 0,
                          borderLeft: "5px solid transparent",
                          borderRight: "5px solid transparent",
                          ...(expanded ? { borderBottom: "6px solid #bbb" } : { borderTop: "6px solid #bbb" }),
                        }}
                      />
                    </div>
                  </div>
                  {expanded && (
                    <div
                      style={{
                        borderTop: "1px solid #f0f0f0",
                        padding: "10px 16px",
                        background: "#fafafa",
                        display: "flex",
                        flexDirection: "column",
                        gap: 6,
                      }}
                    >
                      {s.items?.map((it, j) => {
                        const sr = it.serial;
                        const spec = sr
                          ? [sr.storage, sr.color, sr.region, sr.battery != null ? `${sr.battery}%` : ""].filter(Boolean).join(" · ")
                          : "";
                        return (
                          <div key={j} style={{ display: "flex", justifyContent: "space-between", fontSize: 12, gap: 8 }}>
                            <div style={{ minWidth: 0 }}>
                              <div style={{ color: "#555" }}>{it.name || it.product_name || ""}</div>
                              {sr && (
                                <div style={{ fontSize: 10.5, color: "#94a3b8", fontFamily: "ui-monospace,Menlo,monospace", marginTop: 2 }}>
                                  📱 IMEI {sr.imei}
                                  {spec ? ` · ${spec}` : ""}
                                </div>
                              )}
                            </div>
                            <span style={{ color: "#111", fontWeight: 700, whiteSpace: "nowrap" }}>
                              {+(it.qty || it.quantity || 0)} {it.unit || it.unit_name || ""} × {inBase(+(it.price || 0))}
                            </span>
                          </div>
                        );
                      })}
                      <div
                        style={{
                          borderTop: "1px dashed #e2e8f0",
                          marginTop: 4,
                          paddingTop: 6,
                          display: "flex",
                          flexDirection: "column",
                          gap: 4,
                        }}
                      >
                        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11 }}>
                          <span style={{ color: "#999" }}>To&apos;lov usuli</span>
                          <span style={{ color: "#111", fontWeight: 700 }}>{pmLabel(s.payment_method)}</span>
                        </div>
                        {breakdown.length > 1 &&
                          breakdown.map((b, k) => (
                            <div key={k} style={{ display: "flex", justifyContent: "space-between", fontSize: 11 }}>
                              <span style={{ color: "#999" }}>{"   · "}{pmLabel(b.method)}</span>
                              <span style={{ color: "#111", fontWeight: 600 }}>{inBase(+(b.amount || 0))}</span>
                            </div>
                          ))}
                        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11 }}>
                          <span style={{ color: "#999" }}>To&apos;landi</span>
                          <span style={{ color: "#111", fontWeight: 700 }}>{inBase(paid)}</span>
                        </div>
                        {debt > 0 && (
                          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11 }}>
                            <span style={{ color: "#ef4444" }}>Nasiya (qarz)</span>
                            <span style={{ color: "#ef4444", fontWeight: 700 }}>{debtText}</span>
                          </div>
                        )}
                        {debt > 0 && s.debt_currency && s.debt_currency_amount && (
                          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "#b45309" }}>
                            <span>Qarz {s.debt_currency} da yozildi</span>
                            <span>
                              kurs: {inBase(s.debt_rate || 0)} · ≈ {inBase(debt)}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          ))}

        {data && tab === "orders" &&
          (!data.online_orders?.length ? (
            <div className="portal-empty">📦 Zakazlar yo&apos;q</div>
          ) : (
            data.online_orders.map((o, i) => {
              const [label, color] = STATUS[o.status ?? ""] ?? [o.status || "?", "#999999"];
              return (
                <div key={i} style={{ border: "1.5px solid #eee", borderRadius: 14, overflow: "hidden", background: "#fff", flexShrink: 0 }}>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      padding: "13px 16px",
                      background: "#fff",
                      minHeight: 52,
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 13, color: "#111" }}>{o.order_no || `Zakaz #${i + 1}`}</div>
                      <div style={{ fontSize: 11, color: "#999", marginTop: 2 }}>{fmtDate(o.created_at)}</div>
                      <div style={{ fontWeight: 800, fontSize: 14, color: "#111", marginTop: 6 }}>{inBase(+(o.total || 0))}</div>
                    </div>
                    <span
                      style={{
                        color,
                        background: `${color}1a`,
                        fontSize: 11,
                        fontWeight: 700,
                        borderRadius: 999,
                        padding: "3px 10px",
                        flexShrink: 0,
                      }}
                    >
                      {label}
                    </span>
                  </div>
                </div>
              );
            })
          ))}

        {data && tab === "payments" &&
          (!data.payments?.length ? (
            <div className="portal-empty">💳 To&apos;lovlar yo&apos;q</div>
          ) : (
            data.payments.map((p, i) => (
              <div
                key={i}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  border: "1.5px solid #eee",
                  borderRadius: 14,
                  padding: "13px 16px",
                  background: "#fff",
                  flexShrink: 0,
                }}
              >
                <div>
                  <div style={{ fontWeight: 700, fontSize: 15, color: "#22c55e" }}>+{money(+(p.amount || 0), p.currency, base)}</div>
                  <div style={{ fontSize: 11, color: "#999", marginTop: 2 }}>{fmtDate(p.created_at)}</div>
                  {p.note ? <div style={{ fontSize: 11, color: "#bbb", marginTop: 2 }}>{p.note}</div> : null}
                </div>
                <div
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: "50%",
                    background: "#f0fdf4",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#22c55e",
                    fontSize: 16,
                    fontWeight: 700,
                    flexShrink: 0,
                  }}
                >
                  ✓
                </div>
              </div>
            ))
          ))}
      </div>
    </div>
  );
}
