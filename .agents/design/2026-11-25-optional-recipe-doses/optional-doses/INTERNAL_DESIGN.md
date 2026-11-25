# Implementazione

Propagare null nell'aggregazione delle ricette; separare controllo presenza/scorta zero dal consumo numerico. Proiezione usa disponibilità ingrediente anche per dose null, senza maxAvailable spurio zero. Preventivo valida gli ingredienti ignoti ma li esclude dall'aggregato numerico usato per riserve. Togliere solo readiness dosi da validazioni, conservare prezzi/referenze/struttura. Extra correnti con prezzo e dose null restano inclusi. Formato null propaga dose impasto null.

Checklist: pubblicazione nullable; selezioni valide; zero policy; consumo noto; allergeni; prezzi obbligatori; nessun valore fittizio; docs e test.
