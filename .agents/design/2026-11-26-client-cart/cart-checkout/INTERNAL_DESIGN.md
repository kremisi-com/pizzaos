# Implementazione

Selezionare porzioni del componente operativo esistente per vista, riutilizzando caricamento, draft e recupero. La feature cart espone IndividualCartScreen dal proprio entry pubblico, possiede e riusa gli stili POC e aggiunge un dock operativo con totale e CTA sopra la navigazione. Risolvere composizione con resolveMealComposition/resolveMenuComposition, anche per opzioni legacy. Tenere le operazioni checkout nel componente esistente. Elements imposta esplicitamente il locale italiano.

Checklist: percorsi dedicati; link di navigazione; draft unico; prezzi personalizzati; quantità/rimozione/svuotamento; stato vuoto; errori catalogo; checkout immediato; Stripe e recupero conservati; POC isolato; prove e documentazione coerenti.
