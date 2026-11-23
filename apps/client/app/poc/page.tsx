import { cookies } from "next/headers";
import { ClientShell } from "@/composition/client-shell";
import { getExperienceMode } from "@/composition/session-mode";
import { SignInScreen } from "@/features/identity/components/sign-in-screen";

export default async function PocPage() {
  const demo = await getExperienceMode((await cookies()).toString()) === "demo";
  return demo ? <ClientShell /> : <SignInScreen returnTo="/ordina" demoOnly />;
}
