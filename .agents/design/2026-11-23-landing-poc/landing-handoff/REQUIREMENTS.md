# Requisiti osservabili

- Dopo un invio demo o prova gratuita riuscito, la landing offre due azioni che aprono cliente e ristorante su `/poc` senza digitare password.
- Richiesta rifiutata, invio non riuscito o richiesta di contatto non concedono accesso demo. Se manca la configurazione dei pass, il successo dell'invio resta visibile e si può accedere con la procedura manuale.
- Il pass di cliente non apre il POC ristorante e viceversa. Pass errato, scaduto o inviato da origine non approvata non crea alcuna sessione.
- L'URL finale è `/poc`. Password e dati del form non viaggiano verso le due app, né nell'URL né nel corpo di accesso. Le API operative restano interdette.
- Il login manuale, l'uscita e il dominio rider mantengono il comportamento esistente.
