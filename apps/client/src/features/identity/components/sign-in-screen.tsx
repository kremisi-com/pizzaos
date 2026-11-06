"use client";

import { useEffect, useState } from "react";
import styles from "./sign-in.module.css";

export function SignInScreen({ returnTo }: { returnTo: string }) {
  const [csrf, setCsrf] = useState("");
  const [verification, setVerification] = useState(false);
  const [error, setError] = useState("");
  const [email, setEmail] = useState("");
  const [demoCsrf, setDemoCsrf] = useState("");
  const [demoEnabled, setDemoEnabled] = useState(false);
  const demoEmail = email.trim().toLowerCase() === "poc@pizzaos.app";
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setVerification(params.get("verifica") === "1" || params.get("type") === "email");
    if (params.get("errore") === "demo") setError("Credenziali demo non valide oppure demo non disponibile. Controlla email e password.");
    else if (params.has("error") || params.has("errore")) setError("Accesso non riuscito. Il link potrebbe essere scaduto o già utilizzato: richiedine uno nuovo oppure accedi con Google.");
    let active = true;
    void fetch("/api/pilot/auth/csrf", { cache: "no-store" }).then(async response => {
      if (!response.ok) throw new Error("Servizio di accesso non disponibile.");
      const data = await response.json() as { csrfToken?: string };
      if (!data.csrfToken) throw new Error("Impossibile preparare l'accesso. Riprova.");
      if (active) setCsrf(data.csrfToken);
    }).catch(failure => { if (active) setError(failure instanceof Error ? failure.message : "Accesso non disponibile."); });
    void fetch("/api/pilot/auth/demo", { cache: "no-store" }).then(async response => {
      if (!response.ok) return;
      const data = await response.json() as { enabled?: boolean; csrfToken?: string };
      if (active) { setDemoEnabled(data.enabled === true); setDemoCsrf(data.csrfToken ?? ""); }
    }).catch(() => { /* Normal sign-in remains available when demo access is disabled. */ });
    return () => { active = false; };
  }, []);
  return <div className={styles.page}><a href={returnTo}>← Torna a PizzaOS</a><section className={styles.card}><span className={styles.brand}>PizzaOS</span>
    <h1>{verification ? "Controlla la tua email" : "Accedi e continua"}</h1>
    {verification ? <><p>Ti abbiamo inviato un link per accedere. Aprilo sullo stesso dispositivo per ritrovare il carrello.</p><p>Se non arriva, controlla la cartella spam oppure richiedi un nuovo link.</p><a href="/accesso">Richiedi un altro link</a></> : <>
      <p>Usa Google oppure ricevi un link sicuro via email. Il carrello resta su questo dispositivo.</p>
      <form method="post" action="/api/pilot/auth/signin/google"><input type="hidden" name="csrfToken" value={csrf} /><input type="hidden" name="callbackUrl" value={returnTo} /><button disabled={!csrf} type="submit">Continua con Google</button></form>
      <div className={styles.divider}>oppure</div>
      <form method="post" action={demoEmail ? "/api/pilot/auth/demo" : "/api/pilot/auth/signin/nodemailer"}>
        <input type="hidden" name="csrfToken" value={demoEmail ? demoCsrf : csrf} /><input type="hidden" name="callbackUrl" value={returnTo} />
        <label>La tua email<input type="email" autoComplete="email" required name="email" placeholder="nome@esempio.it" value={email} onChange={event => setEmail(event.target.value)} /></label>
        {demoEmail && <><label>Password demo<input type="password" autoComplete="current-password" required name="password" /></label><p>{demoEnabled ? "Accederai alla demo con dati fittizi e operazioni simulate." : "La demo non è disponibile al momento."}</p></>}
        <button disabled={demoEmail ? !demoEnabled || !demoCsrf : !csrf} type="submit">{demoEmail ? "Entra nella demo" : "Inviami un link di accesso"}</button>
      </form>
      {demoEnabled && !demoEmail && <p>Per provare la demo, usa poc@pizzaos.app e la password dedicata.</p>}
    </>}{error && <p className={styles.error} role="alert">{error}</p>}
  </section></div>;
}

export function SignOutButton() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function logout() {
    setBusy(true); setError("");
    try {
      const demoResponse = await fetch("/api/pilot/auth/demo", { cache: "no-store" });
      if (!demoResponse.ok) throw new Error("Impossibile uscire. Riprova.");
      const demo = await demoResponse.json() as { active?: boolean; csrfToken?: string };
      const response = demo.active ? demoResponse : await fetch("/api/pilot/auth/csrf", { cache: "no-store" });
      if (!response.ok) throw new Error("Impossibile uscire. Riprova.");
      const data = demo.active ? demo : await response.json() as { csrfToken?: string };
      if (!data.csrfToken) throw new Error("Impossibile uscire. Riprova.");
      const form = document.createElement("form"); form.method = "POST"; form.action = demo.active ? "/api/pilot/auth/demo/signout" : "/api/pilot/auth/signout";
      for (const [name, value] of Object.entries({ csrfToken: data.csrfToken, callbackUrl: "/accesso" })) { const input = document.createElement("input"); input.type = "hidden"; input.name = name; input.value = value; form.appendChild(input); }
      document.body.appendChild(form); form.submit();
    } catch (failure) { setError(failure instanceof Error ? failure.message : "Impossibile uscire."); setBusy(false); }
  }
  return <span><button type="button" disabled={busy} onClick={() => void logout()}>{busy ? "Uscita…" : "Esci"}</button>{error && <span role="alert">{error}</span>}</span>;
}
