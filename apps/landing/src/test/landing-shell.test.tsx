import { getThemeClass } from "@pizzaos/brand";
import { describe, expect, it } from "vitest";
import { createElement } from "react";
import { renderToString } from "react-dom/server";
import { LandingShell } from "../features/home/components/landing-shell";

describe("landing shell", () =>
{
  it("mounts with the landing theme class", () =>
  {
    const markup = renderToString(createElement(LandingShell));

    expect(markup).toContain(getThemeClass("landing"));
  });
});
