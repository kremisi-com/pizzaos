# Gestione catalogo

**Foto, allergeni e altre opzioni** espone direttamente dosi, disponibilità, foto, abbinamenti e rimozione della pizza, senza una seconda card né campi duplicati per nome, prezzo, sezione e descrizione. Non contiene configurazioni di anteprima PoC, impasti, basi, formati o topping consentiti; le associazioni già salvate vengono conservate. Gli allergeni restano nelle schede ingredienti del Magazzino.

**+ Categoria** si trova all’inizio della barra categorie, prima della prima voce, con bordo evidenziato. Aggiunge una sezione vuota alla bozza anche quando non sono ancora presenti categorie.

L’editor operativo presenta categorie e prodotti a sinistra e una scheda di modifica a destra. Il selettore **Menu da modificare**, accanto a **Pubblica menu**, sceglie la bozza senza perdere le modifiche locali delle altre. **Impasti, basi e formati → Personalizza** apre la configurazione nella scheda destra: gli standard sono comuni a tutte le pizze e i supplementi sono differenze rispetto allo standard incluso, anche negative. Ricette e dosi restano accessibili nella sezione avanzata. Prezzi commerciali e ricette non si deducono dai nomi.

**Aggiungi pizza** apre nome, descrizione, ingredienti dal Magazzino con ricerca e selezione multipla, e prezzo. Gli ingredienti già nella base non sono aggiunti nuovamente alla ricetta del gusto. Foto, ricette e abbinamenti rimangono nelle opzioni avanzate. I salvataggi delle schede salvano la bozza sul servizio; il menu cliente cambia soltanto alla pubblicazione. Il menu pubblicato si modifica duplicandolo.

La card **Pizza custom** conserva combinazioni con nome libero, prezzo base, quota di extra scontati e percentuale. **Descrizione** è una textarea subito sotto **Nome combinazione**, senza card aggiuntiva né spunta di disponibilità; il valore di disponibilità già salvato è conservato. **Elimina combinazione** è accanto a **Salva combinazione** e richiede conferma. La quota conta le unità più costose, non limita le scelte e non sconta il prezzo base. Disattivare la card conserva le combinazioni e le nasconde dal Client alla pubblicazione. Prezzi e dosi degli extra si gestiscono nella scheda ingrediente del Magazzino, con **Possibile extra**. Le combinazioni precedenti conservano le scelte: **Collega gli extra al Magazzino** mostra le sostituzioni e richiede conferma esplicita. Dati incompleti richiedono verifica prima della pubblicazione. [Regole e casi limite](../../../../../.agents/product-definition/flows/menu-ordering.md#gusti-e-formule-di-composizione).

In **Menu** il gestore visualizza il menu pubblicato, crea o duplica più bozze per la sede selezionata, ne apre l’anteprima e sceglie quale pubblicare. Le bozze che non servono più si eliminano dal pannello con conferma. Nella bozza configura sezioni e ordine di esposizione, prezzi, foto, ricette, disponibilità, gruppi di scelta, abbinamenti e formule per gli extra. Gli ingredienti e le relative schede allergeni provengono dal Magazzino.

La composizione fornisce `MenuAdminApi`. Il servizio verifica permessi, revisione e contenuti a ogni salvataggio o pubblicazione e indica il campo da correggere quando un gruppo di scelte è incompleto o incoerente. Un conflitto conserva le modifiche locali finché il gestore sceglie di ricaricare. Le foto accettano JPEG, PNG e WebP fino a 2 MB per file. Le bozze salvate sono accessibili agli operatori della sede.

La demo autenticata usa invece `CatalogManager` con il dataset dimostrativo e callback aggiornate dalla composizione.

Ogni riga della bozza offre **Elimina** per rimuovere il prodotto dal menu, con conferma o annullamento. Anche la rimozione dalla scheda richiede conferma. La rimozione pulisce sezioni e abbinamenti; segue il normale salvataggio della bozza e la pubblicazione. Il menu pubblicato e le altre bozze restano invariati.

Nell’editor della bozza ogni sezione mostra sempre il campo **Descrizione**. **Modifica nome**, accanto alle frecce di riordino, rende modificabile il titolo nell’intestazione; Invio o l’uscita dal campo ripristinano la visualizzazione del titolo. Le modifiche seguono il normale salvataggio della bozza.

Verifica locale con `pnpm --filter @pizzaos/admin test`. I requisiti e i contratti del catalogo persistente sono in [.agents/design/2026-11-23-menu-ordering](../../../../../.agents/design/2026-11-23-menu-ordering/design.md).

Gli ingredienti importati sono selezionabili dalla stessa lista del Magazzino. Una dose vuota resta da verificare e si può salvare in bozza; pubblicazione e ordinazione richiedono dosi e scorte verificate. Le descrizioni promozionali non sono la fonte strutturata della ricetta.
