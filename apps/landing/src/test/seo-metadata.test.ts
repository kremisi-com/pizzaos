import { describe, expect, it } from "vitest";
import {
  createLandingManifest,
  createLandingRobots,
  createLandingSitemap,
  landingMetadata,
  landingSeoDescription,
  landingViewport,
} from "../../app/seo";

describe("landing seo metadata", () => {
  it("defines crawlable Italian product metadata with social previews", () => {
    expect(landingMetadata.applicationName).toBe("PizzaOS");
    expect(landingMetadata.description).toBe(landingSeoDescription);
    expect(landingMetadata.alternates?.canonical).toBe("/");
    expect(landingMetadata.robots).toMatchObject({
      index: true,
      follow: true,
    });
    expect(JSON.stringify(landingMetadata.keywords)).toContain(
      "software pizzeria",
    );
    expect(JSON.stringify(landingMetadata.icons)).toContain(
      "/favicon/favicon-32x32.png",
    );
    expect(landingMetadata.openGraph).toMatchObject({
      type: "website",
      locale: "it_IT",
      siteName: "PizzaOS",
    });
    expect(JSON.stringify(landingMetadata.twitter)).toContain(
      "summary_large_image",
    );
  });

  it("exposes viewport, robots, sitemap, and manifest metadata routes", () => {
    const robots = createLandingRobots();
    const sitemap = createLandingSitemap();
    const manifest = createLandingManifest();

    expect(landingViewport).toMatchObject({
      width: "device-width",
      initialScale: 1,
      themeColor: "#FAF8F6",
    });
    expect(robots).toMatchObject({
      rules: {
        userAgent: "*",
        allow: "/",
      },
      sitemap: "https://pizzaos.it/sitemap.xml",
    });
    expect(sitemap).toHaveLength(1);
    expect(sitemap[0]).toMatchObject({
      url: "https://pizzaos.it/",
      changeFrequency: "weekly",
      priority: 1,
    });
    expect(manifest).toMatchObject({
      name: "PizzaOS",
      short_name: "PizzaOS",
      lang: "it",
      start_url: "/",
      theme_color: "#F43A26",
    });
    expect(JSON.stringify(manifest.icons)).toContain("/favicon/icon-512.png");
  });
});
