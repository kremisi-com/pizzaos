# Disegno interno

- La settimana si registra nel documento della sede. Le giornate protette si congelano nello snapshot operativo e contengono occorrenze con orari UTC e capacità nominale. Il server le consulta prima di generare le ricorrenze e scarta i congelamenti scaduti quando modifica il calendario.
- La generazione converte i confini espressi in minuti locali in istanti nel fuso della sede. Per i confini ambigui usa la prima occorrenza e salta fasce con confini inesistenti. L'identificativo deriva dagli istanti di inizio e fine. La disponibilità sottrae gli ordini attivi e completati e riusa la riserva atomica esistente.
- La griglia dispone temporalmente le celle tramite CSS Grid. Un separatore condiviso ha un unico comando focalizzabile. I due checkout riusano lo stesso selettore e la stessa rappresentazione del tempo.
- Verificare la protezione sia durante l'attivazione sia dopo il salvataggio, l'isolamento delle sedi, la concorrenza sulle prenotazioni e la rappresentazione storica degli orari.
