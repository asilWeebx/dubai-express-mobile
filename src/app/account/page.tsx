import type { Metadata } from "next";

import { AccountView } from "@/components/AccountView";

export const metadata: Metadata = {
  title: "Mening hisobim",
  robots: { index: false },
};

export default function AccountPage() {
  return (
    <main className="page-body">
      <AccountView />
    </main>
  );
}
