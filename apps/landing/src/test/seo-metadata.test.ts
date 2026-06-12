import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  createLandingJsonLd,
  createLandingManifest,
  createLandingRobots,
  createLandingSitemap,
  landingMetadata,
  landingSeoDescription,
  landingSeoTitle,
  landingSocialImageUrl,
  landingViewport,
} from "../../app/seo";

describe("landing seo metadata", () => {
  it("defines crawlable Italian product metadata with social previews", () => {
    expect(landingMetadata.applicationName).toBe("PizzaOS");
    expect(landingMetadata.title).toMatchObject({
      default: landingSeoTitle,
    });
    expect(landingMetadata.description).toBe(landingSeoDescription);
    expect(landingMetadata.alternates?.canonical).toBe("/");
    expect(landingMetadata.alternates?.languages).toMatchObject({
      "it-IT": "/",
    });
    expect(landingMetadata.robots).toMatchObject({
      index: true,
      follow: true,
    });
    expect(JSON.stringify(landingMetadata.keywords)).toContain(
      "software pizzeria",
    );
    expect(JSON.stringify(landingMetadata.icons)).toContain(
      "/brand/icon-color.svg",
    );
    expect(landingMetadata.openGraph).toMatchObject({
      type: "website",
      locale: "it_IT",
      siteName: "PizzaOS",
    });
    expect(JSON.stringify(landingMetadata.openGraph)).toContain(
      "/social/og-image.png",
    );
    expect(JSON.stringify(landingMetadata.twitter)).toContain(
      "summary_large_image",
    );
    expect(JSON.stringify(landingMetadata.twitter)).toContain(
      landingSocialImageUrl,
    );
    expect(landingMetadata.other).toMatchObject({
      "og:image:secure_url": landingSocialImageUrl,
      "og:image:type": "image/png",
    });
  });

  it("exposes viewport, robots, sitemap, and manifest metadata routes", () => {
    const robots = createLandingRobots();
    const sitemap = createLandingSitemap();
    const manifest = createLandingManifest();

    expect(landingViewport).toMatchObject({
      width: "device-width",
      initialScale: 1,
      themeColor: "#0A384F",
    });
    expect(robots).toMatchObject({
      rules: {
        userAgent: "*",
        allow: "/",
      },
      sitemap: "https://www.pizzaos.app/sitemap.xml",
    });
    expect(sitemap).toHaveLength(1);
    expect(sitemap[0]).toMatchObject({
      url: "https://www.pizzaos.app/",
      changeFrequency: "weekly",
      priority: 1,
    });
    expect(manifest).toMatchObject({
      name: "PizzaOS",
      short_name: "PizzaOS",
      lang: "it",
      start_url: "/",
      theme_color: "#0A384F",
    });
    expect(JSON.stringify(manifest.icons)).toContain("/favicon/icon-512.png");
  });

  it("ships a WhatsApp-friendly social sharing image", () => {
    const image = readFileSync(
      join(process.cwd(), "public/social/og-image.png"),
    );

    expect(image.subarray(1, 4).toString("ascii")).toBe("PNG");
    expect(image.readUInt32BE(16)).toBe(1200);
    expect(image.readUInt32BE(20)).toBe(630);
    expect(image.byteLength).toBeLessThan(300_000);
  });

  it("defines structured data for search engines", () => {
    const jsonLd = createLandingJsonLd();

    expect(jsonLd).toHaveLength(2);
    expect(jsonLd[0]).toMatchObject({
      "@type": "Organization",
      name: "PizzaOS",
      url: "https://www.pizzaos.app/",
    });
    expect(jsonLd[1]).toMatchObject({
      "@type": "SoftwareApplication",
      name: "PizzaOS",
      inLanguage: "it-IT",
      image: landingSocialImageUrl,
    });
  });
});
