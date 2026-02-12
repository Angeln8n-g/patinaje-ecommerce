import { NextResponse, type NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  const token = request.cookies.get("skating_token")?.value;

  // Protected routes — redirect to login if no token
  const protectedPaths = ["/skating-store/checkout", "/admin", "/seller", "/delivery"];
  const isProtected = protectedPaths.some((p) => request.nextUrl.pathname.startsWith(p));

  if (isProtected && !token) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/skating-store/checkout/:path*",
    "/admin/:path*",
    "/seller/:path*",
    "/delivery/:path*",
  ],
};
