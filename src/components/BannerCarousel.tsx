"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import type { StoreBanner } from "@/lib/storefront/types";

import { SafeImage } from "./SafeImage";

/** Banners from the ERP ("Online do'kon → Bannerlar"), rotating every 4 seconds. */
export function BannerCarousel({ banners }: { banners: StoreBanner[] }) {
  const [index, setIndex] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval>>(undefined);
  const n = banners.length;
  const current = n ? index % n : 0;

  const resume = useCallback(() => {
    clearInterval(timerRef.current);
    if (n > 1) timerRef.current = setInterval(() => setIndex((i) => (i + 1) % n), 4000);
  }, [n]);

  useEffect(() => {
    resume();
    return () => clearInterval(timerRef.current);
  }, [resume]);

  if (!n) return null;
  const go = (delta: number) => setIndex((i) => (i + delta + n) % n);

  return (
    <div className="banner-wrap">
      <div
        className="banner-viewport"
        onMouseEnter={() => clearInterval(timerRef.current)}
        onMouseLeave={resume}
      >
        <div className="banner-track" style={{ transform: `translateX(-${current * 100}%)` }}>
          {banners.map((banner, i) => (
            <div key={i} className="banner-slide">
              <SafeImage
                src={banner.image}
                alt={banner.title}
                sizes="(max-width: 640px) 100vw, 1300px"
                eager={i === 0}
                fallback={null}
              />
              {banner.title && <div className="banner-title">{banner.title}</div>}
            </div>
          ))}
        </div>
        {n > 1 && (
          <>
            <button type="button" className="banner-arrow prev" onClick={() => go(-1)} aria-label="Oldingi banner">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <polyline points="15 18 9 12 15 6" />
              </svg>
            </button>
            <button type="button" className="banner-arrow next" onClick={() => go(1)} aria-label="Keyingi banner">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </button>
            <div className="banner-dots">
              {banners.map((_, i) => (
                <button
                  type="button"
                  key={i}
                  className={`banner-dot${i === current ? " active" : ""}`}
                  onClick={() => setIndex(i)}
                  aria-label={`Banner ${i + 1}`}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
