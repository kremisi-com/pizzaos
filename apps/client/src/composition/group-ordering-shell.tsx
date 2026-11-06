"use client";

import { useEffect, useMemo, useState } from "react";
import { PersistentGroupScreen } from "../features/group-order/components/persistent-group-screen";
import { createGroupOrderingApi } from "./api/group-ordering-api";
import { createIndividualApi } from "./api/individual-api";
import { createPromotionsApi } from "./api/promotions-api";

export function GroupOrderingShell({ groupId }: { groupId?: string }) {
  const api = useMemo(() => createGroupOrderingApi(), []);
  const individualApi = useMemo(() => createIndividualApi(), []);
  const promotionsApi = useMemo(() => createPromotionsApi(), []);
  const [invitation, setInvitation] = useState<{ token?: string } | null>(null);
  useEffect(() => {
    setInvitation({ token: new URLSearchParams(window.location.hash.slice(1)).get("invito") ?? undefined });
  }, []);
  if (!invitation) return <p role="status">Caricamento del gruppo…</p>;
  return <PersistentGroupScreen api={api} individualApi={individualApi} promotionsApi={promotionsApi} groupId={groupId} inviteToken={invitation.token} />;
}
