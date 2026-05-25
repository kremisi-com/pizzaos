import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const COMPONENTS_PATH = join(
  process.cwd(),
  "src/features/home/components",
);

function readComponentCss(fileName: string): string {
  return readFileSync(join(COMPONENTS_PATH, fileName), "utf8");
}

describe("landing mobile layout css", () => {
  it("keeps complete-platform pillar headers aligned on mobile", () => {
    const css = readComponentCss("complete-platform-section.module.css");

    expect(css).toContain("scroll-margin-top: 104px");
    expect(css).toContain("grid-template-columns: 56px minmax(0, 1fr)");
    expect(css).not.toContain("grid-template-columns: 48px 56px minmax");
  });

  it("keeps mobile comparison cells compact and readable", () => {
    const css = readComponentCss("margin-comparison-section.module.css");

    expect(css).toContain("scroll-margin-top: 104px");
    expect(css).toContain(
      "grid-template-columns: minmax(84px, 0.34fr) 30px minmax(0, 1fr)",
    );
    expect(css).toContain("justify-content: flex-start");
  });

  it("keeps FAQ contact cards in the mobile column", () => {
    const css = readComponentCss("faq-section.module.css");

    expect(css).toContain("scroll-margin-top: 104px");
    expect(css).toContain("grid-template-columns: repeat(2, minmax(0, 1fr))");
    expect(css).toContain("grid-template-columns: 46px minmax(0, 1fr)");
    expect(css).not.toContain("grid-column: 2");
  });
});
