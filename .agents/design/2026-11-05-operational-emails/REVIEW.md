# Verifica email operative — 2026-11-05

Incremento D68-D69 completato localmente. Gate tecnico verde; la formalizzazione finale del piano resta al coordinatore. Nessun ulteriore incremento, invio remoto o deploy eseguito.

## Risultato

Outbox persistente atomica con il lifecycle canonico, condivisa da ordine individuale, gruppo, promozioni, analytics e rider. Messaggi al solo acquirente (host pagante nel gruppo): ricevuto dopo submission, accettato, pronto solo pickup, in consegna solo delivery, annullato ed esiti reali del rimborso base/aggiunte. Nessun messaggio raccolta, invitati, marketing o evento storico retroattivo. Ordine zero/cash senza addebito non inventa rimborsi.

Snapshot business immutabile con riepilogo economico netto, note partecipante, date italiane nel fuso sede e importo/ambito del rimborso distinti dal totale ordine. Mittente/trasporto e allowlist sono rivalutati alla dispatch: una configurazione corretta recupera i messaggi bloccati senza cambiare corpo o Message-ID.

Worker ordini ed email indipendenti tramite `createOperationalWorkers`, usato da server continuo, daemon e fixture: SMTP sospeso non blocca listen o scadenze ordine; stop drena entrambi prima di chiudere sender e pool. Webhook e API ordine non attendono SMTP. Claim/lease/token persistenti, completamento CAS, backoff5000ms raddoppiato fino900000ms, batch10 e sequenza per ordine; un ordine in retry non blocca gli altri.

Adapter Nodemailer con deadline assoluta massima30000ms, sotto lease60000ms: possiede e distrugge il socket al timeout, chiude il trasporto e non lascia invii nascosti vivi. Modalità test predefinita con allowlist vuota; live richiede environment production esplicito. Mancanza config o destinatario non consentito non diventano sent. Errori/log pubblici sanitizzati.

Admin: scheda «Email operative» own-store con stati, tentativi, destinatario, date, prossimo retry e aggiornamento periodico. Nessun endpoint browser di invio, configurazione SMTP o simulazione. L'ordine resta utilizzabile e lo stato sempre nell'app; WhatsApp manuale.

## SDD e verifiche

Nuovo testwriter `fork_turns=none`, soltanto requisiti/contratti e port/firme pubblici: nessun accesso a implementazioni, test esistenti o design interni. Backend separato; lead UI/composizione. RED semantico prima dell'implementazione: dopo saveStore canonico `emails.list` non soddisfaceva il contratto; il pannello non mostrava pending. Entrambi fallivano su stub runtime risolti, non import mancanti.

Review integrate con requisiti pubblici e test: configurazione recuperabile, policy ogni tentativo, worker separati, timeout con socket chiuso, importi/ambiti rimborsi e timezone congelata. Nessun test o asserzione canonica indebolito per adattarsi al codice.

| Verifica | Risultato finale |
|---|---|
| `pnpm exec vitest run services/checkout-api/src/operational-emails apps/admin/src/test/operational-emails.test.tsx` con PostgreSQL reale | **55/55**, sei file, nessuno skip:30 core,6 HTTP,7 SMTP,1 worker,3 PostgreSQL,8 UI |
| Suite completa servizio | **409 passati**,16 PostgreSQL/Auth saltati senza env; mirati PG3 e Auth4 eseguiti realmente a parte |
| `pnpm --filter @pizzaos/admin test` | **93/93**,20 file |
| `pnpm exec playwright test --config playwright.operational-emails.config.ts` dopo split worker e fix finali | **2/2 PASS**,51,6s |
| `pnpm exec vitest run services/checkout-api/src/auth-runtime.test.ts` con PostgreSQL/SMTP locali | **4/4 PASS** sulle dipendenze attuali |
| Admin lint/typecheck/build; servizio lint/typecheck/build; dominio lint/typecheck; client typecheck post-cleanup | **PASS** |
| Architettura e diff whitespace | **PASS**,3 test checker |

Core verifica anche rollback atomico, concorrenza, ordine per ordine durante retry, progresso altri ordini, stale claim, riavvio, ACK perso, limite backoff/batch, policy/ruoli/privacy, gruppo host e rider. Il test worker sospende realmente il sender e verifica start non bloccato, nuovi tick ordine e drain. I sette test SMTP aprono soltanto sink TCP127.0.0.1 con indirizzi `.test`: consegna effettiva, destinatario/Message-ID, rifiuto, ACK perso e timeout100ms con connessione chiusa; guardia localOnly rifiuta destinazioni remote.

PostgreSQL: container di test dedicato `pizzaos-individual-sdd-20261105`, porta55435, database guardato `pizzaos_individual_test`, due pool. Persistenza/riavvio/deduplica, rollback e lease concorrenti verificati; container riportato fermo. Nessun dato reale.

Browser: baseline individuale completa fino a completamento admin; nuovo ordine contanti con provider email test che fallisce una volta, pannello mostra retry, admin accetta durante il guasto, client vede accettato e polling recupera lo stesso record sent/attempts2 più il successivo accepted, senza reload manuale. Test ports3701/3702/3704, output `test-results/operational-emails`, Next `.next-emails-e2e`; build admin separata `.next-emails-build` a server chiusi. Client source non modificato; gruppi/promozioni sono coperti dalla suite canonica completa e dai nuovi test servizio, senza ripetere browser invariati.

Versioni effettive osservate con import.meta.resolve: Nodemailer10.3.1, Auth.js0.41.3, pg-adapter1.11.3. Erano aggiornamenti di altra chat, preservati senza upgrade/revert; SMTP effettivo e Auth.js/PostgreSQL locali verificati sulle versioni attuali.

## File e limiti reali

- Nuovo contratto `packages/domain/src/operational-emails.ts` ed export pubblico.
- Modulo servizio `operational-emails/{index,contract,snapshot,smtp,validation,README}`, runtime e runner/server/daemon, fixture test, README/env servizio. Nessun nuovo motore o tabella.
- Admin feature pubblica con CSS Module, adapter GET e scheda di composizione; README app/composizione/feature.
- Otto file test/supporto indipendenti, configurazione Playwright, cartella SDD e flow corrente `flows/operational-emails.md`.

Modifiche altrui e registro/piano root-owned preservati. Rimossi soltanto riferimenti `.next-emails-*` generati nei tsconfig; client next-env ripristinato su `.next`, admin next-env e include `.next-online-release` di altra chat lasciati intatti. Typecheck dopo pulizia passato. Cache locali ignorate conservate, nessuna rimozione ricorsiva. Server370x chiusi; nessun commit o deploy nostro.

L'app deduplica eventi e mantiene un Message-ID stabile, ma un ACK SMTP perso può ancora produrre duplicati esterni: **nessuna garanzia exactly-once SMTP**. SMTP reale verificato solo su loopback; browser usa sender iniettato esclusivamente nella fixture. Google/Stripe e SMTP remoto non sono configurati o provati da questo incremento. Nessuna email a persone reali o connector Gmail usato. Attivazione live, deliverability e D16/D31 restano verifiche distinte dalla validazione locale.
