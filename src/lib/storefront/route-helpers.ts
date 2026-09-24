import { NextResponse } from "next/server";

import { StorefrontError } from "./client";

/** Turns a storefront failure into the same JSON shape the API itself uses. */
export function errorResponse(error: unknown) {
  if (error instanceof StorefrontError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }
  console.error("Storefront request failed", error);
  return NextResponse.json({ error: "Xatolik yuz berdi" }, { status: 500 });
}
