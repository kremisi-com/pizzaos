import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const BRAND_ASSET_DIR = resolve(process.cwd(), "public/brand");

function readBrandAsset(fileName: string): string {
  return readFileSync(resolve(BRAND_ASSET_DIR, fileName), "utf8");
}

describe("landing logo assets", () => {
  it("uses the real PizzaOS horizontal color logo for light surfaces", () => {
    const logo = readBrandAsset("logo-horizontal-color.svg");

    expect(logo).toContain('viewBox="0 0 468.68 116.88"');
    expect(logo.toLowerCase()).toContain("#ddb785");
    expect(logo.toLowerCase()).toContain("#cf5430");
  });

  it("keeps a real white horizontal logo for the navy footer", () => {
    const logo = readBrandAsset("logo-horizontal-white.svg");

    expect(logo).toContain('viewBox="0 0 468.68 116.88"');
    expect(logo.toLowerCase()).toContain("fill: #fff");
    expect(logo.toLowerCase()).not.toContain("#111111");
  });

  it("uses the real circular pictogram and pattern assets", () => {
    const icon = readBrandAsset("icon-color.svg");
    const pictogram = readBrandAsset("pictogram-color.svg");
    const pattern = readBrandAsset("pattern.svg");

    expect(icon.toLowerCase()).toContain("#ddb785");
    expect(icon.toLowerCase()).toContain("#cf5430");
    expect(pictogram.toLowerCase()).toContain("#ddb785");
    expect(pictogram.toLowerCase()).toContain("#cf5430");
    expect(pattern).toContain("Nuovo_pattern");
  });
});
