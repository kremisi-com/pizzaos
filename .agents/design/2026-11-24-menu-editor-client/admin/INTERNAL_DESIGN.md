# Interni

Stato discriminato per selezione prodotto/configurazione. CSS Modules con griglia due colonne e fallback mobile. Selettore ricercabile con checkbox native e chip removibili. Standard e sync usano entry point domain. Estendere StoreConfiguration per campi extra Magazzino. Conservare editor generico e pannelli avanzati per legacy.

Checklist: categorie; pannello destro; ingredienti; defaults; formule; toggle; salvataggi; magazzino; responsive.

Annulla configurazione ripristina solo dimensioni, standard e scelte ammesse, senza annullare modifiche parallele alle combinazioni. Gli ingredienti inclusi usano una sorgente distinta ingredient:<id> per conservare una dose normale indipendente dalla dose extra. Gli avvisi passano dal contratto pubblico features/notifications; il provider rimane nella composizione.
