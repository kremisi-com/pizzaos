# Contratti

OperationalMenu mantiene props store, preferences, disabled, onAdd. LivePizzaEditor aggiunge initialSelections?: MenuSelection[] per nuove righe soltanto; line presente ha precedenza. Menu e API persistenti restano tramite entry point pubblici. Componenti Client non importano altre app né repository demo. Scelte iniziali utilizzano sourceId espliciti e opzioni ammesse. Opzioni mancanti/indisponibili richiedono scelta corretta, senza inviare scelte sconosciute.
