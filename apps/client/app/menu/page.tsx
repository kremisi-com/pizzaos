import type { ReactElement } from "react";
import { MenuScreen } from "@/features/menu/components/menu-screen";

interface MenuPageProps
{
  readonly searchParams?: Promise<{
    readonly section?: string;
  }>;
}

export default async function MenuPage(props: MenuPageProps): Promise<ReactElement>
{
  const searchParams = await props.searchParams;

  return <MenuScreen initialSectionId={searchParams?.section} />;
}
