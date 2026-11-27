# Interni proposti — riepilogo e flusso completo

- Componente puro interno al catalogo, con formattazione monetaria italiana e risoluzione nomi dal Magazzino corrente. Nessun nuovo export pubblico del package, fetch o stato persistente.
- Derivare contenuto fisso, min/max, ripetizioni e supplementi dal prodotto, mai dalla descrizione promozionale. Riutilizzare la derivazione del riepilogo dei gruppi, se introdotta nel primo incremento.
- Rendere esplicite configurazioni incomplete; non dedurre dosi dai nomi o dal numero di scelte.
- Posizionare il riepilogo nella scheda senza coprire comandi o introdurre altre aree di scroll. Stato di salvataggio gestito dal contenitore corrente.
- Aggiungere test di integrazione del catalogo per aggiornamento locale, errore/retry e ricaricamento; estendere autosave dove necessario.
- Aggiungere una spec browser dedicata nell'harness menu-ordering per admin e cliente. La box-dialog-layout esistente copre il dialog cliente, non sostituisce la verifica del nuovo editor admin.
- Coprire prezzo base e opzioni gratuite/a supplemento, ripetizioni e gruppi multipli senza dipendere da testi promozionali del fixture.
- Aggiornare flusso menu-ordering e README catalogo dopo implementazione. Riesaminare i soli cambiamenti del task prima di commit/push.

Checklist: [ ] V1 dati locali e supplementi; [ ] V2 più gruppi; [ ] V3 incompletezza; [ ] V4 salvataggio/pubblicazione; [ ] V5 abbinamenti/foto; [ ] V6 percorso browser; [ ] V7 accessibilità/layout; [ ] V8 documentazione ed evidenze.
