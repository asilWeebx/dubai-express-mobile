import type { Metadata } from "next";

import { CartPageView } from "@/components/CartPageView";

export const metadata: Metadata = {
  title: "Savatcha",
  robots: { index: false },
};

export default function CartPage() {
  return (
    <main className="page-body">
      <h1 className="page-title">Savatcha</h1>
      <CartPageView />
    </main>
  );
}
