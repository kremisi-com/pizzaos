# Disegno interno

Decorare il repository con withPilotAnalytics una volta. Costruire il servizio ordini con guard isRiderProgressAllowed; costruire delivery con progress delegato a riderProgress e analytics sullo stesso repository. Il guard non implica membership operatore.

Estrarre il corpo della action canonica in una funzione privata riutilizzabile con contesto riderOnly controllato esclusivamente dal metodo server-only. Il contesto rider richiede dispatch/complete e guard nella transazione; action normale conserva viewer e operator. Le transizioni, pagamenti e decremento ingredienti restano in un unico percorso.

Le route estensioni usano schemi JSON Fastify e l'handler errori dell'app esistente. Ogni servizio deriva l'attore con authenticate. Aggiungere statusCode agli errori specifici per conservarne il significato sul confine HTTP.

Checklist: repository unico e durevole; guard atomico; generic action immutata; DTO rider minimi; problemi/revoca/riassegnazione; aggiornamento analytics; controllo proxy; timezone configurabile; errori coerenti; nessuna credenziale browser.
