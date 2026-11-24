# Accesso POC e interfaccia operativa

## Accesso alla demo

Dopo il successo del form demo o prova gratuita, la landing presenta due pulsanti che aprono il rispettivo POC senza chiedere la password. Il servizio verifica origine e pass destinato all'host. Il pass Ã¨ valido dieci minuti e viaggia nel corpo del POST. Le richieste di contatto mantengono il loro flusso.

Cliente e operatore possono anche aprire direttamente `/poc` sul rispettivo dominio. Senza una sessione demo valida vedono la password dedicata e il collegamento all'area ordinaria. Dopo l'accesso vedono la demo esistente, con dati fittizi, reset e carta simulata. La sessione vale soltanto sull'host su cui Ã¨ stata aperta. L'uscita revoca la sessione nel browser e apre l'accesso ordinario. Il rider usa il suo dominio operativo.

Una password errata torna a `/poc` con un errore. Se la password manca nella configurazione del servizio, il modulo Ã¨ disabilitato. L'accesso ordinario da `/accesso`, il login demo precedente e le protezioni D72 rimangono disponibili. L'ingresso demo sostituisce la sessione operativa sullo stesso host. Usare una finestra privata per mantenere aperte entrambe le sessioni.

Un form rifiutato non emette pass. Se manca la configurazione per i pass il form puÃ² comunque riuscire e mostrare i link di accesso manuale. Un pass scaduto, alterato o destinato all'altro host non concede la sessione. [Verifica del form e delle due navigazioni](../../../tests/e2e/landing-poc.spec.ts).

Le verifiche comprendono [accesso manuale in Playwright](../../../tests/e2e/session-demo.spec.ts), [test del servizio](../../../services/checkout-api/src/demo-landing-handoff.test.ts) e [riscontri online per l'accesso dalla landing](../../../services/checkout-api/online-deployment.md#accesso-dalla-landing-del-23-novembre-2026). Il POC usa il checkout simulato. Catalogo, ordini, pagamenti e stati operativi delle viste ordinarie provengono dai contratti persistenti.

## Interfaccia operativa

Le superfici di ordinazione e il pannello Menu seguono [il flusso D79](menu-ordering.md). Foto statiche, sezioni, menu pubblicati, personalizzazioni e sconti per gli extra provengono dal catalogo persistente. La timeline e lo storico usano gli ordini reali e l'ordine con amici usa la raccolta persistente. La demo autenticata rimane disponibile con il proprio catalogo e pagamenti simulati.

Restano da collegare al prodotto le funzioni demo di recensione, abbonamenti, mappa GPS e le viste promozionali estese. Dashboard, magazzino, marketing e insight sono descritti nell'[inventario corrente](../flow-inventory.md).

### Sidebar admin e ripristino

L'operatore apre una voce della sidebar o una scorciatoia della Dashboard: la composizione admin aggiorna l'URL a `/operazioni/<sezione>` e visualizza la sezione corrispondente. Nella demo il prefisso è `/poc`. Ricaricando o aprendo direttamente quel percorso, viene ripristinata la stessa sezione dopo la verifica dell'accesso; avanti e indietro seguono la cronologia. Gli ingressi senza sezione conservano la Dashboard. Una sezione inesistente restituisce 404; le nuove pagine riusano le verifiche di sessione e host degli ingressi esistenti.

La sede selezionata nel pilota viene ricordata in localStorage. Prima di ripristinarla, l'app verifica che sia ancora tra le sedi autorizzate dal servizio per l'utente corrente. Una sede rimossa o non più accessibile viene sostituita dalla prima disponibile; senza sedi resta lo stato «Nessuna sede assegnata». Se lo storage non è disponibile, il cambio sede funziona comunque, senza persistenza. La demo conserva separatamente il proprio stato locale. La preferenza browser non modifica autorizzazioni o dati del servizio.

[Verifica browser di ricaricamento e cronologia](../../../tests/e2e/individual-ordering.spec.ts) e [test locali della navigazione e della preferenza sede](../../../apps/admin/src/test/admin-navigation.test.tsx). Le prove locali non attestano un rilascio online.
