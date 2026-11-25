# Identità e accessi

Owner: `services/checkout-api` per Auth.js, sessioni e appartenenze; client/admin per pagine e proxy. Copre F01/F02, D04/D05/D07/D55/D57/D71/D72/D74/D76. La [demo](poc-and-interface.md) resta un percorso distinto dall'accesso operativo.

## Percorso operativo

1. Il cliente compone il carrello senza account e accede con Google o magic link prima del checkout. Il draft del dispositivo viene riletto e rivalidato, senza sincronizzazione automatica su un altro dispositivo.
2. Il superadmin è configurato sul servizio; crea sedi e autorizza le email degli operatori da admin. L'invito è un permesso, senza invio automatico di un messaggio di invito. L'operatore usa il normale login con quell'email.
3. Gli operatori hanno permessi equivalenti sulle sole sedi assegnate. Il superadmin può operare su tutte. Il rider è abilitato separatamente per sede e non acquisisce permessi operatore.
4. Admin e rider condividono il deploy frontend, con ingressi, home e login per host. Ogni sessione usa cookie Secure/HttpOnly limitati all'host; autenticarsi nell'admin non autentica automaticamente il rider o la sede cliente.
5. Il servizio verifica sessione, appartenenza e assegnazione a ogni richiesta protetta; la sola visibilità di una pagina non concede accesso. Le mutazioni richiedono origine consentita; i proxy non inoltrano identità scelte dal browser e non memorizzano risposte/sessioni in cache.

## Alternative ed errori

- Sessione assente: richiesta di accesso / HTTP 401; ruolo o sede non autorizzati: 403 (o 404 per risorse di una sede estranea sul sito ordini). La disattivazione del rider revoca letture e azioni.
- Guasto del servizio: nessuna shell riservata o modalità demo viene concessa come fallback. Configurazione runtime incompleta fallisce esplicitamente.
- Un sottodominio senza sede mostra sito non configurato. Callback Google e magic link devono tornare all'host autorizzato della sede; la configurazione canonica OAuth resta server-side. [Deploy](../architecture/pilot-deployment.md#sottodomini-delle-sedi).
- Il rider non riceve API di configurazione, analytics o dati Stripe. Il suo proxy ammette solo accessi e API rider; demo non disponibile sul suo host.
- L'ingresso demo sostituisce la sessione operativa sullo stesso host. Demo e dati locali non autorizzano chiamate alle API operative, né pagamenti Stripe.

## Verifiche e limiti

[Auth.js/PostgreSQL](../../../services/checkout-api/src/auth-runtime.test.ts), [domini e autorizzazioni](../../../tests/operational-domains.test.ts), [proxy](../../../tests/individual-proxy.test.ts), [isolamento demo](../../../services/checkout-api/src/demo-access.test.ts), [sottodomini](../../../services/checkout-api/src/store-subdomains.test.ts), [browser domini](../../../tests/e2e/operational-domains.spec.ts). Le prove Auth reali richiedono il database locale dedicato; quelle browser isolate non certificano Google o email esterni. Profilo completo, consensi e condizioni commerciali restano nel perimetro aperto D16/D31.
