# Integrazione analytics e rider sul flusso individuale

Decisioni D56-D60. I moduli analytics e delivery hanno SDD e test indipendenti propri. Questa integrazione collega la stessa persistenza e identità ai confini HTTP e alle viste operative, preservando il servizio ordini canonico.

Il runtime condivide un repository decorato con journal analytics tra ordine, analytics e delivery. Un metodo server-only riderProgress riusa la transizione canonica; il guard assegnazione è valutato nella stessa transazione. La normale action non concede permessi rider e le route dedicate non restituiscono IndividualOrder. I frontend consumano le API /v1/pilot tramite il proxy esistente. Rider vive in apps/admin; analytics e gestione rider si aggiungono alla sede corrente.

Gli interventi ai file del flusso individuale devono attendere la stabilizzazione della chat proprietaria. Nessuna nuova duplicazione di ordini, database o identità. Il deploy è separato dall'integrazione locale; l'ambiente online richiede risorse/configurazioni esterne verificate.
