import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function proxy(request: NextRequest) {
  const response = NextResponse.next();
  // CSP disabled - was blocking Privy auth scripts
  // Re-enable with caution - ensure it doesn't conflict with external auth providers
  return response;
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|public).*)"],
};
