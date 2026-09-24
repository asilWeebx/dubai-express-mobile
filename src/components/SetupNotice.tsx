"use client";

import { useRouter } from "next/navigation";

import type { FailureReason } from "@/lib/storefront/store";

/**
 * Shown instead of products when the catalog cannot be loaded. A rejected key
 * needs someone to fix the configuration; a network blip just needs a retry,
 * so the two say different things.
 */
export function SetupNotice({ reason = "unavailable", error }: { reason?: FailureReason; error?: string }) {
  const router = useRouter();
  const isSetup = reason === "auth";

  return (
    <main className="page-body">
      <div className="product-grid">
        <div className="state-center setup-notice">
          <div className="state-emoji">😕</div>
          <div className="state-text">
            {isSetup ? "Do'kon hali ulanmagan" : "Xatolik yuz berdi"}
            {error ? `: ${error}` : ""}
          </div>
          {isSetup && (
            <p className="state-text" style={{ marginTop: 10, fontSize: 13 }}>
              Storefront kalitini ERP SuperAdmin panelidan oling (tashkilot → Online Store) va uni{" "}
              <code>DUKONLINE_STOREFRONT_KEY</code> sozlamasiga qo&apos;ying.
            </p>
          )}
          <button type="button" className="state-retry" onClick={() => router.refresh()}>
            Qayta urinish
          </button>
        </div>
      </div>
    </main>
  );
}
