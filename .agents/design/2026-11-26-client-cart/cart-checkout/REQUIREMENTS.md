# Comportamenti

- La navigazione Carrello operativa apre `/ordina/carrello`; dal menu con articoli si raggiunge lo stesso percorso. Il carrello non mostra il catalogo completo.
- Un draft valido con 2 Margherita da 800 centesimi mostra nome, quantità 2, prezzo riga 16 euro e subtotale stimato 16 euro. Non inventare costi di consegna: il totale definitivo arriva dal preventivo al checkout.
- I controlli accessibili `Aumenta quantità Margherita` e `Diminuisci quantità Margherita` aggiornano il draft; diminuire da 1 rimuove la riga. Sono disponibili Rimuovi e Svuota carrello. Un carrello vuoto invita a Sfoglia il menu e non consente il checkout.
- Le scelte, le note e i prodotti non disponibili restano visibili e correggibili. Prezzi includono le personalizzazioni, anche Menu e Pizza, usando le regole pubbliche del dominio.
- Vai al checkout apre `/ordina/checkout`. La schermata mostra subito Consegna e pagamento, senza costringere a riaprire il menu. La navigazione Menu torna a `/ordina#il-menu`.
- Il checkout ricarica lo stesso draft. Modifiche e reload conservano la composizione. Il preventivo e l'invio restano IndividualApi, senza adattatore POC.
- Carta carica Stripe Elements tramite chiave pubblica sandbox; nessun numero carta, segreto Stripe o client secret entra nello storage. Chiave assente mostra l'errore già previsto, senza fingere un pagamento riuscito. Tentativi incerti mantengono il recupero esistente.
- Il POC conserva percorsi e pagamenti simulati. La vista legacy del componente resta disponibile per le regressioni esistenti.
