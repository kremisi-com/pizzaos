import { describe, expect, it } from "vitest";
import { GET } from "../../app/api/deploy-probe/route";

describe("deploy probe route", () =>
{
  it("reports the host metadata when a request reaches the client app", async () =>
  {
    const request = new Request("https://client.pizzaos.app/api/deploy-probe", {
      headers: {
        host: "client.pizzaos.app",
        "x-forwarded-host": "client.pizzaos.app",
        "x-forwarded-proto": "https"
      }
    });

    const response = GET(request);
    const payload = await response.json();

    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(payload).toMatchObject({
      app: "pizzaos-client",
      forwardedHost: "client.pizzaos.app",
      forwardedProto: "https",
      host: "client.pizzaos.app",
      reachedApp: true
    });
    expect(typeof payload.timestamp).toBe("string");
  });
});
