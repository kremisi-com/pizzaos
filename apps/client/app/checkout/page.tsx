import type { ReactElement } from "react";
import { CheckoutScreen } from "@/features/checkout/components/checkout-screen";

interface CheckoutPageProps
{
  readonly searchParams?: Promise<{ readonly order?: string }>;
}

export default async function CheckoutPage(props: CheckoutPageProps): Promise<ReactElement>
{
  const searchParams = await props.searchParams;
  return <CheckoutScreen isGroupOrder={searchParams?.order === "group"} />;
}
