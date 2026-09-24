import { NextResponse } from "next/server";

import { login } from "@/lib/storefront/client";
import { errorResponse } from "@/lib/storefront/route-helpers";
import { CUSTOMER_COOKIE } from "@/lib/customer/session";

/** Proxies customer sign-in so the storefront key never reaches the browser. */
export async function POST(request: Request) {
  try {
    const { code } = (await request.json()) as { code?: string };
    if (!code?.trim()) {
      return NextResponse.json({ error: "ID kiriting" }, { status: 400 });
    }
    const customer = await login(code.trim());
    const response = NextResponse.json(customer);
    response.cookies.set(CUSTOMER_COOKIE, customer.customer_code, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 180,
    });
    return response;
  } catch (error) {
    return errorResponse(error);
  }
}
