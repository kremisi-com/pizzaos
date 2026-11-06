import { SignInScreen } from "@/features/identity/components/sign-in-screen";
import { getRequestOperationalHost } from "@/composition/operational-page";

export default async function AccessPage({ searchParams }: { searchParams: Promise<{ area?: string }> }) {
  const query = await searchParams;
  const host = await getRequestOperationalHost();
  const area = host?.separateHosts ? host.surface : query.area === "rider" ? "rider" : "admin";
  return <SignInScreen area={area} returnTo={area === "rider" ? "/rider" : "/operazioni"} />;
}
