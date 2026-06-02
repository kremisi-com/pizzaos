import { describe, expect, it } from "vitest";
import { createElement } from "react";
import { renderToString } from "react-dom/server";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach } from "vitest";
import { OrdersDashboard } from "@/features/orders/components/orders-dashboard";
import type { Order } from "@pizzaos/domain";

const MOCK_ORDERS: Order[] = [
  {
    id: "order-1",
    customerId: "cust-1",
    storeId: "store-1",
    status: "received",
    lines: [
      {
        productId: "product-1234",
        quantity: 2,
        unitPrice: { amountCents: 1000, currencyCode: "EUR" },
        notes: ""
      }
    ],
    subtotal: { amountCents: 2000, currencyCode: "EUR" },
    discountTotal: { amountCents: 0, currencyCode: "EUR" },
    deliveryFee: { amountCents: 0, currencyCode: "EUR" },
    total: { amountCents: 2000, currencyCode: "EUR" },
    createdAtIso: new Date().toISOString(),
    updatedAtIso: new Date().toISOString(),
    scheduledSlot: "19:00",
    demoOrderRef: "POC-1001"
  },
  {
    id: "order-2",
    customerId: "cust-2",
    storeId: "store-1",
    status: "out_for_delivery",
    lines: [
      {
        productId: "product-5678",
        quantity: 1,
        unitPrice: { amountCents: 1200, currencyCode: "EUR" },
        notes: ""
      }
    ],
    subtotal: { amountCents: 1200, currencyCode: "EUR" },
    discountTotal: { amountCents: 0, currencyCode: "EUR" },
    deliveryFee: { amountCents: 100, currencyCode: "EUR" },
    total: { amountCents: 1300, currencyCode: "EUR" },
    createdAtIso: new Date().toISOString(),
    updatedAtIso: new Date().toISOString(),
    scheduledSlot: "19:20",
    demoOrderRef: "POC-1002"
  }
];

const MOCK_PAGINATED_ORDERS: Order[] = Array.from({ length: 20 }, (_, index) => {
  const orderNumber = index + 1;
  const paddedOrderNumber = String(orderNumber).padStart(2, "0");

  return {
    ...MOCK_ORDERS[index % MOCK_ORDERS.length],
    id: `order-page-${paddedOrderNumber}`,
    customerId: `cust-page-${paddedOrderNumber}`,
    status: index % 3 === 0 ? "received" : "preparing",
    createdAtIso: `2026-06-02T12:${paddedOrderNumber}:00.000Z`,
    updatedAtIso: `2026-06-02T12:${paddedOrderNumber}:00.000Z`,
    demoOrderRef: `POC-${String(1000 + orderNumber)}`
  };
});

afterEach(() => {
  cleanup();
});

describe("OrdersDashboard", () => {
  it("renders orders and stats", () => {
    const markup = renderToString(
      createElement(OrdersDashboard, {
        orders: MOCK_ORDERS,
        lastUpdateIso: new Date().toISOString(),
        allProducts: [],
      })
    );

    expect(markup).toContain("Gestione ordini in tempo reale");
    expect(markup).toContain("Totali oggi");
    expect(markup).toContain("Da confermare");
    expect(markup).toContain("In consegna");
    expect(markup).toContain("/images/live-orders/writing.png");
    expect(markup).toContain("/images/live-orders/hourglass.png");
    expect(markup).toContain("/images/live-orders/chef.png");
    expect(markup).toContain("/images/live-orders/scooter.png");
    expect(markup).toContain("/images/live-orders/check.png");
    expect(markup).toContain("/images/live-orders/remove.png");
    expect(markup).toContain("/images/header/notification.png");
    expect(markup).toContain("/images/header/calendar.png");
    expect(markup).toContain("/images/order-actions/view.png");
    expect(markup).toContain("/images/order-actions/printer.png");
    expect(markup).toContain("/images/order-actions/more.png");
    expect(markup).toContain("Cerca ordine, cliente o telefono");
    expect(markup).toContain("Oggi (00:00 - 23:59)");
    expect(markup).toContain("ID ordine");
    expect(markup).toContain("Pagamento");
    expect(markup).toContain("Priorita");
    expect(markup).toContain("Prodotto");
    expect(markup).toContain("Rif. demo cliente:");
    expect(markup).toContain("POC-1001");
    expect(markup).toContain("Coda live cucina");
    expect(markup).toContain("Tempi medi oggi");
  });

  it("renders empty state when no orders", () => {
    const markup = renderToString(
      createElement(OrdersDashboard, {
        orders: [],
        lastUpdateIso: new Date().toISOString(),
        allProducts: [],
      })
    );

    expect(markup).toContain("Nessun ordine trovato");
  });

  it("opens the local calendar from the header date", () => {
    render(
      <OrdersDashboard
        orders={MOCK_ORDERS}
        lastUpdateIso="2026-06-02T08:00:00.000Z"
        allProducts={[]}
      />
    );

    expect(screen.queryByRole("dialog", { name: "Calendario ordini" })).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: /mar|giu|2026/i }));

    expect(screen.getByRole("dialog", { name: "Calendario ordini" })).toBeDefined();
    expect(screen.getByLabelText("Data ordini")).toHaveProperty("value", "2026-06-02");
  });

  it("opens the local calendar from the toolbar date filter", () => {
    render(
      <OrdersDashboard
        orders={MOCK_ORDERS}
        lastUpdateIso="2026-06-02T08:00:00.000Z"
        allProducts={[]}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "Filtro data ordini" }));

    expect(screen.getByRole("dialog", { name: "Calendario ordini" })).toBeDefined();
  });

  it("paginates orders ten rows at a time", () => {
    render(
      <OrdersDashboard
        orders={MOCK_PAGINATED_ORDERS}
        lastUpdateIso="2026-06-02T08:00:00.000Z"
        allProducts={[]}
      />
    );

    expect(screen.getByText("Mostra 1-10 di 20 ordini")).toBeDefined();
    expect(screen.getByRole("button", { name: "Pagina precedente" })).toHaveProperty("disabled", true);
    expect(screen.getByText("POC-1020")).toBeDefined();
    expect(screen.queryByText("POC-1010")).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Pagina successiva" }));

    expect(screen.getByText("Mostra 11-20 di 20 ordini")).toBeDefined();
    expect(screen.getByRole("button", { current: "page", name: "2" })).toBeDefined();
    expect(screen.getByRole("button", { name: "Pagina successiva" })).toHaveProperty("disabled", true);
    expect(screen.getByText("POC-1010")).toBeDefined();
    expect(screen.queryByText("POC-1020")).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Pagina precedente" }));

    expect(screen.getByText("Mostra 1-10 di 20 ordini")).toBeDefined();
  });
});
