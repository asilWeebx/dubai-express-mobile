import { HomeCatalog } from "@/components/HomeCatalog";
import { SetupNotice } from "@/components/SetupNotice";
import { StoreExplainer } from "@/components/StoreExplainer";
import { getCustomerCode } from "@/lib/customer/session";
import { getCatalogView, getStore } from "@/lib/storefront/store";

export default async function HomePage() {
  const customerCode = await getCustomerCode();
  const [store, catalog] = await Promise.all([getStore(), getCatalogView(customerCode)]);

  return (
    <>
      {catalog.configured ? (
        <HomeCatalog
          banners={store.banners}
          products={catalog.products}
          categories={catalog.categories}
          categoryImages={catalog.categoryImages}
          topProducts={catalog.topProducts}
          showImages={catalog.showImages}
        />
      ) : (
        <SetupNotice reason={catalog.reason ?? store.reason} error={catalog.error ?? store.error} />
      )}
      <StoreExplainer />
    </>
  );
}
