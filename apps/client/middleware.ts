import { NextResponse, type NextRequest } from "next/server";
import { getExperienceMode } from "./src/composition/session-mode";

export async function middleware(request: NextRequest) {
  const mode = await getExperienceMode(request.headers.get("cookie") ?? "");
  const isLiveRoute = request.nextUrl.pathname === "/ordina" || request.nextUrl.pathname.startsWith("/ordina/");
  if ((mode === "demo" && isLiveRoute) || (mode === "live" && !isLiveRoute)) {
    const target = new URL(mode === "demo" ? "/" : "/ordina", process.env.PIZZAOS_APP_ORIGIN ?? request.nextUrl.origin);
    return NextResponse.redirect(target);
  }
  return NextResponse.next();
}

export const config = { matcher: ["/menu/:path*", "/products/:path*", "/product/:path*", "/cart/:path*", "/checkout/:path*", "/orders/:path*", "/group-order/:path*", "/rewards/:path*", "/profile/:path*", "/ordina/:path*"] };
