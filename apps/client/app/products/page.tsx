import type { ReactElement } from "react";
import { ProductsScreen } from "@/features/products/components/products-screen";

interface ProductsPageProps
{
  readonly searchParams?: Promise<{
    readonly section?: string;
  }>;
}

export default async function ProductsPage(
  props: ProductsPageProps
): Promise<ReactElement>
{
  const searchParams = await props.searchParams;

  return <ProductsScreen initialSectionId={searchParams?.section} />;
}
