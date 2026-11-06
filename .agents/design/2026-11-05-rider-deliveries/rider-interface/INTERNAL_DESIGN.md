# Disegno interno vista

Hook React per caricare sessione/elenco e gestire busy/error. Ricaricare dopo ogni azione, senza transizioni ottimistiche. Intervallo pulito su unmount; non avviare polling per utenti anonimi/non abilitati. Form problema per card con nota richiesta. UI semantica italiana, aria-live per errori/stati e label esplicite. Import dei contratti esclusivamente dall'entry point pubblico.

Checklist: login; accesso negato; elenco vuoto; isolamento demandato a servizio; niente mock; busy; errori; conferma stato dal servizio; problema impedisce complete; pulizia polling; no coupling composizione.
