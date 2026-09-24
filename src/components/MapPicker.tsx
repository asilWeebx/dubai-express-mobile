"use client";

import type { Map as LeafletMap } from "leaflet";
import { useEffect, useRef, useState } from "react";

import { useDialogA11y } from "@/lib/dialog";

import { ICrosshair, IPin, IX } from "./icons";

export interface Coordinates {
  lat: number;
  lng: number;
}

/** Tashkent, where the map opens when there is nothing better to show. */
const DEFAULT_CENTER: Coordinates = { lat: 41.311081, lng: 69.240562 };
const ACCENT = "var(--sage)";

/**
 * Coordinates to a street address (OpenStreetMap Nominatim), proxied through
 * `/api/reverse-geocode` so it can send the identifying User-Agent Nominatim
 * asks for.
 */
export async function reverseGeocode(lat: number, lng: number): Promise<string | null> {
  try {
    const response = await fetch(
      `/api/reverse-geocode?lat=${encodeURIComponent(lat)}&lng=${encodeURIComponent(lng)}`,
    );
    if (!response.ok) return null;
    const data = (await response.json()) as { address?: string | null };
    return data.address ?? null;
  } catch {
    return null;
  }
}

/**
 * Full-screen map with a fixed centre pin: the customer drags the map under
 * it. The last centre is remembered between openings.
 */
export function MapPicker({
  open,
  initial,
  onPick,
  onClose,
}: {
  open: boolean;
  initial: Coordinates | null;
  onPick: (lat: number, lng: number, address: string | null) => void;
  onClose: () => void;
}) {
  const centerRef = useRef<Coordinates>(initial ?? DEFAULT_CENTER);
  if (!open) return null;
  return <MapDialog centerRef={centerRef} onPick={onPick} onClose={onClose} />;
}

/** Mounted per opening, so the address and error state always start fresh. */
function MapDialog({
  centerRef,
  onPick,
  onClose,
}: {
  centerRef: React.RefObject<Coordinates>;
  onPick: (lat: number, lng: number, address: string | null) => void;
  onClose: () => void;
}) {
  const boxRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const dialogRef = useDialogA11y(true, onClose);
  const [address, setAddress] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [mapError, setMapError] = useState("");

  useEffect(() => {
    let disposed = false;
    let map: LeafletMap | null = null;
    let moveTimer: ReturnType<typeof setTimeout> | undefined;
    let initTimer: ReturnType<typeof setTimeout> | undefined;

    // Leaflet touches `window`, so it is only loaded once the map is opened.
    import("leaflet")
      .then(({ default: L }) => {
        if (disposed || !boxRef.current) return;
        const c = centerRef.current;
        map = L.map(boxRef.current, { zoomControl: false }).setView([c.lat, c.lng], 16);
        map.attributionControl.setPosition("topright");
        // OpenStreetMap's tile policy requires the attribution to stay visible.
        L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
          maxZoom: 19,
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        }).addTo(map);
        // Top-right, so it does not cover the close button in the top-left corner.
        L.control.zoom({ position: "topright" }).addTo(map);
        mapRef.current = map;

        const resolve = async () => {
          if (!map) return;
          const p = map.getCenter();
          centerRef.current = { lat: p.lat, lng: p.lng };
          setLoading(true);
          const found = await reverseGeocode(p.lat, p.lng);
          if (!disposed) {
            setAddress(found);
            setLoading(false);
          }
        };
        map.on("moveend", () => {
          clearTimeout(moveTimer);
          moveTimer = setTimeout(resolve, 350);
        });
        initTimer = setTimeout(() => {
          map?.invalidateSize();
          void resolve();
        }, 120);
      })
      .catch(() => {
        if (!disposed) {
          setMapError("Xarita yuklanmadi");
          setLoading(false);
        }
      });

    return () => {
      disposed = true;
      clearTimeout(moveTimer);
      clearTimeout(initTimer);
      map?.remove();
      mapRef.current = null;
    };
  }, [centerRef]);

  const locate = () => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (p) => mapRef.current?.setView([p.coords.latitude, p.coords.longitude], 17),
      () => {},
      { enableHighAccuracy: true, timeout: 15000 },
    );
  };

  const roundButton: React.CSSProperties = {
    position: "absolute",
    zIndex: 600,
    border: "none",
    background: "#fff",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
    boxShadow: "0 2px 10px rgba(0,0,0,.3)",
  };

  return (
    <div
      ref={dialogRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby="map-title"
      tabIndex={-1}
      // Above the bottom navigation (9000) and the checkout success modal.
      style={{ position: "fixed", inset: 0, zIndex: 9500, background: "#000" }}
    >
      <h2 id="map-title" className="sr-only">
        Yetkazish joyini xaritadan tanlash
      </h2>
      <div ref={boxRef} style={{ position: "absolute", inset: 0 }} />
      {mapError && (
        <div
          className="err-box"
          role="alert"
          style={{ position: "absolute", top: 76, left: 16, right: 16, zIndex: 650, maxWidth: 420, margin: "0 auto" }}
        >
          {mapError}. Internet aloqasini tekshirib, qayta oching.
        </div>
      )}
      <div
        style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%,-100%)",
          pointerEvents: "none",
          zIndex: 500,
          color: "#e0362a",
        }}
      >
        <IPin s={38} />
      </div>
      <button
        type="button"
        aria-label="Xaritani yopish"
        onClick={onClose}
        style={{ ...roundButton, top: 16, left: 16, width: 44, height: 44, borderRadius: 22 }}
      >
        <IX s={18} />
      </button>
      <button
        type="button"
        aria-label="Joriy joylashuvimni ko'rsatish"
        onClick={locate}
        style={{ ...roundButton, right: 16, bottom: 190, width: 46, height: 46, borderRadius: 23 }}
      >
        <ICrosshair s={20} />
      </button>
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          bottom: 0,
          background: "#fff",
          borderRadius: "18px 18px 0 0",
          padding: "18px 20px calc(18px + env(safe-area-inset-bottom))",
          zIndex: 600,
        }}
      >
        <div style={{ fontSize: 11, fontWeight: 700, color: "#888", letterSpacing: 0.6, marginBottom: 8 }}>
          TANLANGAN JOY
        </div>
        <div
          style={{
            background: "#f4f4f4",
            borderRadius: 12,
            padding: 14,
            fontSize: 14,
            fontWeight: 700,
            color: "#222",
            marginBottom: 14,
            lineHeight: 1.4,
          }}
        >
          {loading ? "Aniqlanmoqda..." : address || "Manzil aniqlanmadi (koordinata saqlanadi)"}
        </div>
        <button
          type="button"
          onClick={() => onPick(centerRef.current.lat, centerRef.current.lng, address)}
          disabled={Boolean(mapError)}
          style={{
            width: "100%",
            height: 52,
            border: "none",
            borderRadius: 14,
            background: mapError ? "var(--line)" : ACCENT,
            color: "#fff",
            fontSize: 16,
            fontWeight: 800,
            cursor: mapError ? "not-allowed" : "pointer",
          }}
        >
          Shu yerni tanlash
        </button>
      </div>
    </div>
  );
}
