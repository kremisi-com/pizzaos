# Implementazione privata pannello

Componente client React con stato periodo/date/query attiva, report ed errore. useEffect carica la query attiva e usa flag cleanup per ignorare risposte obsolete. Il cambio storeId rimonta un sotto-componente keyed storeId per azzerare query/report. Le funzioni effetto catturano il port corrente; nessun caricamento iniziato in render.

Metriche in definition list, classi Tailwind compatibili con pannelli operativi. Intl.NumberFormat it-IT currency EUR per gli importi. Lista semplice dei prodotti con quantità. Eventi select aggiornano query per periodi predefiniti; form custom valida date prima di aggiornare query. Retry cambia un contatore dipendenza effetto.

Checklist: mount/cambio sede today; copy italiana; cinque informazioni; periodi/custom; caricamento senza dati vecchi; errori e retry; race; vuoto; nessun mock/AI/export.
