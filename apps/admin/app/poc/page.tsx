import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { AdminShell } from "@/composition/admin-shell";
import { getRequestOperationalHost } from "@/composition/operational-page";
import { getExperienceMode } from "@/composition/session-mode";
import { SignInScreen } from "@/features/identity/components/sign-in-screen";

export default async function PocPage() {
  const host = await getRequestOperationalHost();
  if (host?.surface !== "admin") notFound();
  const demo = await getExperienceMode((await cookies()).toString(), host.origin) === "demo";
  return demo ? <AdminShell /> : <SignInScreen returnTo="/operazioni" demoOnly />;
}
