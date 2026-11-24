import { notFound } from "next/navigation";
import { getAdminTab } from "@/composition/admin-navigation";
import PocPage from "../page";

export default async function SectionPage({ params }: { params: Promise<{ section: string }> }) {
  const { section } = await params;
  if (!getAdminTab(section)) notFound();
  return <PocPage />;
}
