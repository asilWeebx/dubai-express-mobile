import { NextResponse } from "next/server";

import { createOrder } from "@/lib/storefront/client";
import { errorResponse } from "@/lib/storefront/route-helpers";
import type { OrderPayload } from "@/lib/storefront/types";

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as OrderPayload;

    if (!payload.customer_name?.trim() || !payload.phone?.trim()) {
      return NextResponse.json(
        { error: "Ism va telefon raqami majburiy" },
        { status: 400 },
      );
    }
    if (!payload.items?.length) {
      return NextResponse.json({ error: "Savat bo'sh" }, { status: 400 });
    }

    return NextResponse.json(await createOrder(payload));
  } catch (error) {
    return errorResponse(error);
  }
}
