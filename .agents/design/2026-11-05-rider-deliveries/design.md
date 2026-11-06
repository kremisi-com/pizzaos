# Consegne pilota e accesso rider

Stato: decisioni D57/D58 approvate il 2026-11-05; integrazione al flusso individuale ancora da verificare.

## Risultato osservabile

Un operatore della sede aggiunge un rider per email e assegna manualmente una consegna pronta. Il rider accede con l'identità Auth.js già prevista (Google o magic link), vede soltanto le consegne assegnategli e può avviarle, completarle o segnalare un problema. Una consegna fallita rimane aperta ed evidenziata; l'operatore la riassegna, anche allo stesso rider per riprovare, oppure annulla tramite la normale gestione ordine e rimborso. Nessun GPS, pianificazione percorsi o nuova applicazione distribuita.

## Confini

- `packages/domain/src/rider-deliveries.ts`: DTO e port browser condivisi; entry point pubblico integrato dal coordinatore.
- `services/checkout-api/src/delivery`: appartenenze rider, assegnazioni, problemi, autorizzazione e proiezione minimizzata. Persistenza nello stesso documento/transazione dell'ordine canonico.
- `apps/admin/src/features/rider-deliveries`: presentazione italiana mobile-first, con port iniettato dalla composizione.
- `/rider` appartiene a `apps/admin`; non richiede un quarto deploy. La successiva [D71](../../product-definition/decisions.md) conferma `admin.pizzaos.app` e `rider.pizzaos.app` sullo stesso progetto e deploy frontend per ambiente, con ingressi e navigazione dedicati. Mapping degli host e configurazione di accesso restano da implementare e verificare secondo il [piano del pilota](../../product-definition/architecture/pilot-deployment.md); nessun hostname va incorporato nella feature.

## Identità e sicurezza

Le appartenenze rider sono separate da `OrderingState.memberships`. Non attribuiscono `IndividualSession.storeIds` o privilegi operatore. L'operatore può aggiungere/disattivare i rider della propria sede: è un nuovo ruolo ristretto, mentre D07 continua a riservare gli inviti operatore al superadmin.

Il servizio canonico può consentire al rider soltanto `dispatch` e `complete` usando un guard di assegnazione nella stessa transazione che applica la transizione. Il rider reale rimane l'attore: nessuna impersonificazione operatore. Il guard verifica appartenenza attiva, sede, assegnazione e assenza di un problema aperto. Completamento, decremento scorte e contanti seguono le invarianti esistenti.

Le route rider restituiscono solo DTO minimizzati: indirizzo e coordinate della consegna, nome/telefono cliente, note, riepilogo colli/articoli e contanti ancora dovuti. Escludono email cliente, riferimenti Stripe, rimborsi, scorte, dati di altri ordini. Le route generiche che restituiscono `IndividualOrder` devono continuare a negare accesso operativo al rider; il guard è utilizzabile solo dalle route rider oppure il livello HTTP deve impedire al rider di sfruttare l'endpoint generico per ricevere il modello completo.

## Integrazione necessaria, riservata al coordinatore

1. Esportare il contratto dal public entry point del dominio.
2. Conservare `delivery` come estensione opzionale di `OrderingState`, inizializzata pigramente per compatibilità con i documenti esistenti.
3. Aggiungere a `OrderingServiceOptions` un guard opzionale ristretto per `dispatch`/`complete`. Verificarlo dentro la transazione di `action`, prima dei controlli viewer/operatore; non usarlo per altre azioni. Vietare bypass tramite route generica che restituisce l'ordine completo.
4. Collegare il gateway `progress` al servizio canonico usando l'attore autenticato reale. Non aprire transazioni annidate e non duplicare la logica di pagamento/scorte.
5. Registrare endpoint autenticati `/v1/pilot/rider/session`, `/v1/pilot/rider/deliveries`, `/v1/pilot/rider/deliveries/:id/{dispatch,complete,failure}` e endpoint operatore sotto `/v1/pilot/stores/:storeId/riders` e `/v1/pilot/orders/:id/assignment`, conservando il confine ammesso dal proxy esistente.
6. Collegare proxy same-origin e composizione `/rider`; impedire a rider-only l'apertura della shell operativa. La sessione rider va esposta separatamente dai privilegi operatore.
7. Rendere assegnazioni/problemi visibili nell'admin e aggiornare la vista rider con polling autenticato; nessuna mappa GPS fittizia.

## SDD e verifica

Requisiti e contratti sono separati dal disegno interno. Un autore indipendente scrive i test conoscendo solo i primi due documenti. Servono prove di isolamento per sede/rider, accesso diretto, revoca, riassegnazione concorrente, problemi aperti, retry, contanti e minimizzazione. L'integrazione finale richiede test HTTP e browser oltre ai test dei moduli; non dichiarare completamento finché i punti precedenti non sono verificati.
