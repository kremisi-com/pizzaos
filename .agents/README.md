# Documentazione di lavoro per gli agent

`.agents/` raccoglie specifiche di prodotto, decisioni, piani implementativi e workflow degli agent. Applicare progressive disclosure: partire da questo indice, aprire solo la fonte proprietaria del modulo/flusso coinvolto e fermare le task che richiedono decisioni ancora aperte.

## Aree

- [`product-definition/`](product-definition/README.md) — specifiche e decisioni correnti del prodotto definitivo. Consultare `decisions.md` prima di pianificare o implementare flussi interessati.
- `planning/PizzaOS_POC/` — materiale storico della proof of concept; non è autorità per il comportamento del prodotto definitivo quando contrasta con `product-definition/`.
- `design/` — design SDD di refactor o incrementi tecnici datati; consultare solo se pertinente al cambiamento.
- `skills/` — procedure agent locali, da leggere quando attivate dalla natura della task.

Le fonti correnti hanno precedenza su piani storici. Non spostare o cancellare l'archivio POC finché ogni parte utile non è migrata o esplicitamente scartata.
