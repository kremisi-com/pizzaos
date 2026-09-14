import type { ReactElement } from "react";
import { ProductDetailScreen } from "@/features/customization/components/product-detail-screen";

interface ProductDetailPageProps
{
  readonly params: Promise<{
    readonly id: string;
  }>;
  readonly searchParams?: Promise<{
    readonly order?: string;
  }>;
}

export default async function ProductDetailPage(props: ProductDetailPageProps): Promise<ReactElement>
{
  const params = await props.params;
  const searchParams = await props.searchParams;

  return <ProductDetailScreen productId={params.id} isGroupOrder={searchParams?.order === "group"} />;
}
