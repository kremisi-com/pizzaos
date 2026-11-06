# Implementazione

@auth/core con provider Google e Nodemailer, @auth/pg-adapter e tabelle dedicate. Auth Request/Response montata dal servizio dietro proxy allowlist; basePath /api/pilot/auth. Session lookup tramite Auth /session con cookie della richiesta e callback user.id. Origine browser inoltrata solo da proxy autenticato con segreto server; webhook Stripe accessibile separatamente con firma.

Stripe PaymentIntents e confirmCardPayment in iframe Elements. Repository PostgreSQL snapshot in transazione; interval worker con protezione sovrapposizione e shutdown ordinato. SSE con cursori e heartbeat, fallback HTTP GET eventi. Le credenziali di test esistono solo in harness separati dal server entrypoint.

Checklist: sessioni reali, isolamento ruoli, origine/CSRF, corpo webhook grezzo, riconciliazione, worker, migrazione, proxy, configurazione e documentazione.
