import { ClientShell } from "@/composition/client-shell";
import { IndividualOrderingShell } from "@/composition/individual-ordering-shell";
import type { ReactElement } from "react";
import { cookies, headers } from "next/headers";
import { getExperienceMode } from "@/composition/session-mode";
import { resolveClientHost } from "@/composition/ordering-host";

export default async function ClientPage(): Promise<ReactElement>
{
  const host = await resolveClientHost((await headers()).get("host"));
  if (host?.storefront || await getExperienceMode((await cookies()).toString()) !== "demo") {
    return <IndividualOrderingShell storefront={host?.storefront} />;
  }
  return <ClientShell />;
}
