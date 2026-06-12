import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { FaqSection } from "../features/home/components/faq-section";

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
    root?.render(<FaqSection />);
  });
}

function getInputByLabel(labelText: string): HTMLInputElement {
  const label = Array.from(document.querySelectorAll("label")).find(
    (candidate) => candidate.textContent === labelText,
  );

  expect(label).toBeDefined();

  const input = document.getElementById(
    (label as HTMLLabelElement).htmlFor,
  ) as HTMLInputElement | null;

  expect(input).not.toBeNull();

  return input as HTMLInputElement;
}

function getTextareaByLabel(labelText: string): HTMLTextAreaElement {
  const label = Array.from(document.querySelectorAll("label")).find(
    (candidate) => candidate.textContent === labelText,
  );

  expect(label).toBeDefined();

  const textarea = document.getElementById(
    (label as HTMLLabelElement).htmlFor,
  ) as HTMLTextAreaElement | null;

  expect(textarea).not.toBeNull();

  return textarea as HTMLTextAreaElement;
}

function changeField(
  field: HTMLInputElement | HTMLTextAreaElement,
  value: string,
): void {
  const fieldPrototype =
    field instanceof HTMLTextAreaElement
      ? HTMLTextAreaElement.prototype
      : HTMLInputElement.prototype;
  const valueSetter = Object.getOwnPropertyDescriptor(
    fieldPrototype,
    "value",
  )?.set;

  act(() => {
    valueSetter?.call(field, value);
    field.dispatchEvent(new Event("input", { bubbles: true }));
  });
}

async function submitContactForm(): Promise<void> {
  const form = document.querySelector("form");

  expect(form).not.toBeNull();

  await act(async () => {
    form?.dispatchEvent(
      new SubmitEvent("submit", { bubbles: true, cancelable: true }),
    );
  });
}

describe("landing contact form", () => {
  beforeEach(() => {
    act(() => {
      root?.unmount();
    });
    host?.remove();
    root = null;
    host = null;
    document.body.replaceChildren();
    vi.restoreAllMocks();
  });

  it("does not submit when email or phone is empty", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");

    renderSection();

    await submitContactForm();

    expect(fetchSpy).not.toHaveBeenCalled();
    expect(document.body.textContent).toContain("Inserisci email o telefono");
  });

  it("submits a contact request to the demo request route", async () => {
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(
        new Response(JSON.stringify({ success: true }), { status: 200 }),
      );

    renderSection();
    changeField(getInputByLabel("Email o telefono"), "+39 333 123 4567");
    changeField(getInputByLabel("Nome completo"), "Mario Rossi");
    changeField(
      getTextareaByLabel("Messaggio"),
      "Vorrei maggiori informazioni.",
    );

    await submitContactForm();

    expect(fetchSpy).toHaveBeenCalledWith("/api/demo-request", {
      method: "POST",
      body: expect.any(URLSearchParams),
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
    });

    const [, init] = fetchSpy.mock.calls[0] ?? [];
    const body = init?.body as URLSearchParams;

    expect([...body.entries()]).toEqual([
      ["requestType", "contact"],
      ["emailOrPhone", "+39 333 123 4567"],
      ["name", "Mario Rossi"],
      ["message", "Vorrei maggiori informazioni."],
    ]);
    expect(document.body.textContent).toContain(
      "Messaggio inviato. Ti ricontatteremo al piu presto.",
    );
  });

  it("shows backend errors returned by the route", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          success: false,
          error: "Errore invio dal server",
        }),
        { status: 400 },
      ),
    );

    renderSection();
    changeField(getInputByLabel("Email o telefono"), "mario@pizzeria.it");

    await submitContactForm();

    expect(document.body.textContent).toContain("Errore invio dal server");
  });
});
