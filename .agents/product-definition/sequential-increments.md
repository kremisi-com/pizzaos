# Sequenza autorizzata: ordine, gruppo, promozioni, notifiche

Aggiornato il 2026-11-05. **Sequenza completata e verificata localmente**, secondo D61-D70. Ogni incremento è iniziato dopo il completamento e la verifica del precedente; nessuna nuova approvazione è stata richiesta per le scelte già confermate.

| Ordine | Incremento | Stato | Evidenze |
|---|---|---|---|
| 1 | Ordine individuale e pagamento | Completato, gate 1 chiuso | Base della chat originaria: 132 test mirati, PostgreSQL/Auth.js locali e browser; correzioni aggiuntive: 91 test client, lint/typecheck/build, E2E individuale e architettura. [Riesame base](../design/2026-11-05-individual-ordering/REVIEW.md), [recupero e catalogo](../design/2026-11-05-individual-recovery/REVIEW.md). |
| 2 | Gruppo D61-D63 | Completato, gate 2 chiuso | 67 test con PostgreSQL reale, browser con quattro contesti, baseline individuale e scadenza, lint/typecheck/build e architettura. [Riesame](../design/2026-11-05-group-ordering/REVIEW.md). |
| 3 | Coupon e fedeltà D64-D67 | Completati, gate 3 chiuso | 91 mirati con PostgreSQL reale senza skip, 113 client, 85 admin, 5 scenari browser, build e controlli. Configurazione admin, benefici individuale/gruppo, limiti concorrenti, ripristini e saldo senza reload. [Riesame](../design/2026-11-05-promotions-loyalty/REVIEW.md). |
| 4 | Email operative D68-D69 | Completate, gate 4 chiuso | 55 mirati senza skip, compresi PostgreSQL/SMTP locale/UI; 93 admin, 2 browser finali, Auth locale 4. Build/lint/typecheck/architettura passati. [Riesame](../design/2026-11-05-operational-emails/REVIEW.md). |

## Metodo e responsabilità

- Ogni incremento ha design, TASKS, requisiti osservabili, contratto/stub pubblico e design interno. Agenti test nuovi senza contesto dell’implementazione, RED prima dell’implementazione, agenti implementazione distinti e riesame finale.
- Prezzi, disponibilità, riserve, ordini e pagamenti restano nel servizio canonico; nessuna dipendenza runtime tra app. Configurazioni commerciali modificabili dal pannello admin e UX italiana.
- Le due regressioni aggiuntive sull’individuale (risposta checkout persa e catalogo live non aggiornato) sono state riprodotte, specificate e corrette prima di avviare il gruppo. Il limite dei vecchi record demo con sola chiave è documentato nel riesame del recupero.
- La scadenza gruppo chiude soltanto la raccolta delle scelte: non riserva uno slot e non avvia ordine o pagamento. L’organizzatore verifica il totale e conferma l’invio.
- Il gruppo ha un solo pagante; punti e email spettano all’organizzatore. Coupon/punti sono riservati e ripristinati atomicamente con l’ordine. Email in outbox durevole, worker indipendente, errori/retry visibili nell’admin.
- Modifiche delle altre chat preservate, compresi aggiornamenti dipendenze e riferimenti di build online. Nessun commit o deploy da questa sequenza; cache e risultati test ignorati conservati senza pulizie ricorsive.

## Limiti della verifica

I riesami distinguono test reali locali (PostgreSQL, Auth.js/magic link e SMTP loopback) da provider sostituiti soltanto nell’harness browser. Le suite servizio globali senza env dedicato saltano i test PostgreSQL/Auth; le nuove prove PostgreSQL e la compatibilità Auth sono state eseguite separatamente con ambiente reale locale, come registrato nei riesami. I due vecchi selettori E2E della demo segnalati dal riesame individuale non sono stati indeboliti per mascherare timeout preesistenti.

Nessuna email a persone reali e nessun invio SMTP remoto da questa sequenza. Modalità email test con allowlist esplicita; l’invio live richiede configurazione intenzionale. Deduplica applicativa e Message-ID stabile non eliminano il possibile duplicato esterno dopo ACK SMTP perso. Google OAuth, Stripe/3DS esterni, deliverability e ambiente online richiedono le rispettive prove; D16/D31 e abbonamenti D26 restano fuori da questi incrementi.

Successivamente a questa sequenza locale, su autorizzazione esplicita dell'utente il 5 novembre 2026, sono stati pubblicati client/backend test e verificati Google cliente, Stripe Elements con challenge 3DS riuscita, percorso admin/rider completo e tre email operative Delivered all'account di prova. Il [verbale online](../../services/checkout-api/online-client-verification.md) conserva evidenze e limiti; non estende la verifica online a tutti gli scenari locali di gruppo/promozioni/email.
