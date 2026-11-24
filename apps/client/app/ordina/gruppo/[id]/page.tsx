import { GroupOrderingShell } from "@/composition/group-ordering-shell";
import { isStorefrontHost } from "@/composition/ordering-host";
import { headers } from "next/headers";

export default async function GroupPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <GroupOrderingShell groupId={id} storefront={await isStorefrontHost((await headers()).get("host"))} />;
}
