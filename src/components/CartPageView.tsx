"use client";

import { useRouter } from "next/navigation";

import { CartContents } from "./CartContents";

/** The cart as a page — the same contents as the slide-up sheet. */
export function CartPageView() {
  const router = useRouter();
  return (
    <div className="sheet-page">
      <CartContents onCheckout={() => router.push("/checkout")} />
    </div>
  );
}
