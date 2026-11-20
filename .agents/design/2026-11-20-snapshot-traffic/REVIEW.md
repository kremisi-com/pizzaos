# Verifica locale del traffico dello snapshot — 20 novembre 2026

Il repository conserva una sola copia locale e chiede a PostgreSQL di convalidarne la versione sotto lock. L'`UPDATE` viene eseguito quando la callback cambia il JSON persistito. La migrazione è additiva e la versione ruota anche per le scritture effettuate dal repository precedente. [Disegno SDD](design.md).

## Byte misurati su PostgreSQL 18.7

Snapshot sintetico da 151.894 byte, 100 transazioni a scenario. Lo scenario in quiete usa un'istanza con solo letture. Lo scenario misto alterna due istanze ogni 10 transazioni e scrive una volta per blocco. Entrambi gli adattatori percorrono lo stesso schema e lo stesso carico; il riferimento riproduce le query del repository precedente. Un relay TCP su loopback conta i byte effettivi del protocollo PostgreSQL, separati per direzione.

| Scenario | Direzione | Prima (B) | Dopo (B) | Riduzione |
| --- | --- | ---: | ---: | ---: |
| Quiete | Database → backend | 15.209.700 | 17.600 | 99,88% |
| Quiete | Backend → database | 15.235.700 | 32.000 | 99,79% |
| Misto | Database → backend | 15.209.799 | 2.904.544 | 80,90% |
| Misto | Backend → database | 15.235.800 | 1.552.300 | 89,81% |

La misurazione parte con connessioni aperte e copie già caricate. Esclude TLS, framing TCP, connessione, letture iniziali, setup e verifiche. A freddo e dopo cambi di versione, il JSON può essere scaricato per intero; le scritture effettive lo inviano ancora per intero. Il risparmio dipende dalla dimensione del documento, dalle scritture e dal riuso dei processi. Neon misura verso i client il traffico pubblico rilevante per la quota. Il benchmark misura il repository, mentre la procedura pilota raccoglie il consumo complessivo, comprensivo del resto dell'applicazione, e le CU-ore. [Definizione del traffico pubblico Neon](https://neon.com/docs/introduction/network-transfer#what-is-network-transfer), [procedura pilota](../../../services/checkout-api/restore-test-after-quota.md).

## Riproduzione e controlli

Preparare PostgreSQL locale con un database dedicato `pizzaos_individual_test` e un ruolo autorizzato a creare schemi. Da root, con `PIZZAOS_TEST_DATABASE_URL` puntato al database locale, eseguire:

```powershell
pnpm --filter @pizzaos/checkout-api exec vitest run --config ../../vitest.config.ts src/ordering-snapshot.acceptance.test.ts
```

La [suite](../../../services/checkout-api/src/ordering-snapshot.acceptance.test.ts) crea i propri schemi di prova e stampa i byte. Il repository precedente fallisce la soglia del 95% in quiete e le verifiche su `updated_at`; l'adattatore aggiornato supera tutte e sei le prove, incluse concorrenza sotto lock, compatibilità legacy, rollback, sostituzione della riga e indisponibilità del database con copia già caricata.

- Checkout API su PostgreSQL locale con `pnpm test --no-file-parallelism`, **499 test passati, zero skip**. L'esecuzione seriale evita interferenze fra le suite preesistenti che condividono la stessa tabella di test.
- Client **116 test passati**. Typecheck, build e lint del servizio e `pnpm architecture:check` passano.
- Smoke con il runtime Fastify e PostgreSQL locale. Il catalogo risponde 200, i tick in quiete di ordini, gruppi ed email lasciano intatto `updated_at` e una scrittura SQL da un'altra connessione appare alla richiesta successiva.
- La migrazione è stata applicata e ripetuta sul database locale. La misura e il rilascio sul pilota sono ancora da eseguire secondo la procedura di ripristino.
