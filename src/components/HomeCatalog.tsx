"use client";

import { useRouter } from "next/navigation";
import { Fragment, useEffect, useMemo, useRef, useState } from "react";

import {
  filterProducts,
  groupByTopCategory,
  searchSuggestions,
} from "@/lib/storefront/catalog";
import type { Category, Product, StoreBanner } from "@/lib/storefront/types";

import { BannerCarousel } from "./BannerCarousel";
import { CategoryThumb } from "./CategoryThumb";
import { IChevronDown } from "./icons";
import { ProductItem } from "./ProductItem";
import { useShopUi } from "./ShopUiContext";

interface SubDropdown {
  catId: number;
  top: number;
  left: number;
}

/**
 * The home page: banners, the sticky category bar, best sellers and the whole
 * catalog grouped by top-level category. Category, subcategory and search
 * filters come from the shell, so the header and the drawer drive this grid.
 */
export function HomeCatalog({
  banners,
  products,
  categories: cats,
  categoryImages: catImgs,
  topProducts,
  showImages,
}: {
  banners: StoreBanner[];
  products: Product[];
  categories: Category[];
  categoryImages: Record<number, string>;
  topProducts: Product[];
  showImages: boolean;
}) {
  const router = useRouter();
  const { search, selTop, selSub, selectCategory, setSelSub, homeResetKey } = useShopUi();

  // Links shared from the single-page store opened a product as `/#product=ID`;
  // products have real URLs now, so send those visitors there.
  useEffect(() => {
    const id = new URLSearchParams(window.location.hash.replace(/^#/, "")).get("product");
    if (id && /^\d+$/.test(id)) router.replace(`/product/${id}`);
  }, [router]);

  const [catStuck, setCatStuck] = useState(false);
  const catSentinelRef = useRef<HTMLDivElement>(null);

  const [activeCat, setActiveCat] = useState<string | null>(null);
  const pendingScrollId = useRef<number | null>(null);
  const sectionRefs = useRef<Record<number, HTMLElement>>({});

  const [subDropdown, setSubDropdown] = useState<SubDropdown | null>(null);
  const chipRefs = useRef<Record<number, HTMLButtonElement>>({});
  const pageTitleRef = useRef<HTMLHeadingElement>(null);

  // "Asosiy" in the bottom nav starts over: the first category is lit again.
  const [seenResetKey, setSeenResetKey] = useState(homeResetKey);
  if (seenResetKey !== homeResetKey) {
    setSeenResetKey(homeResetKey);
    setActiveCat(null);
  }

  const topCats = useMemo(() => cats.filter((c) => !c.parentId), [cats]);
  const subCats = useMemo(
    () => (selTop == null ? [] : cats.filter((c) => c.parentId === selTop)),
    [cats, selTop],
  );
  // With no "all" chip, the first category is lit until scrolling picks another.
  const displayActiveCat = activeCat || (topCats[0] ? String(topCats[0].id) : null);

  const filtered = useMemo(
    () => filterProducts(products, selTop, selSub, search),
    [products, selTop, selSub, search],
  );
  // No exact match: suggest products sharing any word of the query.
  const searchFallback = useMemo(
    () => (!search || filtered.length > 0 ? [] : searchSuggestions(search, products, 8)),
    [search, filtered, products],
  );
  // Unfiltered, the grid is split into one section per top category, and the
  // bar follows the section on screen.
  const groupedSections = useMemo(
    () => (selTop !== null || search || topCats.length === 0 ? null : groupByTopCategory(filtered, topCats)),
    [filtered, topCats, selTop, search],
  );

  useEffect(() => {
    if (!subDropdown) return;
    const close = () => setSubDropdown(null);
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") close();
    };
    window.addEventListener("scroll", close, true);
    window.addEventListener("resize", close);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("scroll", close, true);
      window.removeEventListener("resize", close);
      window.removeEventListener("keydown", onKey);
    };
  }, [subDropdown]);

  // The bar turns compact once it sticks under the header.
  useEffect(() => {
    const el = catSentinelRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(([entry]) => setCatStuck(!entry.isIntersecting), {
      rootMargin: "-64px 0px 0px 0px",
      threshold: 0,
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [cats]);

  // Scroll-spy: light the chip of the section passing under the bar.
  useEffect(() => {
    if (!groupedSections || groupedSections.length === 0) return;
    const els = groupedSections.map((g) => sectionRefs.current[g.cat.id]).filter(Boolean);
    if (!els.length) return;
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) setActiveCat((entry.target as HTMLElement).dataset.catId ?? null);
        });
      },
      { rootMargin: "-160px 0px -70% 0px", threshold: 0 },
    );
    els.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [groupedSections]);

  // A chip clicked while a category was filtered scrolls once sections are back.
  useEffect(() => {
    const id = pendingScrollId.current;
    if (id == null) return;
    pendingScrollId.current = null;
    if (groupedSections) sectionRefs.current[id]?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [groupedSections]);

  const goToCat = (id: number) => {
    setActiveCat(String(id));
    if (selTop !== null) {
      pendingScrollId.current = id;
      selectCategory(null, null);
    } else {
      sectionRefs.current[id]?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  const toggleSubDropdown = (catId: number, chipEl: HTMLButtonElement | undefined) => {
    setSubDropdown((sd) => {
      if (sd && sd.catId === catId) return null;
      if (!chipEl) return null;
      const rect = chipEl.getBoundingClientRect();
      const left = Math.max(12, Math.min(rect.left, window.innerWidth - 232));
      return { catId, top: rect.bottom + 8, left };
    });
  };

  const pickSubFromDropdown = (topId: number, subId: number) => {
    selectCategory(topId, subId);
    setSubDropdown(null);
    pageTitleRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const catName = selSub || selTop ? cats.find((c) => c.id === (selSub || selTop))?.name : null;

  const showTopRail = !search && selTop == null && selSub == null && topProducts.length > 0;
  const grid = (list: Product[], eagerCount = 0) => (
    <div className="product-grid">
      {list.map((p, i) => (
        <ProductItem key={p.id} p={p} showImages={showImages} eager={i < eagerCount} />
      ))}
    </div>
  );

  return (
    <>
      <BannerCarousel banners={banners} />

      <div ref={catSentinelRef} />
      {topCats.length > 0 && (
        <nav className={`cat-bar${catStuck ? " cat-bar-stuck" : ""}`} aria-label="Mahsulot bo‘limlari">
          <div className="cat-bar-inner">
            {topCats.map((c) => {
              const hasSub = cats.some((sc) => sc.parentId === c.id);
              const open = subDropdown?.catId === c.id;
              const active = selTop === c.id || (selTop === null && displayActiveCat === String(c.id)) || open;
              return (
                <div key={c.id} className="cat-chip-group">
                  <button
                    type="button"
                    ref={(el) => {
                      if (el) chipRefs.current[c.id] = el;
                    }}
                    className={`cat-chip${hasSub ? " has-sub" : ""}${active ? " active" : ""}`}
                    onClick={() => goToCat(c.id)}
                  >
                    <CategoryThumb src={catImgs[c.id]} className="cat-chip-thumb" />
                    {c.name}
                  </button>
                  {hasSub && (
                    <button
                      type="button"
                      className={`cat-chip-arrow${open ? " open" : ""}`}
                      aria-label={`${c.name} kichik bo‘limlari`}
                      aria-expanded={open}
                      onClick={() => toggleSubDropdown(c.id, chipRefs.current[c.id])}
                    >
                      <IChevronDown s={11} />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </nav>
      )}

      {subDropdown && (
        <Fragment>
          <div className="cat-subdrop-overlay" onClick={() => setSubDropdown(null)} />
          <div className="cat-subdrop" style={{ top: `${subDropdown.top}px`, left: `${subDropdown.left}px` }}>
            {cats
              .filter((sc) => sc.parentId === subDropdown.catId)
              .map((sub) => (
                <button
                  type="button"
                  key={sub.id}
                  className="cat-subdrop-item"
                  onClick={() => pickSubFromDropdown(subDropdown.catId, sub.id)}
                >
                  <CategoryThumb src={catImgs[sub.id]} className="cat-subdrop-thumb" />
                  <span>{sub.name}</span>
                </button>
              ))}
          </div>
        </Fragment>
      )}

      {subCats.length > 0 && (
        <nav className="cat-bar cat-bar-sub" aria-label="Kichik bo‘limlar">
          <div className="cat-bar-inner">
            <button
              type="button"
              className={`cat-chip cat-chip-sub${selSub === null ? " active" : ""}`}
              onClick={() => setSelSub(null)}
            >
              Barchasi
            </button>
            {subCats.map((c) => (
              <button
                type="button"
                key={c.id}
                className={`cat-chip cat-chip-sub${selSub === c.id ? " active" : ""}`}
                onClick={() => setSelSub(c.id)}
              >
                {c.name}
              </button>
            ))}
          </div>
        </nav>
      )}

      <main className="page-body">
        <h1 className="page-title" id="katalog" ref={pageTitleRef}>
          {catName || "Katalog"}
          <span>{filtered.length} ta mahsulot</span>
        </h1>

        {/* Best sellers — only on the unfiltered home page. */}
        {showTopRail && (
          <div className="top-rail-wrap">
            <div className="top-rail-head">
              <h2>Top tovarlar</h2>
              <span className="top-rail-badge">Eng ko&apos;p sotilgan</span>
            </div>
            <div className="top-rail">
              {topProducts.map((p, i) => (
                <div className="top-rail-item" key={p.id}>
                  <div className="top-rail-rank">
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="#fff" stroke="none" aria-hidden="true">
                      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                    </svg>
                    TOP
                  </div>
                  <ProductItem p={p} showImages={showImages} eager={i < 2} />
                </div>
              ))}
            </div>
          </div>
        )}

        {filtered.length === 0 && searchFallback.length === 0 && (
          <div className="product-grid">
            <div className="state-center">
              <div className="state-emoji">🔍</div>
              <div className="state-text">Mahsulot topilmadi</div>
            </div>
          </div>
        )}
        {filtered.length === 0 && searchFallback.length > 0 && (
          <div>
            <div className="state-center" style={{ padding: "56px 20px 8px" }}>
              <div className="state-emoji">🔍</div>
              <div className="state-text">&quot;{search}&quot; bo&apos;yicha aniq mos kelmadi</div>
            </div>
            <div className="fallback-label">Shunga o&apos;xshash mahsulotlar</div>
            {grid(searchFallback)}
          </div>
        )}

        {filtered.length > 0 && groupedSections && (
          <div className="cat-sections">
            {groupedSections.map((g, index) => (
              <section
                key={g.cat.id}
                id={`cat-sec-${g.cat.id}`}
                data-cat-id={g.cat.id}
                className="cat-section"
                ref={(el) => {
                  if (el) sectionRefs.current[g.cat.id] = el;
                }}
              >
                <h2 className="cat-section-title">{g.cat.name}</h2>
                {grid(g.items, index === 0 && !showTopRail ? 2 : 0)}
              </section>
            ))}
          </div>
        )}
        {filtered.length > 0 && !groupedSections && grid(filtered, 2)}
      </main>
    </>
  );
}
