"use client";

import { Fragment, useState } from "react";

import { useDialogA11y } from "@/lib/dialog";
import type { Category } from "@/lib/storefront/types";

import { CategoryThumb } from "./CategoryThumb";
import { useShopUi } from "./ShopUiContext";

/** Slide-in catalog: searchable top categories, expandable into subcategories. */
export function CategoryDrawer({
  categories,
  categoryImages,
}: {
  categories: Category[];
  categoryImages: Record<number, string>;
}) {
  const { drawerOpen: open, closeDrawer: onClose, selTop, selSub, selectCategory } = useShopUi();
  const [query, setQuery] = useState("");
  const [expanded, setExpanded] = useState<Record<number, boolean>>({});
  const dialogRef = useDialogA11y(open, onClose);

  const ql = query.trim().toLowerCase();
  const childrenOf = (id: number) => categories.filter((c) => c.parentId === id);
  const pick = (top: number, sub: number | null) => {
    selectCategory(top, sub);
    onClose();
  };

  let tops = categories.filter((c) => !c.parentId);
  if (ql) {
    tops = tops.filter(
      (t) =>
        t.name.toLowerCase().includes(ql) ||
        childrenOf(t.id).some((s) => s.name.toLowerCase().includes(ql)),
    );
  }

  const thumb = (id: number) => <CategoryThumb src={categoryImages[id]} className="dc-thumb" />;

  return (
    <>
      <div className={`drawer-overlay${open ? " open" : ""}`} aria-hidden="true" onClick={onClose} />
      <div
        ref={dialogRef}
        className={`cat-drawer${open ? " open" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="catalog-title"
        tabIndex={-1}
      >
        <div className="cat-drawer-head">
          <h2 id="catalog-title">Katalog</h2>
          <div className="cat-drawer-search">
            <label className="sr-only" htmlFor="catalog-search">
              Bo&apos;limlarni qidirish
            </label>
            <input
              id="catalog-search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Bo'limlarni qidirish..."
            />
          </div>
        </div>
        <div className="cat-drawer-list">
          {tops.map((t) => {
            const subs = childrenOf(t.id);
            const parentActive = selTop === t.id && selSub == null;
            if (subs.length === 0) {
              return (
                <div key={t.id} className="drawer-cat-item">
                  <button
                    type="button"
                    className={`drawer-cat-btn${parentActive ? " dc-active" : ""}`}
                    onClick={() => pick(t.id, null)}
                  >
                    {thumb(t.id)}
                    <span className="dc-label">{t.name}</span>
                    <span className="dc-dot" />
                  </button>
                </div>
              );
            }
            const isOpen = Boolean(expanded[t.id] || (ql && subs.some((s) => s.name.toLowerCase().includes(ql))));
            const visibleSubs = subs.filter((s) => !ql || s.name.toLowerCase().includes(ql));
            return (
              <div key={t.id} className="drawer-cat-item">
                <button
                  type="button"
                  className={`drawer-cat-btn${parentActive ? " dc-active" : ""}`}
                  aria-expanded={isOpen}
                  onClick={() => setExpanded((e) => ({ ...e, [t.id]: !isOpen }))}
                >
                  {thumb(t.id)}
                  <span className="dc-label">{t.name}</span>
                  <span className={`dc-chevron${isOpen ? " open" : ""}`}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M6 9l6 6 6-6" />
                    </svg>
                  </span>
                </button>
                {isOpen && (
                  <Fragment>
                    <button
                      type="button"
                      className={`dc-sub${parentActive ? " dc-active" : ""}`}
                      onClick={() => pick(t.id, null)}
                    >
                      <span className="dc-bar" />
                      <span className="dc-label">Hammasi</span>
                    </button>
                    {visibleSubs.map((s) => (
                      <button
                        type="button"
                        key={s.id}
                        className={`dc-sub${selSub === s.id ? " dc-active" : ""}`}
                        onClick={() => pick(t.id, s.id)}
                      >
                        <span className="dc-bar" />
                        {thumb(s.id)}
                        <span className="dc-label">{s.name}</span>
                      </button>
                    ))}
                  </Fragment>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}
