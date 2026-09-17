"use client";

import type { ClientApiContract } from "@pizzaos/domain";
import { createContext, useContext, useMemo, type ReactNode } from "react";
import { createLocalClientApi } from "./local-client-api";

const ClientApiContext = createContext<ClientApiContract | null>(null);

export function ClientApiProvider({ children }: { readonly children: ReactNode })
{
  const api = useMemo(() => createLocalClientApi(), []);

  return <ClientApiContext.Provider value={api}>{children}</ClientApiContext.Provider>;
}

/** UI features use this port only; the provider can later supply an HTTP implementation. */
export function useClientApi(): ClientApiContract
{
  return useContext(ClientApiContext) ?? createLocalClientApi();
}
