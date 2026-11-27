import { NextResponse, type NextRequest } from "next/server";
import { getExperienceMode } from "./src/composition/session-mode";
import { resolveClientHost } from "./src/composition/ordering-host";

export async function middleware(request: NextRequest) {
  const host = await resolveClientHost(request.headers.get("host"), request.nextUrl.origin);
  const isDemoRoute = request.nextUrl.pathname === "/poc" || request.nextUrl.pathname.startsWith("/poc/");
  if (isDemoRoute && !host?.storefront) return NextResponse.next();
  const mode = host?.storefront ? "live" : await getExperienceMode(request.headers.get("cookie") ?? "");
  const isLiveRoute = request.nextUrl.pathname === "/ordina" || request.nextUrl.pathname.startsWith("/ordina/");
  if ((mode === "demo" && isLiveRoute) || (mode === "live" && !isLiveRoute)) {
    if (!host && process.env.PIZZAOS_ORDERING_DOMAIN) return NextResponse.next();
    const liveTarget = request.nextUrl.pathname === "/orders" ? "/ordina/ordini"
      : request.nextUrl.pathname === "/cart" ? "/ordina/carrello"
      : request.nextUrl.pathname === "/checkout" ? "/ordina/checkout" : "/ordina";
    const target = new URL(mode === "demo" ? "/" : liveTarget, host?.origin ?? request.nextUrl.origin);
    return NextResponse.redirect(target);
  }
  return NextResponse.next();
}

export const config = { matcher: ["/menu/:path*", "/products/:path*", "/product/:path*", "/cart/:path*", "/checkout/:path*", "/orders/:path*", "/group-order/:path*", "/rewards/:path*", "/profile/:path*", "/ordina/:path*", "/poc/:path*"] };
