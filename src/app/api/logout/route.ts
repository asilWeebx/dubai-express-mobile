import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { CUSTOMER_COOKIE } from "@/lib/customer/session";

export async function POST() {
  (await cookies()).delete(CUSTOMER_COOKIE);
  return NextResponse.json({ ok: true });
}
