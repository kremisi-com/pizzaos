import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { BRAND_ASSETS, BRAND_PALETTE, getSurfaceThemeTokens, getThemeStyleVariables } from "@pizzaos/brand";
import { BrandLogo } from "@pizzaos/ui";
import { SignInScreen as AdminSignInScreen } from "../apps/admin/src/features/identity/components/sign-in-screen";
import { SignInScreen as ClientSignInScreen } from "../apps/client/src/features/identity/components/sign-in-screen";
import { OrderingCover } from "../apps/client/src/features/menu/components/ordering-cover";

afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

function contrast(first: string, second: string): number {
  function luminance(hex: string): number {
    expect(hex).toMatch(/^#[\da-f]{6}$/i);
    const channels = [1, 3, 5].map(offset => {
      const channel = parseInt(hex.slice(offset, offset + 2), 16) / 255;
      return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
    });
    return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
  }
  const values = [luminance(first), luminance(second)].sort((a, b) => b - a);
  return (values[0] + 0.05) / (values[1] + 0.05);
}

function markupDocument(markup: string): Document {
  return new DOMParser().parseFromString(markup, "text/html");
}

describe("official PizzaOS brand public contracts", () => {
  it("publishes the canonical palette and a readable action color", () => {
    expect(BRAND_PALETTE).toEqual({ sand: "#DDB785", orange: "#CF5430", navy: "#0A384F", action: "#B74424" });
  });

  for (const surface of ["admin", "client"] as const) {
    it(`${surface} uses warm brand tokens, Poppins and accessible primary actions`, () => {
      const tokens = getSurfaceThemeTokens(surface);
      expect(tokens.color.foreground.toUpperCase()).toBe("#0A384F");
      expect(tokens.color.primary.toUpperCase()).toBe("#B74424");
      expect(tokens.color.primaryForeground.toUpperCase()).toBe("#FFFFFF");
      expect(contrast(tokens.color.primary, tokens.color.primaryForeground)).toBeGreaterThanOrEqual(4.5);
      expect(tokens.type.family.split(",")[0].trim().replace(/["']/g, "")).toBe("Poppins");
      expect(tokens.radius.card).toBe(surface === "admin" ? "14px" : "24px");
    });
  }

  it("preserves the established landing colors", () => {
    const landing = getSurfaceThemeTokens("landing");
    expect(landing.color.primary).toBe("#0A384F");
    expect(landing.color.background).toBe("#FAF7F1");
    expect(landing.color.foreground).toBe("#0A384F");
    expect(landing.color.border).toBe("#E9DED0");
    expect(getThemeStyleVariables("landing")["--pizzaos-color-primary-rgb"]).toBe("10, 56, 79");
  });

  it("exposes brand and semantic CSS variables on every surface", () => {
    for (const surface of ["landing", "admin", "client"] as const) {
      const variables = getThemeStyleVariables(surface);
      expect(variables["--pizzaos-brand-sand"]).toBe("#DDB785");
      expect(variables["--pizzaos-brand-orange"]).toBe("#CF5430");
      expect(variables["--pizzaos-brand-navy"]).toBe("#0A384F");
      for (const name of ["primary-hover", "primary-soft", "surface-muted", "success", "success-soft", "success-foreground", "warning", "warning-soft", "warning-foreground", "critical", "critical-soft", "critical-foreground", "info", "info-soft", "info-foreground", "focus"]) {
        expect(variables[`--pizzaos-color-${name}`], `${surface}: ${name}`).toBeTruthy();
      }
      expect(variables["--pizzaos-brand-pattern"]).toMatch(/^url\(/);
    }
    const admin = getThemeStyleVariables("admin");
    const client = getThemeStyleVariables("client");
    for (const tone of ["success", "warning", "critical", "info"]) {
      expect(admin[`--pizzaos-color-${tone}`]).toBe(client[`--pizzaos-color-${tone}`]);
    }
    expect(admin["--pizzaos-color-critical"]).not.toBe(admin["--pizzaos-color-primary"]);
  });

  it("ships every logo variant, icon and pattern as a self-contained valid SVG", () => {
    const names = ["logo", "logoWhite", "logoBlack", "vertical", "verticalWhite", "verticalBlack", "wordmark", "wordmarkWhite", "wordmarkBlack", "mark", "markWhite", "markBlack", "icon", "pattern"] as const;
    for (const name of names) {
      const asset = BRAND_ASSETS[name];
      expect(asset, name).toMatch(/^data:image\/svg\+xml[;,]/);
      const comma = asset.indexOf(",");
      const source = asset.slice(0, comma).includes(";base64") ? atob(asset.slice(comma + 1)) : decodeURIComponent(asset.slice(comma + 1));
      const document = new DOMParser().parseFromString(source, "image/svg+xml");
      expect(document.querySelector("parsererror"), name).toBeNull();
      expect(document.documentElement.localName, name).toBe("svg");
      expect(document.documentElement.getAttribute("viewBox"), name).toBeTruthy();
      expect(document.querySelector("path, polygon, rect, circle, ellipse, line, polyline, use"), name).not.toBeNull();
      expect(document.querySelector("text, script, foreignObject"), name).toBeNull();
      for (const element of document.querySelectorAll("[href], [xlink\\:href]")) {
        const href = element.getAttribute("href") ?? element.getAttribute("xlink:href") ?? "";
        expect(href, name).toMatch(/^(#|data:)/);
      }
    }
  });

  it("server-renders the supplied logo with an accessible name and dimensions", () => {
    const document = markupDocument(renderToStaticMarkup(createElement(BrandLogo, {
      src: BRAND_ASSETS.logo, width: 180, height: 60, className: "brand-test"
    })));
    const image = document.querySelector("img");
    expect(image?.getAttribute("alt")).toBe("PizzaOS");
    expect(image?.getAttribute("src")).toBe(BRAND_ASSETS.logo);
    expect(image?.getAttribute("width")).toBe("180");
    expect(image?.getAttribute("height")).toBe("60");
    expect(image?.classList.contains("brand-test")).toBe(true);
  });

  it("keeps decorative logos out of the accessible naming tree", () => {
    const document = markupDocument(renderToStaticMarkup(createElement(BrandLogo, { src: BRAND_ASSETS.mark, decorative: true })));
    const image = document.querySelector("img");
    expect(image?.getAttribute("alt")).toBe("");
    expect(image?.getAttribute("aria-label")).toBeNull();
  });

  for (const area of ["restaurant", "rider", "client"] as const) {
    it(`shows the official accessible logo on ${area} sign-in`, () => {
      const markup = area === "client"
        ? renderToStaticMarkup(createElement(ClientSignInScreen, { returnTo: "/ordina" }))
        : renderToStaticMarkup(createElement(AdminSignInScreen, area === "rider" ? { returnTo: "/rider", area: "rider" } : { returnTo: "/operazioni" }));
      const document = markupDocument(markup);
      const logo = document.querySelector('img[alt="PizzaOS"]');
      expect(logo).not.toBeNull();
      expect(Object.values(BRAND_ASSETS)).toContain(logo?.getAttribute("src"));
    });
  }

  it("shows an accessible official logo on the shared ordering cover without required props", () => {
    const document = markupDocument(renderToStaticMarkup(createElement(OrderingCover)));
    const logo = document.querySelector('img[alt="PizzaOS"]');
    expect(logo).not.toBeNull();
    expect(Object.values(BRAND_ASSETS)).toContain(logo?.getAttribute("src"));
    expect(logo?.closest('[aria-hidden="true"]')).toBeNull();
  });

  for (const surface of ["admin", "client"] as const) {
    it(`keeps the official accessible logo when ${surface} offers demo access`, async () => {
      const fetch = vi.fn(async () => Response.json({ enabled: true, active: false, csrfToken: "brand-test-csrf" }));
      vi.stubGlobal("fetch", fetch);
      render(surface === "admin"
        ? createElement(AdminSignInScreen, { returnTo: "/operazioni" })
        : createElement(ClientSignInScreen, { returnTo: "/ordina" }));
      await waitFor(() => expect(fetch).toHaveBeenCalled());
      fireEvent.change(screen.getByRole("textbox", { name: /email/i }), { target: { value: "poc@pizzaos.app" } });
      expect(await screen.findByLabelText(/password/i)).toBeTruthy();
      const logo = screen.getByRole("img", { name: "PizzaOS" });
      expect(Object.values(BRAND_ASSETS)).toContain(logo.getAttribute("src"));
    });
  }
});
