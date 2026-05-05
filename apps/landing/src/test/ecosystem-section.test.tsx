import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { beforeEach, describe, expect, it } from "vitest";
import { EcosystemSection } from "../features/home/components/ecosystem-section";

const reactActEnvironment = globalThis as typeof globalThis & {
  IS_REACT_ACT_ENVIRONMENT?: boolean;
};

reactActEnvironment.IS_REACT_ACT_ENVIRONMENT = true;

let root: Root | null = null;
let host: HTMLDivElement | null = null;

function renderSection(): void {
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);

  act(() => {
    root?.render(<EcosystemSection />);
  });
}

function clickElement(element: Element): void {
  act(() => {
    element.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  });
}

function getElementByRole(role: string, name: string): HTMLElement {
  const elements = Array.from(document.querySelectorAll<HTMLElement>(`[role="${role}"]`));
  const element = elements.find((candidate) => candidate.textContent === name);

  expect(element).toBeDefined();

  return element as HTMLElement;
}

function queryHeadingByText(name: string): HTMLHeadingElement | null {
  const headings = Array.from(document.querySelectorAll<HTMLHeadingElement>("h2, h3"));

  return headings.find((heading) => heading.textContent === name) ?? null;
}

function getHeadingByText(name: string): HTMLHeadingElement {
  const heading = queryHeadingByText(name);

  expect(heading).not.toBeNull();

  return heading as HTMLHeadingElement;
}

function getCardByHeading(name: string): HTMLElement {
  const heading = getHeadingByText(name);
  const card = heading.closest("article");

  expect(card).not.toBeNull();

  return card as HTMLElement;
}

describe("landing ecosystem section", () => {
  beforeEach(() => {
    act(() => {
      root?.unmount();
    });
    host?.remove();
    root = null;
    host = null;
    document.body.replaceChildren();
  });

  it("filters feature cards by category without a page reload", () => {
    renderSection();

    expect(getHeadingByText("Ordini digitali")).toBeDefined();
    expect(getHeadingByText("Analytics AI")).toBeDefined();

    clickElement(getElementByRole("tab", "AI"));

    expect(getElementByRole("tab", "AI").getAttribute("aria-selected")).toBe(
      "true",
    );
    expect(getHeadingByText("Analytics AI")).toBeDefined();
    expect(queryHeadingByText("Ordini digitali")).toBeNull();

    clickElement(getElementByRole("tab", "Tutto"));

    expect(getHeadingByText("Ordini digitali")).toBeDefined();
  });

  it("opens one details accordion at a time", () => {
    renderSection();

    const ordersCard = getCardByHeading("Ordini digitali");
    const pizzaBuilderCard = getCardByHeading("Pizza builder");
    const ordersButton = ordersCard.querySelector<HTMLButtonElement>("button[aria-expanded]");
    const pizzaBuilderButton =
      pizzaBuilderCard.querySelector<HTMLButtonElement>("button[aria-expanded]");

    expect(ordersButton).not.toBeNull();
    expect(pizzaBuilderButton).not.toBeNull();

    expect(ordersButton?.getAttribute("aria-expanded")).toBe("false");

    clickElement(ordersButton as HTMLButtonElement);

    expect(ordersButton?.getAttribute("aria-expanded")).toBe("true");
    expect(ordersButton?.textContent).toContain("Nascondi dettagli");

    clickElement(pizzaBuilderButton as HTMLButtonElement);

    expect(ordersButton?.getAttribute("aria-expanded")).toBe("false");
    expect(pizzaBuilderButton?.getAttribute("aria-expanded")).toBe("true");
  });
});
