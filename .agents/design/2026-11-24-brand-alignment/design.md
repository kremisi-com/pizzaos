# Allineamento del brand di admin e client

## Obiettivo e perimetro
Applicare il kit ufficiale fornito in external ad admin e client, compresi accessi, demo, area rider e flussi persistenti. Un solo brand con espressione operativa desktop e ordinazione mobile calda. Nessuna variazione a dati commerciali, autenticazione, pagamenti, routing o comportamento del servizio. Landing esclusa dal restyling; i suoi token esistenti restano compatibili.

## Fonte e scelte
Presentazione e SVG originali: sabbia #DDB785, arancio #CF5430, blu #0A384F. Conservare gli SVG originali, inclusa la variazione #CE4D26 interna al logo; UI canonica #CF5430. Arancio scuro #B74424 per azioni con testo bianco (contrasto >=4.5). Poppins per admin/client, pesi 400/500/600/700/800 caricati realmente. Blu per struttura, sabbia per supporto; stati semantici distinti dai colori di brand. Il nome della sede resta dato del servizio.

## Ownership
packages/brand possiede palette, token e asset ufficiali riusabili senza dipendere dalla cartella external a runtime. packages/ui possiede il componente di logo accessibile. Ogni app possiede composizione e CSS; nessun import tra app. Asset browser distribuiti localmente.

## Sequenza e prova
Prima requisiti e contratti; test indipendenti da un agente che riceve solo REQUIREMENTS e CONTRACT_DESIGN; registrare il fallimento iniziale. Implementare fondazione, poi entrambe le superfici. Verificare test pubblici, lint/typecheck/build delle app e pacchetti, confini architetturali, percorsi browser demo e operativi con fixture isolata e revisione visiva desktop/mobile. Verifica locale distinta da deploy online. Documentare esiti reali e limiti in REVIEW.md.

## Verifica
[Esiti locali, test indipendenti e limiti](REVIEW.md). La modifica non attesta un nuovo deploy online.
