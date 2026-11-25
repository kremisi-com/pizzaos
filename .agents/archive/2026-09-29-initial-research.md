# Ricerca storica del 29 settembre 2026

Archivio del contesto iniziale. Le fonti non sono state rivalidate. Per lo stato attuale usare il [punto zero](../product-definition/current-state.md).


Materiale conservato dalla ricognizione iniziale, non aggiornato né rivalidato in questo allineamento. Le domande e proposte seguenti descrivono il contesto di allora; non indicano decisioni ancora aperte. Per le policy correnti valgono le specifiche collegate sopra e il registro delle decisioni, in particolare D18/D49 per incasso e rimborsi. Non usare queste fonti come prova delle funzionalità attuali dei concorrenti.

- **Ordine non accettato / approvazione:** Toast documenta una coda “Needs Approval”; l'ordine può scadere se il ristorante non approva entro il timeout configurato. Per PizzaOS va deciso un timeout chiaro, avviso persistente e cosa vede/paga il cliente. [Toast: Pending Orders Mode](https://support.toasttab.com/en/article/Pending-Orders-Mode?lang=en_US) e [errori di approvazione](https://support.toasttab.com/en/article/Get-Help-Troubleshoot-Online-Ordering-Error-Messages).
- **Modifiche:** Toast blocca le modifiche a certi ordini marketplace e indica annullamento/ricreazione o contatto con la piattaforma. In un canale diretto PizzaOS può offrire un flusso controllato dal ristorante, ma ogni aumento di prezzo deve avere importo e consenso espliciti del cliente; riduzioni e rimozioni richiedono regole di rimborso. [Toast: modifiche agli ordini](https://support.toasttab.com/en/article/Get-Help-With-Third-Party-Order-Changes).
- **Rifiuto e indisponibilità:** Deliveroo chiede ai partner di segnare subito l'articolo esaurito; se arriva comunque un ordine contenente un articolo indisponibile, il partner può doverlo rifiutare. Per retail/grocery (non ristorante) supporta preferenze cliente di sostituzione, rimozione o annullamento con rimborso: non assumere che tale flusso sia disponibile per le pizzerie. [Deliveroo: disponibilità menu](https://help.deliveroo.com/en/articles/2070031-how-do-i-mark-menu-items-as-unavailable) e [sostituzioni retail/grocery](https://help.deliveroo.com/en/articles/6404722-how-to-substitute-unavailable-items-retail-grocery-partners-only).
- **Scorte:** Toast può scalare conteggi impostati sui prodotti/modificatori quando l'ordine viene inviato o pagato, secondo configurazione; Deliveroo espone stati “esaurito oggi”, “rimuovi dal menu” e “disponibile”. PizzaOS deve decidere cosa è inventario ingredienti con ricette e cosa è semplice disponibilità manuale. [Toast: conteggio menu](https://support.toasttab.com/en/article/Setting-a-Count-on-Menu-Items-for-Toast-Online-Ordering), [Deliveroo: stock](https://help.deliveroo.com/en/articles/16012193-how-to-manage-stock-in-order-manager).
- **Slot/capacità:** Toast conta gli ordini sulla capacità slot appena inviati (anche in attesa di approvazione) e nasconde gli slot futuri saturi; per ordini immediati può allungare il tempo o sospendere/rallentare ordini. È un modello utile da valutare per evitare overselling, ma il momento di rilascio della capacità a seguito di rifiuto resta decisione PizzaOS. [Toast: quote e capienza](https://support.toasttab.com/en/article/Managing-Your-Quote-Time-Strategy) e [ritardo/sospensione](https://support.toasttab.com/en/article/Managing-Online-Order-Volume-Throttling-Orders-1492627940253).

### Casi concreti per rifiuto dell'ordine

Esempi da trasformare in motivazioni codificate e comunicazione chiara (D17/D18), non policy già approvate:

1. Il locale è chiuso per guasto o chiusura straordinaria non ancora propagata: rifiuto tempestivo, spiegazione e rimborso/annullamento pagamento.
2. Esaurito un ingrediente essenziale o un prodotto già ordinato: offrire contatto per alternativa solo se il cliente può accettare; altrimenti annullare e rimborsare secondo policy.
3. Carico cucina eccezionale o slot/capacità superata: proporre un orario successivo con consenso, altrimenti rifiutare senza trattenere il pagamento.
4. Indirizzo fuori zona, errato o non raggiungibile: chiedere conferma/correzione se possibile prima di accettare; non cambiare indirizzo o costo senza consenso.
5. Problema tecnico o sicurezza alimentare che impedisce di preparare in modo sicuro: annullare, informare il cliente e rimborsare.
6. Informazioni ordine incoerenti o rischio di duplicato: sospendere l'accettazione e verificare prima di addebitare due volte.

Domanda aperta collegata: preferire autorizzazione carta al checkout e cattura solo dopo accettazione, oppure addebito immediato con rimborso automatico in caso di rifiuto? La prima opzione riduce rimborsi ma dipende da capacità/provider e va validata con il flusso pagamenti.
