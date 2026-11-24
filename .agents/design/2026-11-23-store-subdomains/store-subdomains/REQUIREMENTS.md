# Requisiti

- Il superadmin assegna `lapizzaspeciale` creando una sede o completando una sede esistente. Il pannello mostra il link pubblico. La prima assegnazione resta stabile. Un altro operatore non può assegnare un sottodominio.
- Ogni sede contende l'etichetta nello stesso ambiente. Un'etichetta duplicata, un indirizzo completo, `admin`, `rider`, `client`, `api`, `landing` o `www` generano un errore. Un salvataggio precedente al nuovo campo continua a funzionare e conserva un'associazione esistente.
- Un sito assegnato mostra menu e disponibilità della sede, senza selettori nell'ordine individuale o nel gruppo. L'API rifiuta catalogo, carrello, ordini, wallet e raccolte di altre sedi. Lo storico cliente e gli eventi restano nella sede. Un sottodominio privo di associazione mostra una pagina di sito non configurato.
- L'accesso sulla sede usa link email e Google. Il login torna all'origine che l'ha iniziato e le sessioni restano sul singolo host. L'host pilota conserva la demo e il funzionamento precedente. Admin e rider conservano host e permessi.
