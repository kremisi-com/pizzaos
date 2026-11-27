# Interni proposti — composizione Box

- Introdurre componenti dedicati dentro catalog/components, selezionati dal ramo productType=box di MenuProductForm. Conservare il percorso degli altri tipi e quello compatibile per configurazioni precedenti.
- Riutilizzare selettori filtrabili e MenuRecipeFields dove coerente; rendere configurabili aiuto/terminologia senza cambiare il default delle altre schede.
- Separare stato di apertura, filtri e aggiunta in corso dai dati della bozza. Mantenere chiavi stabili basate su ID.
- L'aggiunta guidata prepara un'opzione locale; genera l'ID persistente e aggiorna options/optionIds insieme alla conferma. Mappare la voce del Magazzino solo dopo verifica delle regole correnti di dose e composizione. Non importare il suo prezzo.
- Tradurre quantità esatta/intervallo in min/max; il cambio di modalità richiede valori espliciti coerenti e non ripristina default su dati salvati.
- Estrarre la riga compatta di opzione; i dettagli riusano l'editor completo. Non cancellare campi nascosti quando si modifica un altro campo.
- Collegare le mutazioni allo stesso onChange e al contenitore di autosalvataggio esistente; verificare gli eventi blur quando si chiudono dettagli o controlli.
- CSS limitato ai componenti Box; rispettare scroll e layout della scheda operativa.

Checklist: [ ] R1 isolamento tipi; [ ] R2 riepilogo gruppo; [ ] R3 D86; [ ] R4 quantità; [ ] R5 aggiunta/conferma/annulla; [ ] R6 dettagli senza perdita; [ ] R7 dati precedenti e riferimenti mancanti; [ ] R8 autosalvataggio/errori; [ ] R9 accessibilità e viewport.
