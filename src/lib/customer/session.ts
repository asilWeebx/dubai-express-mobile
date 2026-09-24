import "server-only";

import { cookies } from "next/headers";

export const CUSTOMER_COOKIE = "dukonline_customer_code";

export async function getCustomerCode() {
  return (await cookies()).get(CUSTOMER_COOKIE)?.value?.trim() || undefined;
}
