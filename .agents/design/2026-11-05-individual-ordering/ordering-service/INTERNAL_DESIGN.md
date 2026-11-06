# Implementazione

Snapshot transazionale serializzato con stores/orders/memberships/idempotency/events. Clock e ID iniettati. Ricette aggregate su tutte le righe incluse opzioni; validazione runtime per input HTTP e diretti. Hash SHA256 del preventivo include carrello canonico, linee/prezzi e slot risolto; idempotenza confronta hash richiesta prima di ricalcolare preventivo. Non persistere segreti Stripe.

Due fasi per operazioni remote: registrare ordine e chiave prima della chiamata; effettuare pagamento/rimborso fuori dal lock; applicare risultato con controllo stato/revisione e riconciliare tramite worker. Identificatori ordine stabili e chiavi provider derivate da ordine/tentativo. Payment port create/read/cancel/refund; port refund read per verifica pending. Tutte le scritture passano dalla repository; PostgreSQL con lock FOR UPDATE. Nessuno stato autorevole in localStorage.

Checklist: R1 autorizzazioni; R2 prezzi e ricette; R3 area; R4 concorrenza/rilascio; R5 hash e retry; R6 pagamento separato; R7 scadenze; R8 transizioni; R9 attesa; R10 rimborsi; R11 eventi; R12 riserve incerte. Test indipendenti non leggono questo documento.
