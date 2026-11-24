# Gestione catalogo

In **Menu** il gestore visualizza il menu pubblicato, crea o duplica più bozze per la sede selezionata, ne apre l’anteprima e sceglie quale pubblicare. Le bozze che non servono più si eliminano dal pannello con conferma. Nella bozza configura sezioni e ordine di esposizione, prezzi, foto, ricette, disponibilità, gruppi di scelta, abbinamenti e formule per gli extra. Gli ingredienti e le relative schede allergeni provengono dal Magazzino.

La composizione fornisce `MenuAdminApi`. Il servizio verifica permessi, revisione e contenuti a ogni salvataggio o pubblicazione e indica il campo da correggere quando un gruppo di scelte è incompleto o incoerente. Un conflitto conserva le modifiche locali finché il gestore sceglie di ricaricare. Le foto accettano JPEG, PNG e WebP fino a 2 MB per file. Le bozze salvate sono accessibili agli operatori della sede.

La demo autenticata usa invece `CatalogManager` con il dataset dimostrativo e callback aggiornate dalla composizione.

Verifica locale con `pnpm --filter @pizzaos/admin test`. I requisiti e i contratti del catalogo persistente sono in [.agents/design/2026-11-23-menu-ordering](../../../../../.agents/design/2026-11-23-menu-ordering/design.md).
