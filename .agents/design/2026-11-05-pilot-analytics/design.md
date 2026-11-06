# Analytics reali per il pilota

Fonte: D22, D59 e D60 del registro decisioni, approvati il 2026-11-05. Le analytics appartengono al servizio checkout per autorizzazioni, attribuzione temporale e dati persistiti; l'admin presenta il risultato tramite un port HTTP pubblico. Nessun mock entra nel conteggio.

## Risultato

Per una sede autorizzata l'operatore consulta ordini completati, vendite comprensive di consegna, valore medio, annullamenti e quantità vendute per prodotto. Filtri oggi, ultimi 7/30 giorni e date personalizzate nel fuso della sede. Vendite attribuite al completamento, annullamenti all'annullamento; nessun export o insight AI.

## Integrazione con l'incremento ordine in corso

Il contratto IndividualOrder attuale non conserva le date finali. Un decorator del repository registra nella stessa transazione ogni nuova transizione a completed/cancelled, conservando la data autorevole e lo snapshot dei valori e delle righe. Il journal fa parte del documento persistito: i riavvii e i retry non duplicano i conteggi. Gli ordini già finali prima dell'installazione del decorator non hanno una data affidabile e vengono esclusi: mai inferire il completamento da createdAt.

Il decorator non modifica i contratti del repository esistente. La composizione runtime deve avvolgere una sola volta il repository prima di costruire ordering e analytics. Il campo opzionale timeZone della sede viene configurato tramite saveStore/admin; per i soli record pilota precedenti senza campo si mantiene compatibilità con Europe/Rome. Non usare il fuso del browser.

## Ownership e integrazione riservata al coordinatore

- Nuovi tipi condivisi: packages/domain/src/pilot-analytics.ts, da esportare dall'entry point pubblico.
- Servizio e journal: services/checkout-api/src/analytics/.
- Presentazione italiana con port iniettato: apps/admin/src/features/pilot-analytics/.
- Il coordinatore registra GET /v1/pilot/stores/:id/analytics, costruisce il servizio con repository decorato, aggiunge timeZone alla configurazione sede e monta il pannello nella composizione admin dopo la stabilizzazione del flusso base. Il browser chiama /api/pilot/v1/pilot/stores/:id/analytics tramite l'adapter della composizione e non legge il database.
- I rider sono conservati in delivery.riders, separati da memberships. Un rider senza membership operatore non è autorizzato alle analytics.

## Verifica

Test indipendenti ricevono solo REQUIREMENTS.md e CONTRACT_DESIGN.md. Coprono isolamento sede, assenza sessione, cattura/rollback/retry, dati non retrodatati, prezzi storici, date locali e cambio ora, filtri, input non valido e stati UI. Le prove del modulo non equivalgono a verifica dell'endpoint o del deploy, riservate all'integrazione.
