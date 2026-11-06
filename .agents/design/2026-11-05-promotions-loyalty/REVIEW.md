# Verifica coupon e fedeltà — 2026-11-05

Incremento D11/D64-D67 completato e verificato localmente. Gate tecnico verde; formalizzazione e avvio email restano al coordinatore. Nessun lavoro email, abbonamenti o AI avviato.

## Risultato

L'admin reale configura programma, premio e coupon per sede, inclusi validità, prodotti, minimo, limiti, modifica e disattivazione. Il cliente vede wallet e movimenti e seleziona coupon/premio nel checkout individuale o come host gruppo. Gli invitati non ricevono wallet o controlli di riscatto. L'ordine admin espone lordo, coupon, premio e netto dovuto.

Il motore canonico applica percentuali in sequenza, fissi e un premio sui prodotti; delivery esclusa, arrotondamenti interi deterministici. Esempio verificato: 2000→1800→1440→940→440 cent prodotti, più200 delivery=640, punti4 al completamento. Un beneficio effettivo zero non brucia coupon o punti e produce un errore azionabile.

Un solo repository PostgreSQL decorato serve ordering, gruppi, analytics, rider/delivery e worker. Pending carta impegna coupon e punti nella stessa transazione dell'ordine, prima del provider; submission consuma, annullamento/fallimento definitivo libera una volta. Esito incerto mantiene gli impegni. Completamento, anche rider, accredita una volta con enabled/tasso congelati alla creazione; nessun retrocredito storico. Aggiunte mantengono sconto originale e applicano delta pieno, con punti sul netto finale. Quote senza selezione conserva payload e fingerprint precedenti. Totale zero confermato esplicitamente non richiede Stripe né produce addebiti o rimborsi inesistenti.

## SDD e RED→GREEN

Design, TASKS, requisiti, contratti/stub pubblici e design interni separati sono stati scritti prima dell'implementazione e revisionati dal coordinatore. Nuovo test agent `fork_turns=none`: solo REQUIREMENTS/CONTRACT e port/firme pubblici, senza implementazioni, test esistenti o INTERNAL_DESIGN. Agente backend separato; lead per superfici e integrazione.

- RED semantico backend: factory risolta e sede canonica creata, `configuration` non soddisfaceva i default e rigettava dallo stub runtime; nessun semplice errore import.
- RED semantico UI: sette test su wallet/selezione/riepilogo e configurazione admin fallivano sugli stub runtime, poi verdi dopo implementazione.
- Test indipendenti hanno verificato strict input prima di coercion/strip, duplicati normalizzati, esclusioni, concorrenza, pending/provider incerto, scadenze, ripristini/refund replay, freeze programma, gruppo, rider, nessun backfill e aggiunte.
- Review root ha precisato coupon con sconto effettivo zero: requisito14/contratto aggiornati, casi prodotti assenti e residuo azzerato verificati; nessun uso consumato.
- Browser: corretto pattern HTML coupon per regexp `/v`; corretta esclusivamente la fixture che inseriva UTC in `datetime-local`. Le asserzioni commerciali non sono state adattate all'implementazione.

## Evidenze finali

| Controllo | Risultato |
|---|---|
| Suite mirata con `PIZZAOS_TEST_DATABASE_URL` reale: `pnpm exec vitest run services/checkout-api/src/promotions apps/client/src/test/promotions.test.tsx apps/client/src/test/promotions-draft.test.ts apps/client/src/test/promotions-zero-total.test.tsx apps/admin/src/test/promotions.test.tsx` | **91/91**, sette file, zero skip:50 economici/lifecycle,22 HTTP,2 PostgreSQL,5 UI cliente,4 UI admin,6 draft/retry,2 UI totale zero |
| `pnpm --filter @pizzaos/client test` | **113/113**,29 file, compreso POC e gruppo |
| `pnpm --filter @pizzaos/admin test` | **85/85**,19 file, compresi analytics/rider e POC |
| Suite servizio durante integrazione | **361 passati,13 skip** PostgreSQL/Auth senza env; i quattro casi economici aggiunti successivamente sono inclusi nei50 della suite finale sopra |
| `pnpm exec playwright test --config playwright.promotions-loyalty.config.ts` | **5/5 PASS**,1,2 minuti |
| Client/admin lint, typecheck e build; servizio lint/typecheck/build; dominio lint/typecheck | **PASS**; typecheck app anche dopo pulizia dei riferimenti generati |
| `pnpm architecture:check`, `git diff --check` | **PASS** |

PostgreSQL reale: solo container di test già dedicato `pizzaos-individual-sdd-20261105`, porta55435 e database guardato `pizzaos_individual_test`. Due pool indipendenti verificano configurazione/wallet persistenti, ultimo uso coupon, ultimo premio, ripristino e riavvio connessione. Identità e provider finti sono esclusivamente fixture. Container riportato allo stato fermo.

I cinque browser test coprono baseline individuale fino a completamento, baseline gruppo con quattro contesti e scadenza/guest ostile, admin configurazione→cliente maturazione→coupon/premio→completamento e annullamento, gruppo con wallet solo host e unico ordine attribuito. I test promozioni asseriscono il saldo **nel DOM senza reload** dopo completamenti e annullamenti, oltre al saldo autorevole API. Config dedicata: porte3601/3602/3604, output `test-results/promotions-loyalty`, Next `.next-promotions-e2e`. Build separate `.next-promotions-build`; nessuna build contemporanea ai server Next.

Screenshot aperti e verificati dal test agent e dal lead: [ordine gruppo e benefici admin](../../../test-results/promotions-loyalty/promotions-loyalty-host-gr-4174f-ripristina-punti-e-utilizzo/ordine-gruppo-promozioni.png), [wallet ripristinato](../../../test-results/promotions-loyalty/promotions-loyalty-host-gr-4174f-ripristina-punti-e-utilizzo/wallet-ripristinato.png). Gruppo16→14 euro con coupon1 e premio1, righe host/invitato distinte; nessun overflow promozioni osservato.

## File e limiti

- Contratti dominio `promotions-loyalty.ts`/index e estensioni compatibili individuale/gruppo.
- Servizio `src/promotions/{index.ts,selection.ts,README.md}`, hook minimo in ordering-contract/service, HTTP strict, forwarding gruppo e wiring runtime/fixture. Nessun secondo checkout o nuova tabella.
- App: `features/promotions` pubbliche con CSS Module, adapter `composition/api/promotions-api.ts`, shell individuale/gruppo, draft, pannello operativo e breve riepilogo ordine admin. `@pizzaos/testing` aggiunto come devDependency admin con lock coerente, senza workaround ai test.
- Nove file indipendenti test/supporto, configurazione Playwright e adattamento delle sole origini della baseline gruppo agli env di test. Nessuna asserzione baseline rimossa.
- README di moduli/app/composizione e flow corrente `flows/promotions-and-loyalty.md`; registro decisioni/piano sequenziale non modificati. Modifiche altrui preservate, nessun commit/deploy.

Rimossi solo gli include `.next-promotions-*` aggiunti dai check e ripristinati next-env sui tipi canonici `.next`; cache e risultati restano locali ignorati da Git, senza pulizie ricorsive. Server360x chiusi. Google OAuth e Stripe/3DS esterni non configurati: le prove carta coprono il boundary canonico con adapter test; browser economici reali app/HTTP su harness isolato e contanti, persistenza PostgreSQL verificata separatamente. Nessun fallback simulato nel runtime live e nessun invio esterno.
