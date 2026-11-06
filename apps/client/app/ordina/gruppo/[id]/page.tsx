import { GroupOrderingShell } from "@/composition/group-ordering-shell";

export default async function GroupPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <GroupOrderingShell groupId={id} />;
}
