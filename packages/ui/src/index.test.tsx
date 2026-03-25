import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import {
  Badge,
  Button,
  Card,
  DataList,
  Dialog,
  Input,
  ShellCard,
  StatusIndicator,
  Table,
  Tabs,
  Toast
} from "./index";

interface OrderRow
{
  readonly id: string;
  readonly status: string;
}

describe("@pizzaos/ui", () =>
{
  it("renders button variants", () =>
  {
    const markup = renderToStaticMarkup(createElement(Button, { variant: "secondary" }, "Conferma"));

    expect(markup).toContain("<button");
    expect(markup).toContain("Conferma");
  });

  it("renders labeled input with helper text", () =>
  {
    const markup = renderToStaticMarkup(
      createElement(Input, {
        inputId: "email",
        label: "Email",
        helperText: "Usiamo questa email per l'ordine",
        defaultValue: "demo@pizzaos.it"
      })
    );

    expect(markup).toContain("for=\"email\"");
    expect(markup).toContain("id=\"email-helper\"");
  });

  it("renders card and shell-card wrappers", () =>
  {
    const cardMarkup = renderToStaticMarkup(createElement(Card, { title: "Titolo" }, "Contenuto"));
    const shellMarkup = renderToStaticMarkup(createElement(ShellCard, { title: "Shell" }, "Layer"));

    expect(cardMarkup).toContain("<article");
    expect(shellMarkup).toContain("Shell");
  });

  it("renders dialog only when open", () =>
  {
    const closedMarkup = renderToStaticMarkup(
      createElement(Dialog, {
        open: false,
        dialogId: "dialog-checkout",
        title: "Checkout"
      }, "Corpo")
    );
    const openMarkup = renderToStaticMarkup(
      createElement(Dialog, {
        open: true,
        dialogId: "dialog-checkout",
        title: "Checkout",
        description: "Riepilogo ordine"
      }, "Corpo")
    );

    expect(closedMarkup).toBe("");
    expect(openMarkup).toContain("role=\"dialog\"");
    expect(openMarkup).toContain("aria-modal=\"true\"");
  });

  it("renders tabs with active tab selection", () =>
  {
    const markup = renderToStaticMarkup(
      createElement(Tabs, {
        activeTabId: "in-corso",
        tabs: [
          { id: "in-corso", label: "In corso", panel: "Ordini in corso" },
          { id: "completati", label: "Completati", panel: "Ordini completati" }
        ]
      })
    );

    expect(markup).toContain("role=\"tablist\"");
    expect(markup).toContain("aria-selected=\"true\"");
    expect(markup).toContain("Ordini in corso");
  });

  it("renders toast and badge", () =>
  {
    const toastMarkup = renderToStaticMarkup(
      createElement(Toast, {
        title: "Ordine inviato",
        message: "Riceverai un aggiornamento tra poco"
      })
    );
    const badgeMarkup = renderToStaticMarkup(createElement(Badge, { tone: "success" }, "Nuovo"));

    expect(toastMarkup).toContain("role=\"status\"");
    expect(toastMarkup).toContain("aria-live=\"polite\"");
    expect(badgeMarkup).toContain("Nuovo");
  });

  it("renders data list and table", () =>
  {
    const listMarkup = renderToStaticMarkup(
      createElement(DataList, {
        items: [
          { label: "Punto vendita", value: "Roma Centro" },
          { label: "Coperti", value: "54" }
        ]
      })
    );

    const tableMarkup = renderToStaticMarkup(
      createElement(Table<OrderRow>, {
        columns: [
          {
            id: "status",
            header: "Stato",
            renderCell: (row) => row.status
          }
        ],
        rows: [{ id: "ord-1", status: "preparing" }],
        getRowId: (row) => row.id
      })
    );

    expect(listMarkup).toContain("<dl");
    expect(listMarkup).toContain("Roma Centro");
    expect(tableMarkup).toContain("<table");
    expect(tableMarkup).toContain("preparing");
  });

  it("renders status indicator", () =>
  {
    const markup = renderToStaticMarkup(
      createElement(StatusIndicator, {
        tone: "active",
        label: "Operativo"
      })
    );

    expect(markup).toContain("data-tone=\"active\"");
    expect(markup).toContain("Operativo");
  });
});
