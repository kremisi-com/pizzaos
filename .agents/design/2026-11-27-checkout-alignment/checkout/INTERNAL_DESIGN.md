# Disegno interno

Un componente privato della feature presenta il checkout dedicato, ricevendo stato e callback dalla schermata che già coordina il port. La schermata inline preesistente resta disponibile per la vista `all`. Il componente dedicato usa CSS locale, token brand e misure del carrello senza importare gli stili privati della feature sorella.

Il blocco fisso espone stima oppure quote, motivo di blocco e azione corrente. La stima usa i resolver pubblici `resolveMenuComposition` e `resolveMealComposition`. Il contenuto riserva spazio sufficiente al blocco e alla navbar. L'area di recupero ha precedenza sul nuovo ordine.

Le modifiche restano inoltrate a `changeCart`; la quote viene invalidata secondo il fingerprint esistente. Lo stato locale conserva l'esistenza di una quote precedente per spiegare l'invalidazione. Il focus passa al riepilogo solo quando cambia la quote, senza rubare focus ai normali aggiornamenti del catalogo. Gli errori restano annunciati e sono ripetuti vicino all'azione quando necessario.

Il selettore slot condiviso può ricevere un'opzione facoltativa per la presentazione dedicata (raggruppamento per giorno e previsione ASAP), conservando il contratto preesistente altrove. Stripe conserva Elements; la UI osserva il caricamento tramite callback esistente.

Checklist: intestazione e sezioni; radio accessibili; stima composta corretta; quote e sconti server; azione persistente e spazio finale; spiegazioni blocchi/invalidazioni; focus dopo verifica; orario previsto distinto; recupero a carrello vuoto; nessuno storico; test indipendenti e regressioni; documenti correnti; commit task-only.
