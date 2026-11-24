# Sottodomini delle sedi

Il superadmin assegna un sottodominio PizzaOS alla sede dal profilo. Un wildcard sul progetto client convoglia gli indirizzi nello stesso deploy. Il servizio risolve il sottodominio e applica la sede alle API cliente. L'origine già configurata rimane disponibile per il pilota e la demo. Google usa la callback client registrata e Auth.js rimanda il risultato all'origine della sede.

La scelta entra in D76 e interessa configurazione sede, ordine individuale e raccolta di gruppo.
