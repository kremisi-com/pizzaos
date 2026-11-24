# Scheda prodotto, classificazione pizza ed extra comuni

Approvato dall'utente il 24 novembre 2026: attuare tutte le proposte discusse con SDD. F04/F05, estensione D80/D82; decisione D83.

Una sola creazione prodotto e una spunta Pizza rendono esplicito il comportamento. La classificazione usa l'identità pizza esistente, senza un secondo booleano persistente. Gusti e formule restano distinti. Tutte le pizze ereditano gli extra abilitati nel Magazzino, anche senza formule custom attive. Gli standard restano comuni. I prodotti ordinari mantengono gruppi facoltativi propri.

La riclassificazione in bozza è esplicita e preceduta da riepilogo e conferma; conserva identità, collocazione, dati commerciali e scelte specifiche. Le ricette incompatibili con gli standard comuni bloccano la conversione con un messaggio correggibile, senza alterazioni silenziose. La riconversione include nella ricetta i componenti standard e conserva le sole scelte specifiche. Le formule custom restano nel proprio pannello e non sono convertibili in prodotti ordinari.

Magazzino possiede abilitazione, prezzo e dose degli extra. Il servizio sincronizza le bozze e verifica la firma prima della pubblicazione; scorte correnti e snapshot commerciali restano separati. Le scelte automatiche non vengono duplicate tra le configurazioni manuali. Gli extra storici non più abilitati cessano di essere aggiunte, mantenendo le ricette incluse; l'operatore vede il cambiamento prima di pubblicare.

Ownership: domain per contratti e trasformazioni pure, admin per anteprima/conferma e schede, servizio per validazione e pubblicazione, client per presentazione delle scelte specifiche nel dettaglio pizza. Nessuna modifica diretta a database, menu pubblicati o ordini storici.

Test indipendenti prima dell'implementazione; verifiche dei moduli coinvolti, build, architettura e flusso browser. Modifiche locali preesistenti preservate ed escluse dal commit della task.
