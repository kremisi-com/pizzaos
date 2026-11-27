import { LegacyOrdersRedirect } from "@/composition/legacy-orders-redirect";
import { IndividualOrderingShell } from "@/composition/individual-ordering-shell";
import { isStorefrontHost } from "@/composition/ordering-host";
import { headers } from "next/headers";

export default async function IndividualOrderingPage() {
  return <><LegacyOrdersRedirect /><IndividualOrderingShell storefront={await isStorefrontHost((await headers()).get("host"))} /></>;
}
