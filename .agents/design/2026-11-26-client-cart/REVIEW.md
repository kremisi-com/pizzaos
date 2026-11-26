# Verifica dell'incremento

Richiesta implementata: carrello operativo dedicato con presentazione POC, modifica quantità/scelte/note, rimozione e svuotamento, stima dei prodotti, checkout dedicato e riuso di Stripe Elements sandbox. Nessuna configurazione commerciale della sede o credenziale cambiata.

## Prove locali

- Client: lint, typecheck e build superati. Build isolata `.next-client-cart-build`.
- Client: 40 file, 172 test superati, inclusi 8 nuovi test di contratto del carrello e regressioni di recupero, draft, totale zero e POC.
- `pnpm architecture:check`: superato.
- `playwright.individual-cart.config.ts`: 3 scenari superati, incluso ordine contanti fino alla conferma e reload, redirect legacy, quantità/draft e checkout. CTA e totale verificati a 390×844 sopra la navigazione; screenshot locale `.codex/evidence/client-cart-mobile.png`.
- `playwright.individual.config.ts`: 7 scenari superati, inclusi percorso operativo completo e recupero della richiesta originale.
- Test di altri flussi che aprivano il checkout inline aggiornati alla navigazione Carrello → checkout; le relative suite complete non sono state rieseguite in questo incremento.

I test di contratto sono stati scritti da un agente separato usando requisiti e contratti, senza accesso all'implementazione. La prima esecuzione ha rilevato 6 fallimenti; dopo correzioni delle query e completamento del comportamento, tutti gli 8 test sono verdi.

## Sandbox e limiti delle evidenze

La configurazione Vercel del client pubblico contiene una chiave `pk_test_…` e punta a `https://api.pizzaos.app`. Le credenziali sandbox locali esistenti autenticano l'API Stripe con `livemode=false`; il backend pubblico risponde `health=ok`. Nessuna chiave è inclusa nel commit. Il provider e il backend erano già integrati: l'incremento collega le nuove schermate allo stesso flusso, senza aggiungere una simulazione di pagamento.

Questi controlli non costituiscono un nuovo collaudo online di acquisto carta/3DS, webhook, rimborso o worker. Le prove browser locali usano il fixture isolato del servizio e provider sostitutivi. I precedenti verbali online restano riferiti alle loro versioni.
