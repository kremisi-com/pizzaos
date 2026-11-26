import type { MenuComposition } from "@pizzaos/domain";
import { menuMoney } from "../live-menu-model";

export function MealCompositionDetails({ composition }: { composition: MenuComposition | undefined }) {
  return <>{composition?.mealSteps?.map(step => <span key={step.stepId} style={{ display: "block" }}>
    {step.name}: {step.productName}{step.priceCents !== 0 && ` (${step.priceCents > 0 ? "+" : ""}${menuMoney(step.priceCents)})`}
    {step.composition.choices.length > 0 && <small style={{ display: "block" }}>{step.composition.choices.map(choice => choice.name).join(", ")}</small>}
    {step.composition.ingredients.length > 0 && <small style={{ display: "block" }}>{step.composition.ingredients.join(", ")}</small>}
    {step.notes && <small style={{ display: "block" }}>Note cucina: {step.notes}</small>}
  </span>)}</>;
}
