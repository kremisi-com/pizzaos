# Requisiti osservabili

- Analizzare prima di applicare: indicare ingredienti nuovi, corrispondenze e dati mancanti senza scrivere.
- Normalizzare maiuscole, spazi, accenti e apostrofi. «  MOZZARÈLLA » riusa «Mozzarella». Alias esplicito «mozzarela» riusa «Mozzarella». Corrispondenze multiple sono un errore e non cambiano lo stato.
- «Datterini gialli» e «Datterini rossi» restano distinti; «Pesto di Pra’ senza aglio» è un singolo ingrediente, non genera «aglio» o «senza aglio».
- Per prodotti e opzioni corrispondenti nelle bozze e nel pubblicato collegare tutti gli ingredienti per ID. Non alterare altri prodotti, prezzi, ordini, riserve o pubblicazione. Le descrizioni provengono esplicitamente dal manifest.
- Dosi note sono conservate se la fonte non ne fornisce; scorte esistenti non cambiano. Ingredienti nuovi senza scorta hanno stock null; dose ignota nella ricetta è null. Nessuna quantità o unità inventata.
- Una seconda applicazione identica non cambia stato, revisioni o ID. Anche dopo reimportazione della stessa bozza gli ID del magazzino e le dosi inserite dall'operatore restano validi.
- Le ricette con dosi o scorte mancanti sono salvabili, visibili nell'editor e correggibili; non possono essere pubblicate né ordinate. Il magazzino mostra scorta da verificare anziché zero. L'editor consente di selezionare ingredienti importati anche senza scorta verificata.
- Il comando usa il repository transazionale esistente; dry-run predefinito, apply esplicito, nessuna connessione o dati privati nei file versionati.
