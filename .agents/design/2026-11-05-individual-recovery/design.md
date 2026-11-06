# Correzione gate ordine individuale

Due difetti riprodotti in verifica indipendente prima del gruppo: risposta checkout contanti persa lascia chiave associata al carrello precedente; eventi live non ricaricano catalogo. Questo intervento completa l’incremento individuale, non avvia il gruppo. Ownership client individual-ordering, port IndividualApi invariato. Fonte: D18/D37/D40/D49/D50/D54 e regole già approvate.

Test di regressione scritti da agente separato sulla sola base di REQUIREMENTS e CONTRACT_DESIGN; poi implementazione e verifiche client/E2E.
