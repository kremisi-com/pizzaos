# Requisiti osservabili

- Il catalogo distingue impasti, basi (Rossa/Bianca), formati, topping, gusti, formule e prodotti ordinari. Le ricette referenziano ingredienti del Magazzino.
- Una Margherita parte da un gusto con topping inclusi; Simple, Wild e Savage partono senza gusto. Una formula non può dichiarare un gusto.
- Il prezzo completo comprende le scelte standard. Con prezzo 600 e supplemento impasto 120 il totale senza extra è 720. Rimuovere un topping incluso non riduce il prezzo. Una scelta alternativa sostituisce la ricetta standard, senza sommare entrambe.
- Simple sconta i 3 extra più costosi del 20%, Wild i 5 del 40%, Savage i 7 del 50%. Gli extra oltre quota restano a prezzo pieno. Ogni unità scontata è arrotondata al centesimo prima della somma. Su prezzo 500 ed extra 220/210/190/110 Simple costa 1106.
- Scelte di un altro catalogo, riferimenti mancanti, ID duplicati, gusti/formule incoerenti e ricette non valide vengono rifiutati. Il server non si fida dei prezzi o delle ricette della proiezione inviata dal browser.
- Dosi e scorte ignote sono conservate in bozza e bloccano la pubblicazione quando necessarie. Le scorte sono verificate sulla composizione effettiva. Gli allergeni dipendono dagli ingredienti effettivamente presenti.
- Un topping incluso disattivato dal gestore rende non acquistabile la composizione che lo conserva; rimuoverlo ripristina la validità se le altre scelte sono valide, senza nascondere l'intero gusto.
- Le bozze seguono autorizzazione sede, revisione, anteprima e pubblicazione esistenti. Nessuna pubblicazione automatica durante conversione.
- La migrazione usa una mappatura esplicita degli ID; anteprima senza scritture; ripetizione senza duplicazioni; riferimenti ambigui/mancanti bloccano l'operazione. Gli ordini storici e i pagamenti rimangono invariati.
- Cataloghi ordinari senza catalogo pizza restano compatibili. Ordine individuale e gruppo condividono il calcolo; snapshot e storico conservano la composizione acquistata.
