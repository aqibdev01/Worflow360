import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Simplified middleware - just pass through all requests
// Auth is handled client-side by AuthProvider
export async function middleware(req: NextRequest) {
  return NextResponse.next();
}

// Configure which routes to run middleware on
export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
