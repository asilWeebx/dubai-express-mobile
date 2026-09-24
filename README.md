# dubai-express-mobile

Online storefront for **Dubai Express Mobile**, a dukonline.uz ERP tenant that
sells phones in dollars. Built on Next.js 16 (App Router), the same
architecture as `original_parfumeria` and `dukonline-demo`.

The site owns no data. Store name, banners, categories, products, prices, stock
and phone (IMEI) inventory all come from the shared dukonline ERP; the only
thing this app writes back is an order. There is no database and no CMS.

This replaces the earlier single-file `index.html` build (React + htm from
esm.sh, key in `config.js`). The look, the features and the sign-in storage key
(`sf_cust`) carry over, so returning customers stay signed in. Old share links
of the form `/#product=123` redirect to `/product/123`.

## Getting started

```bash
npm ci
cp .env.example .env.local     # then fill in the key
npm run dev                    # http://localhost:3000
```

### Environment

| Variable | Purpose |
| --- | --- |
| `DUKONLINE_API_URL` | Always `https://api.dukonline.uz/api`. Every tenant shares one host — only the key differs. Change it only for a local backend. |
| `DUKONLINE_STOREFRONT_KEY` | Selects the tenant, sent as the `X-Storefront-Key` header. From ERP SuperAdmin → organization → Online Store. |

Both are **server-side only** — there is no `NEXT_PUBLIC_` variable, so the key
never reaches the browser (the old `config.js` shipped it to every visitor).
Customer sign-in, account data, order submission and reverse geocoding go
through route handlers in `src/app/api/` for this reason.

The app needs a Node host; it is no longer a static page. On Vercel, set both
variables under Project Settings → Environment Variables. `vercel.json` pins the
framework to Next.js, since the project was first set up for a static site.

## Scripts

```bash
npm run dev      # dev server
npm run build    # production build (also writes next-env.d.ts)
npm start        # serve the production build
npm run lint     # eslint (flat config)
npm test         # node --test over tests/*.test.ts
```

> A fresh clone shows TypeScript errors until the first `npm run build`:
> `next-env.d.ts` (which declares `.png` imports, among others) is generated.

## The API

Six endpoints, all wrapped in `src/lib/storefront/client.ts`:

| Call | Endpoint | Cache |
| --- | --- | --- |
| `getStoreInfo()` | `GET /storefront/info/` | 300s |
| `getCatalog(code?)` | `GET /storefront/products/` | 60s; uncached with a customer code |
| `getTopProductIds(n)` | `GET /storefront/top-products/` | 300s |
| `login(code)` | `POST /storefront/login/` | — |
| `getCustomer(code)` | `GET /storefront/customer/` | — |
| `createOrder(payload)` | `POST /storefront/orders/` | — |

There is no pagination, no per-product endpoint, no server-side search and no
category endpoint. The whole catalog arrives in one response and everything
else is derived from it in `src/lib/storefront/catalog.ts`: categories are
rebuilt from each product's `category_id`/`category_parent_id` (alphabetically,
with uncategorized products under "Boshqa mahsulotlar" last), "similar
products" is a nearest-price lookup within a category, and search is a name
filter with a word-overlap fallback.

A failed call never blanks the site: `getStore()` and `getCatalogView()` in
`src/lib/storefront/store.ts` catch every error and `SetupNotice` says whether
the key was rejected or the API was unreachable.

## Layout

```text
src/
├── app/
│   ├── layout.tsx          fetches store + catalog once, mounts providers and the shell
│   ├── page.tsx            home: banners, category bar, top products, sections
│   ├── product/[id]/       product page (IMEI phones, units, variants, similar)
│   ├── cart/ checkout/ account/
│   ├── api/                6 route handlers proxying the API and Nominatim
│   └── globals.css         the whole design system (see below)
├── assets/logo.png
├── components/             no UI library
└── lib/
    ├── storefront/         client, store (the one data seam), catalog, types,
    │                       currency, product-view
    ├── cart/               lines.ts (pure cart reducers), CartProvider, quantity
    ├── customer/           CustomerProvider (localStorage) + session cookie
    ├── persistent-store.ts localStorage stores read via useSyncExternalStore
    └── dialog.ts           Escape / focus trap / scroll lock for every dialog
```

### Notes for whoever works on this next

- **The CSS is the old design system, carried over as-is.** `globals.css` keeps
  the original class names. Tailwind v4 is loaded for its theme and utilities
  but **without preflight** — the stylesheet has its own reset, and preflight
  would change line-heights, heading weights and form fonts site-wide.
- **Every `:hover` rule sits in `@media (hover: hover)`**, or phones keep a
  tapped button red. **Write `backdrop-filter` without a `-webkit-` twin**: the
  build adds the prefix, and given both it keeps only the last one, which
  Chrome and Firefox ignore.
- **Montserrat comes from `next/font`**, under a hashed family name exposed as
  `--font-montserrat`. Write `var(--font-montserrat)`, never `'Montserrat'`.
- **The store prices in dollars.** `/storefront/info/` reports its currency as
  `"$"`; a product with an empty `currency` is priced in it. Every price is shown
  in its own currency and never converted; cart totals are summed per currency
  and shown side by side (`$52  +  300 000 so'm`).
- **Phones are sold by IMEI.** A product with a `phone` block is a model card:
  `individual` mode lists every copy (storage/colour/region pickers, then a
  copy), `grouped` mode sells a count from a spec + price bucket. Both have their
  own cart line types in `src/lib/cart/lines.ts`, and a bucket line sends its
  identity (`base_price`, `currency`, `storage`, `color`, `region`) in the order.
- **Product images are whatever URL was pasted into the ERP.** `next.config.ts`
  allows every host; `SafeImage` falls back to loading the URL directly if the
  optimizer can't fetch it, and to a placeholder if that fails too.
- **Auth is a customer code printed in-store**, not a password. It unlocks
  per-customer prices and purchase history, which is why the code is mirrored
  into an httpOnly cookie that the server reads for the catalog request.
- Copy is hardcoded Uzbek (Latin); there is no i18n layer.
