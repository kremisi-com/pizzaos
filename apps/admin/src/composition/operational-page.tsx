import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { getOperationalAccess } from "./operational-access";
import { resolveOperationalHost, type OperationalSurface } from "./operational-host";
import { SignOutButton } from "../features/identity/components/sign-in-screen";
import styles from "./pilot-extensions.module.css";

export async function getRequestOperationalHost() {
  const requestHeaders = await headers();
  const authority = requestHeaders.get("host") ?? "localhost";
  return resolveOperationalHost({ url: `http://${authority}`, headers: new Headers(requestHeaders) });
}

/** Page access is checked independently of middleware; APIs enforce their own permissions. */
export async function OperationalPage({ surface, children }: { surface: OperationalSurface; children: ReactNode }) {
  const host = await getRequestOperationalHost();
  if (!host) return <main className={styles.panels}><h1>Servizio non disponibile</h1><p>Questo indirizzo non è configurato.</p></main>;
  if (host.separateHosts && host.surface !== surface) redirect("/");
  const cookieHeader = (await cookies()).toString();
  const access = await getOperationalAccess(surface, cookieHeader, host.origin);
  if (access === "allowed") return children;
  // Keep the original single-host local/preview entry useful for rider-only accounts.
  if (access === "denied" && surface === "admin" && !host.separateHosts
    && await getOperationalAccess("rider", cookieHeader, host.origin) === "allowed") redirect("/rider");
  const label = surface === "rider" ? "rider" : "ristorante";
  if (access === "anonymous") return <main className={styles.panels}><h1>Accesso {label}</h1><p>Accedi con l&apos;email abilitata per questa area.</p><a href={surface === "rider" ? "/accesso?area=rider" : "/accesso"}>Accedi con Google o email</a></main>;
  if (access === "denied") return <main className={styles.panels}><h1>Accesso non abilitato</h1><p>Il tuo account non è abilitato per l&apos;area {label}. Contatta il ristorante o l&apos;amministratore PizzaOS.</p><SignOutButton allowDemo={surface === "admin"} /></main>;
  return <main className={styles.panels}><h1>Servizio non disponibile</h1><p role="alert">Non è possibile verificare l&apos;accesso. Riprova tra poco.</p><a href="/">Riprova</a><a href="/accesso">Accedi</a></main>;
}
