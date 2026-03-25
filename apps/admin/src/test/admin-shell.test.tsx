import { getThemeClass } from "@pizzaos/brand";
import { getDemoStateStorageKey } from "@pizzaos/mock-data";
import { describe, expect, it } from "vitest";
import { createElement } from "react";
import { renderToString } from "react-dom/server";
import { AdminShell } from "../features/home/components/admin-shell";

describe("admin shell", () =>
{
  it("mounts with the admin theme class", () =>
  {
    const markup = renderToString(createElement(AdminShell));

    expect(markup).toContain(getThemeClass("admin"));
    expect(markup).toContain(getDemoStateStorageKey("admin"));
    expect(markup).toContain("Reset demo");
  });
});
