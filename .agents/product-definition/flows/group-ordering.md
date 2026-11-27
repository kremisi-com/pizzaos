# Ordine di gruppo e carrello condiviso

Le scelte approvate da Andrea il 27 novembre 2026 aggiornano D61–D63, D64/D69 e i permessi dell'organizzatore del 26 novembre. Requisiti e contratti: [SDD carrello condiviso](../../design/2026-11-27-shared-cart/design.md). Le verifiche storiche dei gruppi con scadenza attestano soltanto quelle versioni.

## Creazione, accessi e navigazione

**Ordine di gruppo** converte automaticamente il carrello della sede in **Carrello condiviso**, senza modulo nome/scadenza e senza scadenza automatica. Quantità, personalizzazioni e note diventano il contributo del creatore; consegna, indirizzo, slot e benefici rimangono preferenze da rivalidare. La creazione è idempotente e il draft individuale viene svuotato soltanto dopo conferma del trasferimento.

L'account usa il nome esistente; un ospite riceve un nome alimentare generato, modificabile senza cambiare identità. Creazione e partecipazione non richiedono account. L'accesso collega la partecipazione esistente; pagamenti e conferma finale richiedono account, anche con residuo zero. Nome e link non concedono i permessi del creatore. Capability private HttpOnly appartengono al trasporto; dati e revisioni al servizio checkout.

Menu e Carrello lavorano sul gruppo attivo. È possibile passare al carrello individuale e recuperare il gruppo senza annullarlo. Entrare da un invito trasferisce automaticamente una sola volta le righe della stessa sede; il carrello di un'altra sede rimane separato. L'invito usa l'origine della sede e il frammento privato, senza generatori QR esterni.

La pagina contiene **PizzaOS · Insieme a tavola**, **Ordine di gruppo**, **Pensa solo a cosa vuoi mangiare, mentre i tuoi amici scelgono.**, QR già visibile, link e condivisione/copia, persone espandibili con le loro scelte. Non contiene menu o checkout e non usa «Raccolta». Il creatore modifica integralmente i contributi non pagati, anche altrui; un invitato modifica solo il proprio.

## Quote, riserve e conclusione

Ogni partecipante autenticato può pagare anticipatamente con carta il proprio contributo completo. Il server verifica importo, composizione e ingredienti e riserva prima del provider; il pagamento confermato blocca prezzo e scelte e mantiene la riserva senza scadenza. I tentativi incompleti hanno soltanto il timeout tecnico del servizio, con riconciliazione prima del rilascio. Nessuno slot prima del checkout finale. Scorte/dosi non tracciate restano tali, senza riserve fittizie.

Al primo incasso la pizzeria vede **Ordine di gruppo ancora in corso**: segue contributi e rimborsi, senza accettazione o preparazione. Il creatore sceglie unico indirizzo e slot e conferma un unico ordine; solo allora iniziano flusso cucina, timeout accettazione e notifiche ordine. Fallimento del saldo conserva gruppo, quote pagate e riserve. Un riferimento stabile collega il gruppo all'ordine canonico, senza duplicati nella coda.

Il residuo del creatore comprende quote non anticipate e consegna. Quote pagate mantengono il prezzo, non pagate usano il catalogo corrente. Coupon/premio del creatore si applicano soltanto ai prodotti non pagati; punti dell'ordine al creatore. Importi server in centesimi. Una quota carta sotto minimo provider rimane nel residuo; un residuo positivo sotto soglia è saldato in contanti, senza maggiorazioni. Carta/contanti ammessi al saldo finale. Rider vede solo contanti ancora dovuti.

## Rimborsi e casi limite

- Prima dell'invio rimborsano il pagante della quota e gli operatori autorizzati della sede. Il creatore non può rimborsare quote altrui.
- Rimborso pre-invio elimina scelte e partecipazione invitato, libera riserve e richiede nuovo ingresso dal link. Non effettua logout dall'account. Il creatore conserva il ruolo se rimborsa il proprio contributo.
- Denaro al finanziatore effettivo. Dopo invio il rimborso per quota è monetario e conserva comanda/cronologia; se il creatore aveva coperto la quota, riceve il rimborso. Annullamento completo segue flusso ordine e restituisce tutti i pagamenti. Contanti già incassati richiedono restituzione manuale esplicita.
- Rimborso richiesto, riuscito e fallito sono distinti. Un errore non ricrea scelte cancellate né duplica l'accredito: l'operatore ritenta il movimento durevole.
- Pagamenti in verifica, rimborsi e conferma finale si escludono sulle stesse quote; nessun doppio addebito o riserva. Retry e riavvii recuperano le richieste originali.
- Cookie cancellati: ospite non collegato perde accesso personale; il creatore gestisce le sue scelte non pagate. Pagante collegato a un account recupera tramite accesso. Nome/invito non consentono impersonificazione.
- Riserve indefinite: gruppo visibile alla pizzeria, che può annullarlo e rimborsarlo. Limiti antiabuso server su creazione/ingresso; isolamento sede/origin/demo obbligatorio.
- Gruppi aperti storici perdono deadline; chiusi/inviati non riaprono. Nessun contatto o fulfillment fittizio per convertire un gruppo incompleto in ordine normale.

## Copertura ed evidenze

Test indipendenti: [servizio](../../../services/checkout-api/src/group/shared-cart.contract.test.ts), [pizzeria](../../../apps/admin/src/test/shared-group-orders.test.tsx). Suite client e browser sono collegate dal [riesame](../../design/2026-11-27-shared-cart/REVIEW.md). Le vecchie prove del 25–26 novembre restano evidenze dei rispettivi incrementi. Modifiche a codice/documentazione non rinnovano le prove online.
