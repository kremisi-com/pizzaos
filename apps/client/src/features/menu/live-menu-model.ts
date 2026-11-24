import { resolveMenuComposition } from "@pizzaos/domain";
import type { IndividualLine, IndividualProduct, MenuSelection } from "@pizzaos/domain";

const euro = new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR" });
export const menuMoney = (cents: number) => euro.format(cents / 100);

export function lineChoiceLabels(product: IndividualProduct | undefined, line: IndividualLine): string[] {
  const choices = line.selections ?? line.optionIds.map(optionId => ({ optionId, quantity: 1 }));
  return choices.map(({ optionId, quantity }) => {
    const name = product?.options.find(option => option.id === optionId)?.name ?? "Scelta non più disponibile";
    return quantity > 1 ? `${quantity} × ${name}` : name;
  });
}

export function lineIssue(product: IndividualProduct | undefined, line: IndividualLine): string | undefined {
  if (!product) return "Prodotto non più nel menu";
  if (!product.available) return "Prodotto esaurito";
  if (product.maxAvailable !== undefined && line.quantity > product.maxAvailable) {
    return `Disponibili al massimo ${product.maxAvailable} unità. Riduci la quantità.`;
  }
  if (product.groups?.length) {
    if (!resolveMenuComposition(product, menuSelections(line)).valid) return "Controlla le scelte: alcune potrebbero essere cambiate.";
  } else if (line.selections?.length || line.optionIds.some(id => !product.options.some(option => option.id === id && option.available !== false))) {
    return "Controlla le scelte: alcune potrebbero essere cambiate.";
  }
}

export function menuSelections(line: IndividualLine): MenuSelection[] {
  return line.selections ?? line.optionIds.map(optionId => ({ optionId, quantity: 1 }));
}

export function appendMenuLine(lines: IndividualLine[], added: IndividualLine): IndividualLine[] {
  const key = (line: IndividualLine) => JSON.stringify([
    line.productId, line.notes, [...line.optionIds].sort(),
    line.selections?.map(({ optionId, quantity }) => [optionId, quantity]).sort()
  ]);
  const addedKey = key(added);
  const index = lines.findIndex(line => key(line) === addedKey && line.quantity + added.quantity <= 100);
  return index < 0 ? [...lines, added] : lines.map((line, current) => current === index
    ? { ...line, quantity: line.quantity + added.quantity } : line);
}
