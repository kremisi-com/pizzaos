"use client";

import { useEffect, useState } from "react";
import { BRAND_ASSETS } from "@pizzaos/brand";
import { BrandLogo } from "@pizzaos/ui";
import styles from "./sign-in.module.css";
import { useAdminToast } from "../../notifications";

export function SignInScreen({ returnTo, area = "admin", demoOnly = false }: { returnTo: string; area?: "admin" | "rider"; demoOnly?: boolean }) {
  const showToast = useAdminToast();
  const [csrf, setCsrf] = useState("");
  const [verification, setVerification] = useState(false);
  const [error, setError] = useState("");
  const [email, setEmail] = useState("");
  const [demoCsrf, setDemoCsrf] = useState("");
  const [demoEnabled, setDemoEnabled] = useState<boolean | null>(null);
  const demoEmail = area === "admin" && email.trim().toLowerCase() === "poc@pizzaos.app";
  useEffect(() => { if (error) showToast(error, "error"); }, [error, showToast]);
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setVerification(params.get("verifica") === "1" || params.get("type") === "email");
    if (params.get("errore") === "invito") setError("L’accesso dalla landing è scaduto o non valido. Puoi richiedere un nuovo accesso demo.");
    else if (params.get("errore") === "demo") setError("Credenziali demo non valide oppure demo non disponibile. Controlla email e password.");
    else if (params.has("error") || params.has("errore")) setError("Accesso non riuscito. Il link potrebbe essere scaduto o già utilizzato: richiedine uno nuovo oppure accedi con Google.");
    let active = true;
    if (!demoOnly) void fetch("/api/pilot/auth/csrf", { cache: "no-store" }).then(async response => {
      if (!response.ok) throw new Error("Servizio di accesso non disponibile.");
      const data = await response.json() as { csrfToken?: string };
      if (!data.csrfToken) throw new Error("Impossibile preparare l'accesso. Riprova.");
      if (active) setCsrf(data.csrfToken);
    }).catch(failure => { if (active) setError(failure instanceof Error ? failure.message : "Accesso non disponibile."); });
    if (area === "admin") void fetch("/api/pilot/auth/demo", { cache: "no-store" }).then(async response => {
      if (!response.ok) throw new Error("Accesso demo non disponibile.");
      const data = await response.json() as { enabled?: boolean; csrfToken?: string };
      if (active) { setDemoEnabled(data.enabled === true); setDemoCsrf(data.csrfToken ?? ""); }
    }).catch(() => { if (active) setDemoEnabled(false); });
    return () => { active = false; };
  }, [area, demoOnly]);
  if (demoOnly) return <div className={styles.page}><a href={returnTo}>← Torna all’area ristorante</a>
    <section className={styles.card}>
      <div className={styles.brand}><BrandLogo src={BRAND_ASSETS.logo} width={180} /></div>
      <h1>Accedi alla demo PizzaOS</h1>
      <p>Esplora la demo con dati fittizi e pagamenti simulati.</p>
      {demoEnabled === null && <p role="status">Caricamento dell’accesso demo…</p>}
      {demoEnabled === false && <p>La demo non è disponibile al momento.</p>}
      <form method="post" action="/api/pilot/auth/demo">
        <input type="hidden" name="email" value="poc@pizzaos.app" />
        <input type="hidden" name="callbackUrl" value="/poc" />
        <input type="hidden" name="csrfToken" value={demoCsrf} />
        <label>Password demo<input type="password" autoComplete="current-password" name="password" required /></label>
        <button type="submit" disabled={!demoEnabled || !demoCsrf}>Entra nella demo</button>
      </form>
    </section>
  </div>;
  const rider = area === "rider";
  return <div className={styles.page}><a href={returnTo}>← Torna all&apos;area {rider ? "rider" : "ristorante"}</a><section className={styles.card}><div className={styles.brand}><BrandLogo src={BRAND_ASSETS.logo} width={180} /></div>
    <h1>{verification ? "Controlla la tua email" : rider ? "Accesso rider" : "Accesso ristorante"}</h1>
    {verification ? <><p>Ti abbiamo inviato un link per accedere all&apos;area {rider ? "rider" : "ristorante"}. Aprilo sullo stesso dispositivo.</p><p>Se non arriva, controlla la cartella spam oppure richiedi un nuovo link.</p><a href={rider ? "/accesso?area=rider" : "/accesso"}>Richiedi un altro link</a></> : <>
      <p>{rider ? "Accedi con l'email abilitata dal ristorante per vedere le tue consegne." : "Accedi con l'email abilitata per gestire il ristorante."} Usa Google oppure ricevi un link sicuro via email.</p>
      <form method="post" action="/api/pilot/auth/signin/google"><input type="hidden" name="csrfToken" value={csrf} /><input type="hidden" name="callbackUrl" value={returnTo} /><button disabled={!csrf} type="submit">Continua con Google</button></form>
      <div className={styles.divider}>oppure</div>
      <form method="post" action={demoEmail ? "/api/pilot/auth/demo" : "/api/pilot/auth/signin/nodemailer"}>
        <input type="hidden" name="csrfToken" value={demoEmail ? demoCsrf : csrf} /><input type="hidden" name="callbackUrl" value={returnTo} />
        <label>La tua email<input type="email" autoComplete="email" required name="email" placeholder="nome@esempio.it" value={email} onChange={event => setEmail(event.target.value)} /></label>
        {demoEmail && <><label>Password demo<input type="password" autoComplete="current-password" required name="password" /></label><p>{demoEnabled ? "Accederai alla demo con dati fittizi e operazioni simulate." : "La demo non è disponibile al momento."}</p></>}
        <button disabled={demoEmail ? !demoEnabled || !demoCsrf : !csrf} type="submit">{demoEmail ? "Entra nella demo" : "Inviami un link di accesso"}</button>
      </form>
      {demoEnabled && !demoEmail && <p>Per provare la demo, usa poc@pizzaos.app e la password dedicata.</p>}
    </>}
  </section></div>;
}

export function SignOutButton({ allowDemo = true }: { allowDemo?: boolean }) {
  const showToast = useAdminToast();
  const [busy, setBusy] = useState(false);
  async function logout() {
    setBusy(true);
    try {
      const demoResponse = allowDemo ? await fetch("/api/pilot/auth/demo", { cache: "no-store" }) : null;
      if (demoResponse && !demoResponse.ok) throw new Error("Impossibile uscire. Riprova.");
      const demo: { active?: boolean; csrfToken?: string } = demoResponse ? await demoResponse.json() : { active: false };
      const response = demo.active && demoResponse ? demoResponse : await fetch("/api/pilot/auth/csrf", { cache: "no-store" });
      if (!response.ok) throw new Error("Impossibile uscire. Riprova.");
      const data = demo.active ? demo : await response.json() as { csrfToken?: string };
      if (!data.csrfToken) throw new Error("Impossibile uscire. Riprova.");
      const form = document.createElement("form"); form.method = "POST"; form.action = demo.active ? "/api/pilot/auth/demo/signout" : "/api/pilot/auth/signout";
      for (const [name, value] of Object.entries({ csrfToken: data.csrfToken, callbackUrl: "/accesso" })) { const input = document.createElement("input"); input.type = "hidden"; input.name = name; input.value = value; form.appendChild(input); }
      document.body.appendChild(form); form.submit();
    } catch (failure) { showToast(failure instanceof Error ? failure.message : "Impossibile uscire.", "error"); setBusy(false); }
  }
  return <span><button type="button" disabled={busy} onClick={() => void logout()}>{busy ? "Uscita…" : "Esci"}</button></span>;
}
