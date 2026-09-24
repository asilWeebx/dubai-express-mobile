import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { ProductDetail } from "@/components/ProductDetail";
import { SetupNotice } from "@/components/SetupNotice";
import { getCustomerCode } from "@/lib/customer/session";
import { similarProducts } from "@/lib/storefront/catalog";
import { findProduct, getCatalogView, getStore } from "@/lib/storefront/store";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const product = await findProduct(Number(id), await getCustomerCode());
  if (!product) return { title: "Mahsulot topilmadi" };

  const description = product.description?.trim() || `${product.name} — ${product.category_name ?? "Dubai Express Mobile"}.`;
  return {
    title: product.name,
    description,
    openGraph: {
      title: product.name,
      description,
      images: product.image ? [product.image] : undefined,
      type: "website",
    },
  };
}

/** Every product has a real, shareable URL. */
export default async function ProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const productId = Number(id);
  if (!Number.isFinite(productId)) notFound();

  const customerCode = await getCustomerCode();
  const [product, catalog, store] = await Promise.all([
    findProduct(productId, customerCode),
    getCatalogView(customerCode),
    getStore(),
  ]);

  if (!catalog.configured) {
    return <SetupNotice reason={catalog.reason ?? store.reason} error={catalog.error ?? store.error} />;
  }
  if (!product) notFound();

  return (
    <ProductDetail
      key={product.id}
      product={product}
      similar={similarProducts(product, catalog.products, 10)}
      showImages={catalog.showImages}
    />
  );
}
