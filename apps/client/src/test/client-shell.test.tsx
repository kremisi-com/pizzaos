import { getThemeClass } from "@pizzaos/brand";
import { getDemoStateStorageKey } from "@pizzaos/mock-data";
import { describe, expect, it } from "vitest";
import { createElement } from "react";
import { renderToString } from "react-dom/server";
import { ClientShell } from "../features/home/components/client-shell";

describe("client shell", () =>
{
  it("mounts with the client theme class", () =>
  {
    const markup = renderToString(createElement(ClientShell));

    expect(markup).toContain(getThemeClass("client"));
    expect(markup).toContain(getDemoStateStorageKey("client"));
    expect(markup).toContain("Reset demo");
  });
});
