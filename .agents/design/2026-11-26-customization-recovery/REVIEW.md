# Verifica del recupero delle personalizzazioni

## Approvato e implementato

Conferma unica delle opzioni obsolete in prodotto generico, Box e pizza; avviso accessibile, prezzo corrente e proposta senza salvataggi anticipati. Nessun reset alle scelte standard per correggere una riga esistente. Scelte obbligatorie aperte e utilizzabili anche con un'unica alternativa. Conservazione di note, quantità e selezioni valide; annullamento senza modifiche. Carrello individuale e contributo proprio del gruppo restano correggibili quando tutte le opzioni sono scomparse. Il riordino preserva lo storico e verifica il nuovo carrello. Menu a fasi: localizzazione della prima fase invalida e recupero della fase corrente eliminata durante un refresh.

Il servizio e lo schema database restano invariati: quote/fingerprint, revisioni gruppo, riserve, idempotenza e snapshot sono quelli canonici. Il cambio semantico di un'opzione mantenendo lo stesso identificativo è escluso su richiesta esplicita.

## SDD e separazione dei ruoli

L'agente test ha letto solo requisiti, contratto, firme pubbliche e test/fixture esistenti. Non ha letto INTERNAL_DESIGN o i corpi dei componenti interessati. Prima dell'implementazione: 10 nuove regressioni editor/draft, **9 RED e 1 GREEN** (chiusura senza salvataggio). Dopo implementazione: **10 GREEN**. I test precedenti che richiedevano reset globale sono stati aggiornati alla scelta approvata, preservando i controlli su note, quantità e scelte obbligatorie.

Un secondo gruppo di test indipendenti verifica host/invitato, revisione aggiornata, editor assente sui contributi altrui e riordino con quote corrente e snapshot storico immutato. La review in sola lettura non ha rilevato regressioni introdotte; ha segnalato il blocco preesistente del Menu se la fase aperta sparisce al refresh. Per questo caso è stato aggiunto un test RED, poi corretto il posizionamento sulla fase residua; **4/4 GREEN** nel file di flusso.

## Verifiche locali eseguite

- Suite client completa con concorrenza limitata a quattro worker: **41 file, 186/186**. Le nuove regressioni dei flussi, aggiunte successivamente, passano separatamente: **4/4**, totale **190 test client distinti**. Il caso calendario intermittente della precedente ricognizione passa in questa esecuzione. Warning jsdom preesistente su `scrollTo`, senza fallimenti.
- Servizio invariato: `ordering-service.test.ts` 53, `group-service.test.ts` 28, `menu-ordering.acceptance.test.ts` 19 e `pizza-catalog.acceptance.test.ts` 45: **145/145**. Coperti fingerprint/prezzi non fidati, disponibilità concorrente, retry e risposta persa, revisioni gruppo, prezzi correnti e snapshot dopo pubblicazione.
- `pnpm exec playwright test --config playwright.individual-cart.config.ts`: **4/4**, incluse navigazione/carrello/checkout contanti con servizio reale isolato e nuovo recupero di un extra rimosso con annulla, conferma e reload. Il nuovo caso usa una risposta catalogo intercettata dal test per rendere deterministica la rimozione e il prezzo; non è una prova di pubblicazione admin o di Stripe esterno.
- Lint client, typecheck client e build produzione isolata `.next-customization-recovery-build`: passati. L'include aggiunto automaticamente da Next per la build è stato rimosso dalla configurazione locale, preservando gli include preesistenti.
- `pnpm architecture:check`: confini passati e **4/4** test del controllo architettura.
- Revisione React secondo lo skill `vercel:react-best-practices`: aggiornamento del solo stato dell'editor durante refresh, input immutati, effetti limitati a dialog/focus, dipendenze lint pulite, accessibilità di avvisi e scelte obbligatorie. Nessun cambiamento ai contratti server o alle dipendenze tra app.

## Limiti dell'evidenza

Queste prove sono locali, non attestano un nuovo rilascio online o un pagamento Stripe esterno. PostgreSQL multi-pool non rieseguito perché servizio e persistenza non cambiano; i test del servizio usano i repository isolati esistenti. Il nuovo recupero gruppo e riordino è verificato a livello di componente/port, non con una nuova prova browser multi-dispositivo. Il commit include solo i cambi del task: la modifica locale preesistente alla card foto nel flusso menu e i file generati/configurazioni preesistenti restano fuori.
