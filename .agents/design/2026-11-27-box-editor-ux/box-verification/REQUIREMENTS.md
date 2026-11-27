# Requisiti proposti — riepilogo e flusso completo

- V1. Il riepilogo usa la bozza locale corrente: 1 Apribottiglie, gruppo da 3 birre con ripetizioni, prezzo base 16,50 €. Per un'alternativa da +1 €, indica il supplemento per unità scelta senza dichiarare un totale unico.
- V2. Una box con tutti i supplementi a zero è distinguibile da una con supplementi. Con più gruppi e intervalli mostra le regole di ciascuno. Non stima disponibilità o totale usando regole diverse dal servizio.
- V3. Dati incompleti, riferimenti mancanti e quantità null non producono un riepilogo apparentemente completo: segnalarli senza inventare nomi, dosi o prezzi.
- V4. Modifica locale, salvataggio in corso, errore e salvataggio riuscito restano distinguibili. Il riepilogo non dichiara la Box pubblicata prima della pubblicazione.
- V5. Abbinamenti consigliati risultano separati dal contenuto incluso. Il riepilogo non li somma al prezzo né li presenta come omaggi. Foto e disponibilità restano modificabili.
- V6. Percorso browser: crea Box → aggiungi contenuto fisso → configura 3 scelte ripetibili → salva → ricarica → pubblica → cliente seleziona due unità di una birra e una di un'altra → preventivo coerente con prezzo e supplementi. Prima della pubblicazione il cliente conserva il menu precedente.
- V7. Un operatore completa il percorso con tastiera; a desktop e viewport stretto raggiunge riepilogo, dettagli, chiusura e comandi senza sovrapposizioni o perdita del focus.
- V8. Documentazione corrente aggiornata nella stessa implementazione; prove locali e prove online registrate separatamente. Nessuna dichiarazione di rilascio sulla sola base di un push.
