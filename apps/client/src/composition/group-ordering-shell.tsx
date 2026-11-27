"use client";

import { useEffect, useMemo, useState } from "react";
import { PersistentGroupScreen } from "../features/group-order/components/persistent-group-screen";
import { createGroupOrderingApi } from "./api/group-ordering-api";
import { createIndividualApi } from "./api/individual-api";
import { createFoodPreferencesApi } from "./api/food-preferences-api";
import { createPromotionsApi } from "./api/promotions-api";
import type { GroupSnapshot } from "@pizzaos/domain";
import { openSharedCart, suspendSharedCart } from "./shared-cart-bootstrap";

export function GroupOrderingShell({ groupId, storefront }: { groupId?: string; storefront?: boolean }) {
  const api = useMemo(() => createGroupOrderingApi(), []);
  const individualApi = useMemo(() => createIndividualApi(), []);
  const preferencesApi = useMemo(() => createFoodPreferencesApi(), []);
  const promotionsApi = useMemo(() => createPromotionsApi(), []);
  const [invitation, setInvitation] = useState<{ token?: string; group: GroupSnapshot } | null>(null);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let active = true;
    const token = new URLSearchParams(window.location.hash.slice(1)).get("invito") ?? undefined;
    setError("");
    void openSharedCart(api, individualApi, groupId, token).then(group => {
      if (!active) return;
      setInvitation({ token, group });
      window.history.replaceState(null, "", `/ordina/gruppo/${encodeURIComponent(group.id)}`);
    }).catch(failure => { if (active) setError(failure instanceof Error ? failure.message : "Non è stato possibile aprire il gruppo."); });
    return () => { active = false; };
  }, [api, individualApi, groupId, attempt]);
  if (error) return <div role="alert"><p>{error}</p><button type="button" onClick={() => setAttempt(value => value + 1)}>Riprova</button></div>;
  if (!invitation) return <p role="status">Caricamento del gruppo…</p>;
  return <PersistentGroupScreen api={api} individualApi={individualApi} promotionsApi={promotionsApi} preferencesApi={preferencesApi} groupId={invitation.group.id} initialGroup={invitation.group} inviteToken={invitation.token} storefront={storefront} onUseIndividual={group => suspendSharedCart(api, group)} />;
}
