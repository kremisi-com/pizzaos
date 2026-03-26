import type {
  Menu,
  Product,
  SlotAvailability,
  SlotAvailabilityStatus
} from "@pizzaos/domain";

export interface ProductAvailabilityViewModel
{
  readonly isOrderable: boolean;
  readonly label: string;
  readonly tone: "success" | "warning" | "critical";
}

export interface SlotAvailabilityViewModel
{
  readonly label: string;
  readonly meta: string;
  readonly isSelectable: boolean;
  readonly tone: "success" | "warning" | "critical";
}

export interface MenuSectionViewModel
{
  readonly id: string;
  readonly name: string;
  readonly products: readonly Product[];
  readonly summary: string;
}

export function deriveMenuSections(menu: Menu, products: readonly Product[]): readonly MenuSectionViewModel[]
{
  return menu.sections.map((section) =>
  {
    const sectionProducts = section.productRefs
      .map((productRef) => products.find((product) => product.id === productRef.productId))
      .filter((product): product is Product => Boolean(product));

    const availableCount = sectionProducts.filter((product) => product.status === "available").length;
    const soldOutCount = sectionProducts.filter((product) => product.status === "sold_out").length;
    const unavailableCount = sectionProducts.filter((product) => product.status === "unavailable").length;
    const summaryParts = [`${availableCount} disponibili`];

    if (soldOutCount > 0)
    {
      summaryParts.push(`${soldOutCount} esaurite`);
    }

    if (unavailableCount > 0)
    {
      summaryParts.push(`${unavailableCount} non ordinabili`);
    }

    return {
      id: section.id,
      name: section.name,
      products: sectionProducts,
      summary: summaryParts.join(" · ")
    };
  });
}

export function deriveProductAvailability(product: Product): ProductAvailabilityViewModel
{
  if (product.status === "sold_out")
  {
    return {
      isOrderable: false,
      label: "Esaurita ora",
      tone: "critical"
    };
  }

  if (product.status === "unavailable")
  {
    return {
      isOrderable: false,
      label: "Non disponibile",
      tone: "warning"
    };
  }

  return {
    isOrderable: true,
    label: "Disponibile",
    tone: "success"
  };
}

export function formatSlotLabel(slot: SlotAvailability): string
{
  return `${slot.label} · ${slot.etaMinutes} min`;
}

export function deriveSlotAvailability(slot: SlotAvailability): SlotAvailabilityViewModel
{
  return {
    label: getSlotStatusLabel(slot.status),
    meta: formatSlotLabel(slot),
    isSelectable: slot.status !== "sold_out",
    tone: getSlotTone(slot.status)
  };
}

function getSlotStatusLabel(status: SlotAvailabilityStatus): string
{
  if (status === "limited")
  {
    return "Quasi pieno";
  }

  if (status === "sold_out")
  {
    return "Esaurito";
  }

  return "Disponibile";
}

function getSlotTone(status: SlotAvailabilityStatus): "success" | "warning" | "critical"
{
  if (status === "limited")
  {
    return "warning";
  }

  if (status === "sold_out")
  {
    return "critical";
  }

  return "success";
}
