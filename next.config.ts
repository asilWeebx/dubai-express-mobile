import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    /*
     * Product images are whatever URL the shop owner pasted into the ERP —
     * the CDN, their own site, or a search-result thumbnail — so the set of
     * hosts is open-ended and cannot be allow-listed up front. An unlisted
     * host makes `next/image` throw during render, which takes the whole page
     * down, so every host is permitted and bad URLs are handled at the
     * component level instead (see SafeImage).
     *
     * The trade-off: the image optimizer will fetch any URL that appears in
     * the catalog. Those URLs come from the authenticated shop owner via the
     * ERP, not from site visitors, so the exposure is limited to whoever can
     * already edit the catalog.
     */
    remotePatterns: [
      { protocol: "https", hostname: "**" },
      // Optimising http sources also serves them back over https, which keeps
      // them from being blocked as mixed content.
      { protocol: "http", hostname: "**" },
    ],
  },
};

export default nextConfig;
