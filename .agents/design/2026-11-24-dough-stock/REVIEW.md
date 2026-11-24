# Verifica locale del 24 novembre 2026

D87 implementata su configurazione Admin, contratti e composizione di dominio, validazione e ordinazione del servizio, presentazione cliente. Il formato scala esclusivamente la voce associata all'impasto selezionato. La base standard precedente viene trasferita negli ingredienti inclusi della bozza; i menu pubblicati e gli ordini storici non vengono riscritti.

La skill SDD ha richiesto un agente di test indipendente, che ha ricevuto solo REQUIREMENTS e CONTRACT_DESIGN come specifica. RED iniziale: 7 test dominio/servizio falliti, poi 2 test UI falliti; GREEN: 18 nuovi test. Il test HTTP completa due pizze Integrale/Maxi, verifica riserva concorrente e scarico di 6 unità dell'impasto scelto, 2 pomodori e zero unità dell'altro impasto. Verifica anche allergeni e assenza di dosi nel catalogo pubblico.

Suite di regressione su domain, checkout-api, admin e client: 951 test passati, 22 skip preesistenti (provider/database opzionali). Typecheck e lint dei quattro workspace riusciti. Build admin, client e checkout-api riuscite. Controllo architettura passato con i quattro test del controllo stesso. Dopo la revisione finale del selettore, ripassati i 24 test di impasti/formati e pannello pizza.

Browser: `pnpm exec playwright test --config playwright.menu-ordering.config.ts tests/menu-ordering/dough-stock.spec.ts`, 1 passato. Confermati selezione filtrabile e sostituzione dell'associazione, salvataggio quantità, pubblicazione, assenza di Base nel menu/dettaglio cliente, scelta Integrale/Maxi, allergene Glutine e preventivo autorevole da 10 €. Screenshot desktop e mobile ispezionati. Un primo tentativo è stato interrotto durante una ricarica di sviluppo; il nuovo tentativo stabile è passato.

Checklist React: stato derivato senza effetti di sincronizzazione, associazione controllata, lista con chiavi ID, ricerca locale, pulsanti accessibili, ritorno focus alla chiusura e Escape. Nessun nuovo fetch nelle feature; contratti pubblici e ownership rispettati.

Nessuna pubblicazione o migrazione online eseguita o attestata. Le evidenze di rilasci precedenti restano riferite alle rispettive versioni. Le modifiche preesistenti/contemporanee e gli artefatti generati da Next sono esclusi dal commit di questo incremento.
