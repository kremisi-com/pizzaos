# Implementazione privata

Decorator: dentro transact copiare la mappa degli status prima della callback e, soltanto dopo il suo successo, confrontare con gli ordini risultanti. Per una nuova transizione completed/cancelled scrivere uno snapshot in state.analytics.entries[orderId]. Il campo opzionale analytics è un'estensione strutturale locale di OrderingState, quindi viene serializzato dal repository JSON esistente senza modifica del contratto base. La chiave ordine assicura unicità; letture o aggiornamenti rimborso non sostituiscono snapshot. Il timestamp proviene dal clock server iniettato.

Il reader effettua una transazione, valida attore/membership/sede e legge solo le entries della sede. Per la timezone usare un tipo strutturale IndividualStore & {timeZone?:string}. La data locale si ricava con Intl.DateTimeFormat.formatToParts. Gli estremi UTC di un giorno locale si trovano con ricerca binaria sulla data locale in una finestra UTC di 72 ore, supportando giorni DST da 23/25 ore senza assumere offset fisso. Confrontare ISO date YYYY-MM-DD canoniche; calcolare giorni calendari con UTC esclusivamente per aritmetica delle date, non per attribuzione.

Aggregare in centesimi e interi, media con Math.round. Righe raggruppate per productId; conservare data/orderId per selezione nome deterministica. Nessuna lettura catalogo.

Checklist: autorizzazione e isolamento; cinque metriche; importi storici; cattura finale atomica e rollback; nessun backfill; timezone sede/compatibilità; input e date validi; DST e fine esclusa; zero senza dati personali.
