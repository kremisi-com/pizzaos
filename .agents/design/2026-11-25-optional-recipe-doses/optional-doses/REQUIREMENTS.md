# Requisiti confermati

1. Pubblicare una bozza con dose ricetta null riesce per prodotti ordinari, componenti pizza, gusti, formule ed extra abilitati. Quantità impasto formato null è ammessa. I valori null restano null nello snapshot; non inserire unità fittizie.
2. Un prodotto e le opzioni con dose null sono disponibili e ordinabili quando l'ingrediente ha scorta null o positiva. Prezzi, nomi, riferimenti ingredienti, scelte obbligatorie e disponibilità manuale mantengono le validazioni esistenti. Extra senza prezzo restano bloccanti, extra con prezzo e dose null sono offerti.
3. Con scorta zero applicare la policy esistente anche per dose null: allow disponibile/ordinabile; disable visibile Esaurito ma non ordinabile; hide assente e non ordinabile. Le opzioni esaurite seguono la stessa policy senza impedire il prodotto base.
4. Una dose sconosciuta non genera riserve né consumo fittizio: checkout e completamento lasciano la scorta dell'ingrediente invariata. Le dosi note continuano a riservare/consumare e a impedire sovraprenotazioni. Se contributi noti e ignoti dello stesso ingrediente sono combinati nella composizione, la dose totale è ignota e non va inventata.
5. La composizione è valida con dose null; mantiene null nella ricetta risolta, riferimenti ingredienti e allergeni. Rimozioni e sostituzioni continuano a funzionare. Formato con quantità impasto null non genera un consumo impasto fittizio.
6. Le regole valgono per preventivi e checkout usati anche da ordini di gruppo e aggiunte. Nessuna modifica automatica ai dati commerciali.
