import { NextResponse, type NextRequest } from "next/server";
import { getExperienceMode } from "./src/composition/session-mode";
import { resolveOperationalHost } from "./src/composition/operational-host";

export async function middleware(request: NextRequest) {
  const host = resolveOperationalHost(request);
  if (!host) return new NextResponse("Indirizzo non disponibile.", { status: 404 });
  const path = request.nextUrl.pathname;
  const operations = path === "/operazioni" || path.startsWith("/operazioni/");
  const rider = path === "/rider" || path.startsWith("/rider/");
  if (host.separateHosts && ((host.surface === "rider" && operations) || (host.surface === "admin" && rider))) {
    return NextResponse.redirect(new URL("/", host.origin));
  }
  if ((operations || rider) && await getExperienceMode(request.headers.get("cookie") ?? "", host.origin) === "demo") {
    return NextResponse.redirect(new URL("/", host.origin));
  }
  return NextResponse.next();
}

export const config = { matcher: ["/", "/accesso", "/operazioni/:path*", "/rider/:path*"] };
