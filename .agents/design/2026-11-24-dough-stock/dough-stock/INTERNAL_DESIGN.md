# Implementazione

- Conservare il modello precedente esclusivamente per snapshot già salvati; inventoryMode discrimina la nuova composizione senza modificare ordini storici.
- Convertire esplicitamente le bozze nella configurazione Admin; generare topping di ricetta per la base standard, preservando dose e identità univoca. Liberare le collezioni base e i relativi riferimenti.
- Deducibilità: un impasto con una sola voce può riusare quell'ID. Un formato può riusare dose comune e delta soltanto se univoci per tutti gli impasti; altrimenti null.
- Proiettare impasto con ricetta di una unità sulla voce associata; formato con ricetta vuota e metadato doughQuantity. Il resolver applica il formato solo alle unità dell'opzione impasto. Quantità ignota rende invalida la composizione server.
- Il serializer pubblico elimina doughQuantity e tutte le dosi, conservando riferimenti ingredienti per allergeni e anteprime. Il resolver pubblico usa una unità simbolica, non esegue riserve.
- Il servizio verifica shape, riferimenti, assenza di basi/ricette residue nel modello nuovo e completezza alla pubblicazione.
- Test indipendenti sui contratti, regressioni storiche, lint/typecheck/test/build richiesti, revisione diff e commit/push.

Checklist: selezione unica filtrabile; dose positiva per formato; nessun moltiplicatore condimenti; rimozione basi UI; migrazione idempotente; dati incompleti bloccati; proiezioni browser non autorevoli; allergeni conservati; documentazione aggiornata.
