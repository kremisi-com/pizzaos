import { GroupOrderingShell } from "@/composition/group-ordering-shell";
import { isStorefrontHost } from "@/composition/ordering-host";
import { headers } from "next/headers";

export default async function CreateGroupPage() {
  return <GroupOrderingShell storefront={await isStorefrontHost((await headers()).get("host"))} />;
}
