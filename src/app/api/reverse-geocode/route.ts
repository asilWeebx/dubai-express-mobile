import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const lat = Number(params.get("lat"));
  const lng = Number(params.get("lng"));

  if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) {
    return NextResponse.json({ error: "Koordinata noto'g'ri" }, { status: 400 });
  }

  try {
    const url = new URL("https://nominatim.openstreetmap.org/reverse");
    url.searchParams.set("format", "jsonv2");
    url.searchParams.set("lat", String(lat));
    url.searchParams.set("lon", String(lng));
    url.searchParams.set("zoom", "18");
    url.searchParams.set("addressdetails", "1");
    url.searchParams.set("accept-language", "uz,ru");

    const response = await fetch(url, {
      headers: {
        Accept: "application/json",
        "User-Agent": "DubaiExpressMobile-Storefront/1.0",
      },
      cache: "no-store",
    });
    if (!response.ok) throw new Error(`Nominatim ${response.status}`);
    const data = (await response.json()) as { display_name?: string };
    return NextResponse.json({ address: data.display_name || null });
  } catch {
    return NextResponse.json({ address: null }, { status: 502 });
  }
}
