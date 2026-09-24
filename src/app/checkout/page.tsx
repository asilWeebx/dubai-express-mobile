import type { Metadata } from "next";

import { CheckoutForm } from "@/components/CheckoutForm";

export const metadata: Metadata = {
  title: "Buyurtmani rasmiylashtirish",
  robots: { index: false },
};

export default function CheckoutPage() {
  return (
    <main className="page-body">
      <CheckoutForm />
    </main>
  );
}
