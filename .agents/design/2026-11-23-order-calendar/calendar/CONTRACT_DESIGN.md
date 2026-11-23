# Contratti pubblici

```ts
interface WeeklyOrderWindow { startMinute: number; endMinute: number; capacity: number }
interface WeeklyOrderDay { weekday: number; windows: WeeklyOrderWindow[] }
interface WeeklyOrderSchedule { revision: number; days: WeeklyOrderDay[] }
```

`IndividualStore.orderSchedule?: WeeklyOrderSchedule` è visibile agli operatori della sede. `protectedOrderDates?: string[]` contiene le date ISO protette ed è di sola lettura. Il salvataggio usa il normale PUT della sede. Una nuova sede può inviare revisione 0. Le modifiche a una settimana esistente devono riportarne la revisione corrente; una modifica obsoleta restituisce `revision_conflict`. Omettere la settimana conserva quella corrente. I giorni sono numerati 1–7 da lunedì a domenica senza duplicati; ciascuna fascia ha inizio intero da 0 a 1439, fine da 1 a 1440, capacità intera da 0 a 10000. Le fasce non si sovrappongono.

`IndividualSlot.endsAt?: string` e `timeZone?: string` sono assenti per i vecchi orari puntuali. Nel catalogo, `slots` contiene le fasce ancora aperte in ordine cronologico, incluse quelle complete, e `capacity` esprime i posti residui. Un identificativo di fascia continua a indicare lo stesso inizio e fine se cambia la capacità. `IndividualQuote.slotEndsAt?: string` e `slotTimeZone?: string` registrano la finestra dell'ordine insieme all'inizio già previsto. Una fascia chiusa, rimossa o piena restituisce `slot_unavailable`.

Un bordo in un'ora inesistente rende indisponibile la sua fascia per quella data. Un bordo che ricorre due volte usa la prima occorrenza. Gli altri giorni conservano il proprio orario locale.
