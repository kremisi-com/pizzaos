import { ClientShell } from "@/composition/client-shell";
import { IndividualOrderingShell } from "@/composition/individual-ordering-shell";
import type { ReactElement } from "react";
import { cookies } from "next/headers";
import { getExperienceMode } from "@/composition/session-mode";

export default async function ClientPage(): Promise<ReactElement>
{
  if (await getExperienceMode((await cookies()).toString()) !== "demo") return <IndividualOrderingShell />;
  return <ClientShell />;
}
