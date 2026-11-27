# Riallineamento del checkout operativo

Andrea approva il 27 novembre 2026 gli interventi dell'analisi UX/UI: usare il carrello come riferimento, rendere persistenti totale e azione, separare le sezioni, esporre le alternative principali e spiegare avanzamento e blocchi. Si interviene su `/ordina/checkout`; il checkout POC e la raccolta gruppo conservano il proprio flusso.

Il client possiede la presentazione; `IndividualApi` e il servizio conservano autorità su preventivi, disponibilità, slot, pagamenti e tentativi. Nessun contenuto commerciale viene spostato dall'admin nel codice. Le etichette principali esistenti sono riutilizzate.

Una sola task integra layout e interazioni. La schermata dedicata presenta intestazione coerente col carrello, sezioni distinte e un blocco fisso con totale stimato/verificato e prossimo passo. Stime ricavate dai resolver pubblici della composizione; nessuna consegna o sconto inventato. Ritiro/consegna e contanti/carta diventano gruppi radio accessibili. Gli errori e le invalidazioni restano espliciti. La verifica positiva porta il focus al riepilogo. Il recupero di un tentativo o pagamento precedente precede qualsiasi nuovo invio, anche a carrello vuoto.

Verifiche: test indipendenti del componente contro il port pubblico, regressioni individuali/promozioni, prova browser mobile e desktop, lint/typecheck/test/build client e controllo architettura. Stato locale e online sono distinti; nessun deploy è parte della richiesta.
