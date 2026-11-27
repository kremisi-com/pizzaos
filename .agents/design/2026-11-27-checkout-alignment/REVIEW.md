# Verifica locale

Approvazione: Andrea richiede il riallineamento del checkout individuale operativo al carrello e approva gli interventi dell'analisi UX/UI. I contenuti commerciali e le regole economiche restano nei proprietari esistenti. Nessun deploy o pagamento esterno è stato eseguito per questo incremento.

Implementato: intestazione coerente, sezioni distinte, radio per modalità e metodo, stima composta e totale server nel blocco fisso, progressione accesso/verifica/conferma/recupero, spiegazioni dei blocchi, focus sul riepilogo e previsione ASAP con fasce raggruppate per giorno. Lo spazio finale segue l'altezza reale del blocco fisso, senza sovrapporre l'ultima sezione. La raccolta Stripe resta montata durante l'invio. Il servizio che restituisce già un ordine concluso, incluso totale zero, non richiede una riconciliazione superflua. Il recupero senza tentativo locale mostra la conferma senza cancellare il carrello corrente.

Test indipendenti: requisiti e contratto sono stati forniti a un agente senza accesso all'implementazione. Prima red: 10 casi falliti e uno passato. Dopo implementazione e completamento della copertura, 13 casi specifici verificano stima, radio, guest, indirizzo, telefono, attesa/focus, invalidazione, errore, contanti, carta zero, retry identico, carta positiva e recupero a carrello vuoto. Il provider esterno è simulato; non è una nuova prova di Stripe online.

Controlli eseguiti:

- Suite client completa: 48 file, 269 test passati.
- Lint client e TypeScript: passati.
- Build client isolata `.next-checkout-alignment-build`: passata.
- `pnpm architecture:check`: confini corretti e 4 test passati.
- Browser checkout: 2 percorsi passati con servizio HTTP isolato; viewport 375×667, 390×844 e 1280×800. Verificati posizione fissa, assenza overflow, leggibilità dell'ultimo riepilogo, focus, invalidazione e invio contanti fino alla conferma; guest con verifica prima dell'accesso e indirizzo obbligatorio per consegna.
- Suite browser combinata col carrello: 8 casi passati, un errore nel percorso dello storico dedicato durante modifiche concorrenti della pagina Ordini (attesa di «Ordini passati» dopo navigazione Carrello → Ordini). La successiva verifica dei soli percorsi checkout passa. Il problema dello storico non viene corretto o incluso in questo incremento.

Ispezionate le immagini locali `.codex/evidence/checkout-aligned-start-mobile.png` e `checkout-aligned-{375x667,390x844,1280x800}.png`. Le modifiche di altre attività, comprese pagina Ordini, gruppo e file generati da Next, non appartengono al commit del riallineamento.

Stato online: non verificato in questa attività. Le precedenti evidenze online conservano la propria versione/data.
