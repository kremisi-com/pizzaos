# Operational orders

Owns the admin order queue and detail views. The demo `OrdersDashboard` displays its supplied orders and reports status changes through its callback. `OperationalOrders` reuses the table and detail layout with persistent orders, actual contact and payment data, and the actions supported by the live service.

Admin composition owns the active store and the source of each dataset. Both views render their supplied orders and request changes through callbacks.

Run `pnpm --filter @pizzaos/admin test` for dashboard, detail, and shell integration coverage.

`OperationalGroupOrders` mostra i gruppi al primo incasso con «Ordine di gruppo ancora in corso», senza comandi cucina. La composizione fornisce `GroupOperationsApi`, polling revisionato per sede e azioni di rimborso. Dopo invio `OperationalGroupPayments` resta nel dettaglio canonico: quote, residuo contanti e rimborsi appartengono al servizio. Il rimborso torna sempre al finanziatore effettivo e non riscrive la comanda inviata. [Regole correnti](../../../../../.agents/product-definition/flows/group-ordering.md).
