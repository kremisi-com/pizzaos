# Verifica online cliente → admin → rider

Eseguita il **5 novembre 2026**, a partire dalle 13:42 Europe/Rome, su richiesta dell'utente. **Esito: percorso individuale completo riuscito**, con Stripe Elements nel browser, challenge 3DS sandbox ed email operative consegnate. Questo flusso è già stato provato: non va classificato nuovamente come «solo locale» o «3DS online da verificare».

## Versioni e ambiente

| Componente | Versione verificata |
|---|---|
| Client | `client.pizzaos.app`, progetto `pizzaos-client` (`prj_0qkFSagSHGAOMNrtRIRdRlQb1GmE`), deployment `dpl_CiDb5zmoSTrPnebTdhq3zsGEJmcm`, stato READY |
| Admin e rider | `admin.pizzaos.app` e `rider.pizzaos.app`, deployment condiviso `dpl_51w6s39E8WCzX8uyd95Tdk45EKxz` |
| Backend e worker | `api.pizzaos.app`, deployment `dpl_74ZKgDk81HKFv7oUtnggxiTdiWQP`; nuova istanza worker `dmni_01m6nw0967addr1xg6bwxb4bf6`, Alive/Ready in `fra1` |
| Dati e provider | Database Neon `pizzaos_test`, `PIZZAOS_ENVIRONMENT=test`, chiavi Stripe test; produzione non attivata |

L'ambiente Vercel chiamato Production serve gli alias pubblici del **pilota test**. Il client è stato pubblicato dai sorgenti locali, comprese le modifiche già presenti non committate, tramite il plugin Vercel collegato a Development Kremisi. Nessun push Git. Pacchetto di 144 file, senza env, segreti, test, cache o dipendenze installate. Il manifest locale dei sorgenti ha SHA-256 `a7b07028f3df196512a80ddda88cf28ff39bd8615d79cf6ce75a162918f76d4c`.

Il client usa `PIZZAOS_SERVICE_URL=https://api.pizzaos.app`, origine canonica `https://client.pizzaos.app`, segreto proxy protetto e chiave pubblica Stripe test. Nessuna credenziale privata nel pacchetto. Il backend è stato ripubblicato con gli stessi sorgenti per applicare la allowlist email: `OPERATIONAL_EMAIL_TEST_RECIPIENTS` contiene soltanto l'indirizzo dell'account di prova. La modalità operativa resta `test` (default del runtime); le altre destinazioni restano bloccate.

## Percorso osservato

1. Accesso Google reale sul dominio client, con sessione distinta da admin e rider. Catalogo e storico provengono dal servizio condiviso.
2. Configurazione dal pannello della sede fittizia `verifica-online`: apertura temporanea ai nuovi ordini e slot del 5 novembre alle 16:00 Europe/Rome. Prodotto `pizza-prova`, una unità a **1,00 €**, consegna gratuita, indirizzo e telefono fittizi. Nessuna geolocalizzazione personale richiesta.
3. Preventivo server e carta raccolta esclusivamente nell'iframe Stripe Elements. Carta di prova Stripe terminante in `3220`, scelta dalla [documentazione ufficiale](https://docs.stripe.com/testing#regulatory-cards). Challenge «3D Secure 2 Test Page» effettivamente visualizzata e completata con COMPLETE.
4. Ordine **`30d3f817-4f14-44fb-82ac-d0b67a67530d`** comparso nel client come pagato e in attesa del ristorante e nell'admin come «Carta pagata».
5. Azioni dal pannello admin: accettazione → preparazione → pronto → assegnazione al rider di prova già abilitato.
6. Azioni dal dominio rider: avvio consegna → completamento. Nessun contante da riscuotere. L'ordine scompare dalle consegne attive del rider.
7. Il client passa a **Completato / Pagato con carta** tramite aggiornamenti operativi, stato confermato dopo reload. L'admin conferma lo stesso ordine completato anche dopo reload. Scorta ingrediente riletta dal servizio: **9 → 8**; saldo punti cliente: **1 → 2**.
8. Sede nuovamente chiusa ai nuovi ordini tramite il pannello, dopo aver ricaricato la configurazione aggiornata. L'ordine pagato resta nello storico test; nessuna consegna o transazione commerciale reale.

## Riscontro Stripe

Lettura indipendente del PaymentIntent `pi_3UYQ5eAPiFV6wt8h2lwyHIQH` dopo il pagamento browser:

- `livemode=false`, `status=succeeded`, `amount=100`, `currency=eur`;
- charge `succeeded`;
- `three_d_secure.authentication_flow=challenge`, `result=authenticated`, versione `2.1.0`, ECI `05`.

Questo pagamento non è stato confermato tramite API o un adapter finto: le API Stripe sono state usate soltanto per leggere il risultato successivo. Il precedente scenario di annullamento/rimborso sandbox resta documentato nel [registro online](online-deployment.md).

## Email operative

Tre messaggi dell'ordine di questa prova risultano **Inviato** nell'admin, ciascuno al primo tentativo, e **Delivered** nel pannello Resend:

| Evento | ID Resend |
|---|---|
| Ordine ricevuto | `01a1abc1-7977-78cc-b4a0-161ac7a4536a` |
| Ordine accettato | `01a1abc1-b964-73e3-96ac-6fe058277269` |
| Ordine in consegna | `01a1abc3-13e4-7844-a8a0-00962854c556` |

Verificati mittente `PizzaOS <accesso@pizzaos.app>`, destinatario di prova e contenuto italiano della ricevuta: ID ordine, prodotti, totale 1,00 €, indirizzo fittizio, note e slot nel fuso Europe/Rome. Il completamento consegna non prevede una quarta email nel contratto corrente. Delivered è il riscontro del provider, non una prova di lettura da parte del destinatario.

Gli invii dei due ordini delle verifiche precedenti erano già bloccati/in attesa per allowlist vuota, con retry pianificati. L'autorizzazione dello stesso destinatario consente anche il loro recupero automatico: non confondere questi messaggi storici con duplicati del nuovo ordine. Non è stata azzerata né modificata manualmente l'outbox.

## Evidenze e controlli

Rieseguiti sul client prima del rilascio: lint, TypeScript, **116 test in 30 file** e build, tutti superati. Nessuna modifica al codice applicativo in questa verifica. Le suite backend/admin e la prova di riavvio precedenti sono registrate separatamente; non vengono presentate come rieseguite qui.

Evidenze locali ignorate da Git in `.codex/evidence/`: `client-online-source-manifest.json`, `client-online-stripe-3ds.json`, `client-online-verification.json`, `client-online-3ds-challenge.png`, `client-online-rider-ready.png`, `client-online-completed.png`, `client-online-admin-completed.png`, `client-online-emails-delivered.png`. Il presente documento conserva i risultati essenziali anche quando tali artefatti locali non sono disponibili.

## Limiti residui

- Tre sessioni su host distinti nello stesso Chrome desktop; **dispositivi fisici distinti e browser mobile non provati in questo giro**. D56 non è interamente chiusa su quel criterio.
- Questo scenario copre ordine individuale con consegna e 3DS riuscito. Gruppo, coupon, premio, ritiro, 3DS fallito/interrotto e rimborso via browser cliente non sono stati riprovati online qui.
- Il form configurazione già aperto resta una bozza: dopo il completamento mostrava ancora scorta 9; ricaricando la pagina la scorta corretta era 8. Prima di salvare configurazioni/scorte dopo attività operativa, rileggerle dal servizio. La protezione da salvataggi di configurazioni obsolete resta da verificare/correggere.
- Restano quote gratuite e limiti di continuità del worker/database, privacy, backup/ripristino, monitoraggio e adempimenti D16/D31 prima dell'apertura commerciale.
