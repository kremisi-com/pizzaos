import { getThemeClass } from "@pizzaos/brand";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import RootLayout from "../../app/layout";

vi.mock("next/navigation", () => ({
  usePathname: () => "/",
  useRouter: () => ({
    push: vi.fn()
  })
}));

describe("client root layout", () =>
{
  it("renders page content and navigation inside the desktop phone frame", () =>
  {
    const markup = renderToStaticMarkup(
      <RootLayout>
        <section>Contenuto client</section>
      </RootLayout>
    );

    expect(markup).toContain(getThemeClass("client"));
    expect(markup).toContain("data-testid=\"client-phone-frame\"");
    expect(markup).toContain("Contenuto client");
    expect(markup).toContain("Carrello");
  });
});
