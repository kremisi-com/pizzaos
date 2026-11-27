"use client";

import type { IndividualApi, IndividualOrder } from "@pizzaos/domain";
import { useMemo } from "react";
import { OperationalOrdersScreen } from "../features/orders";
import { IndividualAdditions } from "../features/individual-ordering";
import { useMenuPreferences } from "../features/menu";
import { createIndividualApi } from "./api/individual-api";
import { createFoodPreferencesApi } from "./api/food-preferences-api";
import { useCustomerOrderUpdates } from "./use-customer-order-updates";
import { reorderCustomerOrder } from "./reorder-customer-order";

function CustomerOrderAdditions({ api, order, onChanged }: { api: IndividualApi; order: IndividualOrder; onChanged: () => Promise<void> }) {
  const preferencesApi = useMemo(() => createFoodPreferencesApi(), []);
  const preferences = useMenuPreferences(preferencesApi, order.customerId);
  return <IndividualAdditions api={api} order={order} avoid={preferences.avoid} onChanged={onChanged} />;
}

export function CustomerOrdersShell() {
  const api = useMemo(() => createIndividualApi(), []);
  const updates = useCustomerOrderUpdates(api);
  return <OperationalOrdersScreen api={api} {...updates} onReorder={order => reorderCustomerOrder(api, localStorage, order)}
    renderAdditions={(order, onChanged) => <CustomerOrderAdditions api={api} order={order} onChanged={onChanged} />} />;
}
