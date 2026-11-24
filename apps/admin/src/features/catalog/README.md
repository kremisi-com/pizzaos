# Gestione catalogo

In **Menu** il gestore visualizza il menu pubblicato, crea o duplica più bozze per la sede selezionata, ne apre l’anteprima e sceglie quale pubblicare. Le bozze che non servono più si eliminano dal pannello con conferma. Nella bozza configura sezioni e ordine di esposizione, prezzi, foto, ricette, disponibilità, gruppi di scelta, abbinamenti e formule per gli extra. Gli ingredienti e le relative schede allergeni provengono dal Magazzino.

La composizione fornisce `MenuAdminApi`. Il servizio verifica permessi, revisione e contenuti a ogni salvataggio o pubblicazione e indica il campo da correggere quando un gruppo di scelte è incompleto o incoerente. Un conflitto conserva le modifiche locali finché il gestore sceglie di ricaricare. Le foto accettano JPEG, PNG e WebP fino a 2 MB per file. Le bozze salvate sono accessibili agli operatori della sede.

La demo autenticata usa invece `CatalogManager` con il dataset dimostrativo e callback aggiornate dalla composizione.

Ogni riga della bozza offre **Elimina** per rimuovere il prodotto dal menu, con conferma o annullamento. Anche la rimozione dalla scheda richiede conferma. La rimozione pulisce sezioni e abbinamenti; segue il normale salvataggio della bozza e la pubblicazione. Il menu pubblicato e le altre bozze restano invariati.

Nell’editor della bozza ogni sezione mostra sempre il campo **Descrizione**. **Modifica nome**, accanto alle frecce di riordino, rende modificabile il titolo nell’intestazione; Invio o l’uscita dal campo ripristinano la visualizzazione del titolo. Le modifiche seguono il normale salvataggio della bozza.

Verifica locale con `pnpm --filter @pizzaos/admin test`. I requisiti e i contratti del catalogo persistente sono in [.agents/design/2026-11-23-menu-ordering](../../../../../.agents/design/2026-11-23-menu-ordering/design.md).

Gli ingredienti importati sono selezionabili dalla stessa lista del Magazzino. Una dose vuota resta da verificare e si può salvare in bozza; pubblicazione e ordinazione richiedono dosi e scorte verificate. Le descrizioni promozionali non sono la fonte strutturata della ricetta.
