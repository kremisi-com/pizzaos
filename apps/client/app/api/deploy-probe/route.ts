export const dynamic = "force-dynamic";

type DeployProbePayload = {
  app: "pizzaos-client";
  environment?: string;
  forwardedHost: string | null;
  forwardedProto: string | null;
  host: string | null;
  reachedApp: true;
  region?: string;
  timestamp: string;
  vercelUrl?: string;
};

export function GET(request: Request): Response
{
  const headers = request.headers;
  const payload: DeployProbePayload = {
    app: "pizzaos-client",
    environment: process.env.VERCEL_ENV,
    forwardedHost: headers.get("x-forwarded-host"),
    forwardedProto: headers.get("x-forwarded-proto"),
    host: headers.get("host"),
    reachedApp: true,
    region: process.env.VERCEL_REGION,
    timestamp: new Date().toISOString(),
    vercelUrl: process.env.VERCEL_URL
  };

  console.info("pizzaos-client deploy probe reached app", {
    forwardedHost: payload.forwardedHost,
    host: payload.host,
    region: payload.region
  });

  return Response.json(payload, {
    headers: {
      "cache-control": "no-store"
    }
  });
}
