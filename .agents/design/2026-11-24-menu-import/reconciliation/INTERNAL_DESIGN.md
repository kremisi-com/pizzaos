# Implementazione

Clonare lo stato prima di ogni operazione. Costruire indici normalizzati per ingrediente e ricetta con alias espliciti, rilevando ambiguità. Per ogni prodotto/opzione delle bozze e catalogo usare nome normalizzato e alias curati. Risolvere i nomi nel magazzino o creare ID deterministici dalla chiave normalizzata. Riutilizzare dosi note e stock. Applicare descrizione del manifest separatamente dalla lista strutturata. Non rimuovere collegamenti aggiunti dall'operatore. Incrementare una sola volta la revisione quando cambia il workspace. CLI JSON con schema verificato, repository PostgreSQL e dry-run che non sostituisce lo stato.

Checklist: normalizzazione, distinzione varianti, atomicità, null espliciti, idempotenza, editor, protezione pubblicazione/preventivo, documentazione e prova sul database del pilota.
