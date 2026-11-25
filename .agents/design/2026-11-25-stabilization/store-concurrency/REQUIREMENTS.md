# Salvataggio della sede senza perdita di aggiornamenti

1. Il superadmin crea una sede senza versione. Lettura e salvataggio riuscito restituiscono all'operatore una `configurationRevision` opaca non vuota. I vecchi dati senza versione restano leggibili senza migrazione.
2. Per aggiornare una sede esistente è obbligatorio presentare la versione ricevuta dalla lettura operatore. Versione assente o superata restituisce `revision_conflict` (HTTP 409) e nessuna modifica. Una versione malformata restituisce `invalid_input` (400). Creare un ID già esistente senza versione non deve sovrascriverlo.
3. Due operatori leggono la stessa sede. Il primo salva un nuovo nome; il secondo prova a salvare contatti o scorte dalla vecchia lettura: il secondo riceve 409, nome/scorte/contatti canonici restano quelli correnti. Due richieste concorrenti con la stessa versione hanno al massimo un vincitore se modificano la configurazione.
4. La protezione include il consumo delle scorte al completamento di un ordine. Una configurazione letta con scorta 20 non può ripristinarla dopo un ordine completato che la porta a 19.
5. La versione identifica la configurazione corrente, non l'identità del processo o l'ordine delle chiavi JSON. Riletture senza modifiche e ricostruzione del servizio sullo stesso repository mantengono la versione valida. Una rilettura dopo il conflitto permette una nuova modifica consapevole.
6. Cataloghi pubblici/cliente non espongono `configurationRevision`. Le autorizzazioni restano invariate: clienti/anonimi non salvano configurazioni, un operatore non modifica altre sedi.
7. La versione del calendario e del menu resta indipendente e mantiene i controlli già previsti. Il calendario genera capacità residue per il cliente; il salvataggio operatore non le trasforma in capacità nominali.
8. Admin continua il merge delle modifiche indipendenti rispetto alla lettura aggiornata, inoltrandone la versione. La versione inviata non deve essere sostituita da quella della bozza originale. Un cambiamento intervenuto dopo questa rilettura è rifiutato dal servizio; la bozza rimane e il messaggio italiano chiede di ricaricare prima di ripetere la modifica.

Non cambiare configurazioni commerciali o pubblicare menu. Nessun accesso a provider o database remoto per le prove.
