import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import type { MenuDraft } from "@pizzaos/domain";
import { useState } from "react";
import { afterEach, describe, expect, it } from "vitest";
import { MenuDraftEditor } from "../features/catalog/components/menu-draft-editor";

afterEach(cleanup);

function SectionEditor() {
  const [draft, setDraft] = useState<MenuDraft>({
    id: "menu", name: "Menu", sections: [
      { id: "pizza", name: "Crea la tua pizza", description: "Scegli un impasto", productIds: [] }
    ], products: []
  });
  return <><MenuDraftEditor draft={draft} storeId="store" ingredients={[]}
    onChange={setDraft} onUpload={() => {}} />
    <output aria-label="Bozza">{JSON.stringify(draft)}</output></>;
}

describe("Editor sezioni menu", () => {
  it("modifica e svuota la descrizione direttamente nella bozza", () => {
    render(<SectionEditor />);
    expect(screen.queryByText("Impostazioni sezione")).not.toBeInTheDocument();
    const description = screen.getByRole("textbox", { name: "Descrizione" });
    expect(description).toBeVisible();
    fireEvent.change(description, { target: { value: "Scegli la ricetta" } });
    expect(screen.getByLabelText("Bozza")).toHaveTextContent('"description":"Scegli la ricetta"');
    fireEvent.change(description, { target: { value: "" } });
    expect(screen.getByLabelText("Bozza")).not.toHaveTextContent('"description"');
  });

  it("apre il titolo con il nome selezionato e termina con Invio o uscendo dal campo", () => {
    render(<SectionEditor />);
    expect(screen.queryByRole("textbox", { name: "Nome sezione 1" })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Modifica nome" }));
    const name = screen.getByRole("textbox", { name: "Nome sezione 1" });
    expect(name).toHaveFocus();
    expect((name as HTMLInputElement).selectionStart).toBe(0);
    expect((name as HTMLInputElement).selectionEnd).toBe("Crea la tua pizza".length);
    fireEvent.change(name, { target: { value: "Le nostre pizze" } });
    fireEvent.keyDown(name, { key: "Enter" });
    expect(screen.getByRole("heading", { name: "Le nostre pizze" })).toBeVisible();
    expect(screen.getByLabelText("Bozza")).toHaveTextContent('"name":"Le nostre pizze"');
    fireEvent.click(screen.getByRole("button", { name: "Modifica nome" }));
    const reopened = screen.getByRole("textbox", { name: "Nome sezione 1" });
    fireEvent.change(reopened, { target: { value: "" } });
    fireEvent.keyDown(reopened, { key: "Enter" });
    expect(reopened).toBeInvalid();
    expect(reopened).toBeInTheDocument();
    fireEvent.blur(reopened);
    expect(screen.getByRole("heading", { name: "Nuova sezione" })).toBeVisible();
  });
});
