import { AdminShell } from "@/composition/admin-shell";
import { IndividualOperationsShell } from "@/composition/individual-operations-shell";
import { RiderShell } from "@/composition/rider-shell";
import { OperationalPage, getRequestOperationalHost } from "@/composition/operational-page";
import type { ReactElement } from "react";
import { cookies } from "next/headers";
import { getExperienceMode } from "@/composition/session-mode";

export default async function AdminPage(): Promise<ReactElement>
{
  const host = await getRequestOperationalHost();
  if (host?.surface === "rider") return <OperationalPage surface="rider"><RiderShell /></OperationalPage>;
  if (host && await getExperienceMode((await cookies()).toString(), host.origin) === "demo") return <AdminShell />;
  return <OperationalPage surface="admin"><IndividualOperationsShell riderHref={process.env.PIZZAOS_RIDER_ORIGIN?.trim() || "/rider"} /></OperationalPage>;
}
