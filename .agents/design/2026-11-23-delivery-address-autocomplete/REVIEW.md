# Verifica locale del 23 novembre 2026

- Il client supera lint, typecheck, build di produzione e 118 test Vitest.
- Il servizio supera lint, typecheck, build e gli 8 test per confine HTTP e adapter Geoapify. I test verificano anche l’uso della seconda fascia di distanza a partire dal civico scelto.
- I tre scenari Playwright dedicati verificano l’ordine ospite, la scelta da tastiera, il passaggio al ritiro, il calcolo del preventivo individuale e di gruppo e il recupero immutato del tentativo originale. La ricerca usa risposte simulate. Il preventivo proviene dal servizio locale. I sei scenari browser preesistenti della configurazione gruppo sono passati nella stessa sessione di lavoro.
- Il controllo dei confini architetturali passa.

Nel checkout condiviso, la suite completa del servizio ha riportato 519 test passati, 22 saltati e un errore nel test di `GET /v1/pilot/orders`. Il test si aspetta due argomenti nella chiamata a `service.orders`. La modifica in corso per i sottodomini passa anche il nuovo argomento opzionale per la sede.

Per il collaudo online occorrono il rilascio del servizio con `GEOAPIFY_API_KEY`, il client corrispondente e una prova con vie e civici nella zona servita. [Configurazione del servizio](../../../services/checkout-api/README.md#environment-and-local-setup).
