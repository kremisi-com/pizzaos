# Verifica locale del calendario settimanale

Il comportamento è approvato in D75 e implementato sul ramo `client`. Le prove seguenti usano dati di test locali.

- Build, typecheck e lint di admin, client, checkout API e dominio. Controllo dei confini architetturali superato.
- PostgreSQL locale con schema applicato al database dedicato. Tutti i 527 test del servizio sono passati, inclusi i 15 [casi del calendario](../../../services/checkout-api/src/order-calendar.test.ts) su attivazione, prenotazioni protette, cambio d'ora e concorrenza.
- Suite admin 97 test, client 118, dominio 19. I [test del checkout individuale](../../../apps/client/src/test/order-calendar.test.tsx) coprono la visualizzazione delle finestre e la conservazione del carrello dopo un conflitto.
- [Playwright](../../../tests/e2e/order-calendar.spec.ts) verifica i comandi della griglia anche da tastiera, il salvataggio, il primo checkout e la visualizzazione della fascia piena nel secondo checkout. Il test usa identità e pagamenti di prova.

Stato online: da pubblicare e verificare.
