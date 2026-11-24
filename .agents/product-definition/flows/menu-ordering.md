# Menu, composizione e preferenze alimentari

Decisione D79. L'operatore apre **Admin → Menu** nella sede, modifica o duplica una bozza, verifica l'anteprima e pubblica. Il menu pubblico mantiene ordine delle categorie e delle voci, foto statiche e disponibilità. Le bozze si possono eliminare. Pubblicando una bozza il menu precedente torna tra le bozze. Per una sede esistente il pannello parte dal catalogo in uso. Se due persone lavorano sullo stesso workspace, chi salva da una revisione superata ricarica prima di riprovare.

Se un gruppo di scelte impedisce il salvataggio o la pubblicazione, l'errore indica il campo da correggere. Per pubblicare, ogni gruppo deve contenere almeno una scelta; se non consente ripetizioni, la quantità massima non può superare il numero di scelte disponibili. Il gestore può correggere la bozza e riprovare; le modifiche restano nell'editor finché non ricarica il menu.

I prodotti semplici si aggiungono dalla scheda. I prodotti configurabili aprono i gruppi previsti per il prodotto. I gruppi possono richiedere una scelta singola, consentire più scelte o contare più unità della stessa opzione. L'aggiunta visibile nel carrello resta editabile. Una modifica delle disponibilità, delle ricette o del prezzo può richiedere la correzione della riga e un nuovo preventivo prima di pagare.

Le formule Simple, Wild e Savage applicano rispettivamente il 20%, 40% e 50% ai 3, 5 e 7 extra selezionati più costosi per unità di prodotto. Arrotondamento per singolo extra al centesimo. Le altre scelte si sommano al prezzo di partenza. Gli abbinamenti proposti sono acquistabili separatamente. Coupon e premi si applicano al totale prodotti risultante secondo [le regole esistenti](promotions-and-loyalty.md). Il servizio verifica le quantità della ricetta effettiva nel preventivo e durante la conferma.

Il menu e il carrello distinguono allergeni della composizione, avvertenze dichiarate e informazioni da verificare. L'ospite può filtrare il menu durante la consultazione. Il cliente autenticato può usare e modificare le proprie preferenze, anche svuotando la lista. La preferenza si legge nella sessione cliente. Il ristorante e il gruppo ricevono le scelte necessarie per l'ordine, con riepilogo delle opzioni nel preventivo e nello storico. D16/D31 restano decisioni di esercizio indipendenti.

Il carrello, la conferma, l'ordine con amici e la timeline usano i dati dell'ordinazione persistente. Il riordino copia la composizione dell'ordine e richiede un nuovo preventivo. Foto statiche e conferme con Stripe o contanti rientrano nel perimetro. Mancia, posizione GPS e recensioni restano incrementi separati.

Verifiche previste dal [disegno SDD](../../design/2026-11-23-menu-ordering/design.md), [suite HTTP](../../../services/checkout-api/src/menu-ordering.acceptance.test.ts) e [scenario browser](../../../tests/menu-ordering/menu-ordering.spec.ts). I risultati online si registrano dopo il collaudo della versione e della configurazione del pilota.
