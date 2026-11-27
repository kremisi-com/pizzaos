# Riesame locale: pagina Ordini cliente

## Perimetro

Pagina `/ordina/ordini` nello stile del POC, alimentata soltanto da `IndividualApi`. Ordini in corso e storico acquistato, timeline consegna/ritiro, stati pagamento/rimborso, note, aggiunte esistenti, annullamento e riordino nel draft operativo. Navbar, conferme individuali/gruppo e destinazioni precedenti sono coerenti. GPS, ETA simulati, feedback e centro notifiche sono esclusi.

La demo resta separata. Nessuna modifica al backend, allo schema o alle configurazioni commerciali. Nessun deploy o collaudo online attestato.

## Evidenze

- Test indipendenti scritti usando solo requisiti e contratto: prima esecuzione fallita per entry assente; 35 casi poi verdi, inclusa la conservazione delle note confermate durante una rilettura obsoleta.
- Test riordino: 6 casi per composizione acquistata, esclusione fascia/benefici, conservazione note, blocchi pagamenti/tentativi, race fra schede e storage negato.
- Navigazione: 7 casi per pagina dedicata, selezione e separazione demo; regressione checkout mirata: 11 casi verdi.
- Playwright con servizio isolato: 2 scenari verdi (ospite e percorso completo checkout, note, avanzamento, storico, riordino). Screenshot ispezionati a 375/390/1280 px, senza overflow; nessun secondo ordine generato dal riordino.
- Suite client completa: 48 file, 273 test verdi.
- TypeScript e lint client verdi. Build client completata, route `/ordina/ordini` presente. Controllo architettura e quattro test del checker verdi.

Il primo collaudo ha individuato il transitorio svuotamento della textarea dopo salvataggio: la schermata applica ora lo snapshot confermato e scarta revisioni precedenti prima della rilettura. Il test indipendente copre questa regressione.

## Limiti

Gli account, il repository e i provider del collaudo browser appartengono al fixture isolato. Le prove non certificano DNS, autenticazione Google, Stripe esterno o un rilascio cloud. Le modifiche concorrenti non appartenenti a questa attività restano fuori dal commit tramite indice Git isolato.
