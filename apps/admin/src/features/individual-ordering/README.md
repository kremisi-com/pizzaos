# Ordine individuale persistente

Questa feature espone il modulo di configurazione persistente della sede per Menu, Magazzino e Profilo. La composizione fornisce i dati e salva tramite il port pubblico `IndividualApi`. Lista, dettaglio e azioni sugli ordini sono nella [feature Ordini](../orders/README.md). Gli ordini, i totali, le riserve e i pagamenti sono autorevoli nel servizio checkout.

In Profilo l'operatore cerca l'indirizzo con `StoreAddressApi`, conferma una corrispondenza e salva. Il servizio registra le coordinate della corrispondenza. Le sedi precedenti possono salvare le altre impostazioni conservando le coordinate già registrate.

Il Profilo mostra anche la settimana tipo, le capacità per fascia e le date protette. Il servizio genera le disponibilità del checkout nel fuso della sede. Le modifiche del calendario vengono salvate con la configurazione della sede.

La modalità demo precedente è separata. Requisiti e contratti sono in `.agents/design/2026-11-05-individual-ordering/ordering-surfaces/`. Verificare lint, typecheck, test e build dell'app, controllo architettura ed E2E individuale.

Il Profilo mostra il link pubblico di una sede con sottodominio. Il superadmin può assegnare una nuova etichetta a una sede al momento della creazione o al primo salvataggio dell'indirizzo pubblico. [Regole del servizio](../../../../../.agents/product-definition/flows/customer-ordering-and-payment.md#sottodomini-delle-sedi).
