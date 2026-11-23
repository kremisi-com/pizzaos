# Accesso POC e interfaccia operativa

## Accesso alla demo

Dopo il successo del form demo o prova gratuita, la landing presenta due pulsanti che aprono il rispettivo POC senza chiedere la password. Il servizio verifica origine e pass destinato all'host. Il pass è valido dieci minuti e viaggia nel corpo del POST. Le richieste di contatto mantengono il loro flusso.

Cliente e operatore possono anche aprire direttamente `/poc` sul rispettivo dominio. Senza una sessione demo valida vedono la password dedicata e il collegamento all'area ordinaria. Dopo l'accesso vedono la demo esistente, con dati fittizi, reset e carta simulata. La sessione vale soltanto sull'host su cui è stata aperta. L'uscita revoca la sessione nel browser e apre l'accesso ordinario. Il rider usa il suo dominio operativo.

Una password errata torna a `/poc` con un errore. Se la password manca nella configurazione del servizio, il modulo è disabilitato. L'accesso ordinario da `/accesso`, il login demo precedente e le protezioni D72 rimangono disponibili. L'ingresso demo sostituisce la sessione operativa sullo stesso host. Usare una finestra privata per mantenere aperte entrambe le sessioni.

Un form rifiutato non emette pass. Se manca la configurazione per i pass il form può comunque riuscire e mostrare i link di accesso manuale. Un pass scaduto, alterato o destinato all'altro host non concede la sessione. [Verifica del form e delle due navigazioni](../../../tests/e2e/landing-poc.spec.ts).

Le verifiche comprendono [accesso manuale in Playwright](../../../tests/e2e/session-demo.spec.ts), [test del servizio](../../../services/checkout-api/src/demo-landing-handoff.test.ts) e [riscontri online per l'accesso dalla landing](../../../services/checkout-api/online-deployment.md#accesso-dalla-landing-del-23-novembre-2026). Il POC usa il checkout simulato. Catalogo, ordini, pagamenti e stati operativi delle viste ordinarie provengono dai contratti persistenti.

## Interfaccia operativa

Le superfici di ordinazione e il pannello Menu seguono [il flusso D79](menu-ordering.md). Foto statiche, sezioni, menu pubblicati, personalizzazioni e sconti per gli extra provengono dal catalogo persistente. La timeline e lo storico usano gli ordini reali e l'ordine con amici usa la raccolta persistente. La demo autenticata rimane disponibile con il proprio catalogo e pagamenti simulati.

Restano da collegare al prodotto le funzioni demo di recensione, abbonamenti, mappa GPS e le viste promozionali estese. Dashboard, magazzino, marketing e insight sono descritti nell'[inventario corrente](../flow-inventory.md).
