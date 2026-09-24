import { NextResponse } from "next/server";

import { getCustomer } from "@/lib/storefront/client";
import { errorResponse } from "@/lib/storefront/route-helpers";

export async function GET(request: Request) {
  try {
    const code = new URL(request.url).searchParams.get("code");
    if (!code) {
      return NextResponse.json({ error: "Kod topilmadi" }, { status: 400 });
    }
    return NextResponse.json(await getCustomer(code));
  } catch (error) {
    return errorResponse(error);
  }
}
