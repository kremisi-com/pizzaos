# Contratti di interfaccia

Gli editor admin ricevono bozza, ingredienti e callback di modifica. La composizione amministrativa conserva salvataggio, revisione, pubblicazione e upload esistenti. La proiezione usa esclusivamente l'entry point pubblico `@pizzaos/domain`.

La scheda operativa riceve catalogo pubblico e voce proiettata; restituisce una riga `IndividualLine` con ID e quantità delle scelte, note e quantità pizza. Il servizio conferma il prezzo. Nessuna dipendenza del percorso operativo da localStorage o repository demo.

Le convenzioni grafiche sono quelle di `ProductDetailScreen` nel PoC; i controlli esistenti restano il riferimento di accettazione. La preview alimentare non concede validità a composizioni prive di informazioni necessarie.
