import { SignInScreen } from "@/features/identity/components/sign-in-screen";

export default async function AccessPage({ searchParams }: { searchParams: Promise<{ ritorno?: string }> }) {
  const requested = (await searchParams).ritorno;
  const returnTo = typeof requested === "string" && /^\/ordina(?:[/?#]|$)/.test(requested) ? requested : "/ordina";
  return <SignInScreen returnTo={returnTo} />;
}
