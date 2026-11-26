# Carrello operativo e Stripe sandbox

Richiesta: rendere il carrello CLIENT funzionante con l'esperienza del POC e Stripe sandbox. F09/F10: mantenere il contratto IndividualApi e l'autorità del servizio su preventivi, disponibilità e pagamento. Il POC autenticato resta isolato.

La navigazione operativa espone menu, carrello e checkout dedicati sotto `/ordina`. Il carrello riprende struttura e controlli del POC, con dettagli delle personalizzazioni e prezzi stimati calcolati tramite il dominio. Il checkout conserva preventivo autorevole, Elements, recupero e idempotenza esistenti. Nessuna configurazione commerciale della sede viene cambiata; queste restano nell'admin.

Stripe usa le credenziali sandbox esistenti, verificate senza esporle. Le verifiche locali con fixture non costituiscono prova del provider esterno.
