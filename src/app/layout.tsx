import type { Metadata, Viewport } from "next";
import { Montserrat } from "next/font/google";

import { StorefrontShell } from "@/components/StorefrontShell";
import { CartProvider } from "@/lib/cart/CartProvider";
import { CustomerProvider } from "@/lib/customer/CustomerProvider";
import { getCustomerCode } from "@/lib/customer/session";
import { StoreProvider } from "@/lib/storefront/StoreProvider";
import { getCatalogView, getStore } from "@/lib/storefront/store";

import "./globals.css";

/*
 * Montserrat is self-hosted by next/font under a hashed family name, which
 * globals.css reaches through `--font-montserrat`. Cyrillic is included
 * because product names typed into the ERP may be in Uzbek Cyrillic.
 */
const montserrat = Montserrat({
  variable: "--font-montserrat",
  subsets: ["latin", "latin-ext", "cyrillic"],
});

export const metadata: Metadata = {
  title: {
    default: "Dubai Express Mobile",
    template: "%s · Dubai Express Mobile",
  },
  description: "Dubai Express Mobile — telefonlarni qoldiqdan tanlab, onlayn buyurtma bering.",
  openGraph: {
    title: "Dubai Express Mobile",
    description: "Telefonlarni qoldiqdan tanlab, onlayn buyurtma bering.",
    type: "website",
  },
  twitter: { card: "summary" },
};

export const viewport: Viewport = {
  themeColor: "#f6f6f7",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // The store name, categories and the catalog (for cart re-validation) are
  // needed on every page, so they are fetched once here. `cache()` makes the
  // pages' own calls for the same data free.
  const customerCode = await getCustomerCode();
  const [store, catalog] = await Promise.all([getStore(), getCatalogView(customerCode)]);

  return (
    <html lang="uz" className={montserrat.variable}>
      <body>
        <StoreProvider value={store}>
          <CustomerProvider>
            <CartProvider>
              <StorefrontShell
                products={catalog.products}
                categories={catalog.categories}
                categoryImages={catalog.categoryImages}
              >
                {children}
              </StorefrontShell>
            </CartProvider>
          </CustomerProvider>
        </StoreProvider>
      </body>
    </html>
  );
}
