import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { secureHeaders } from "./lib/secure-headers";

export function proxy(request: NextRequest) {
  const response = NextResponse.next();

  // Apply secure headers
  Object.entries(secureHeaders).forEach(([key, value]) => {
    response.headers.set(key, value);
  });

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - api routes
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files
     */
    "/((?!api|_next/static|_next/image|favicon.ico|public).*)",
  ],
};
