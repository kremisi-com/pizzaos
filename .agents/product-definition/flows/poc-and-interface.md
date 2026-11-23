# Accesso POC e interfaccia operativa

## Accesso alla demo

Dopo il successo del form demo o prova gratuita, la landing presenta due pulsanti che aprono il rispettivo POC senza chiedere la password. Il servizio verifica origine e pass destinato all'host. Il pass è valido dieci minuti e viaggia nel corpo del POST. Le richieste di contatto mantengono il loro flusso.

Cliente e operatore possono anche aprire direttamente `/poc` sul rispettivo dominio. Senza una sessione demo valida vedono la password dedicata e il collegamento all'area ordinaria. Dopo l'accesso vedono la demo esistente, con dati fittizi, reset e carta simulata. La sessione vale soltanto sull'host su cui è stata aperta. L'uscita revoca la sessione nel browser e apre l'accesso ordinario. Il rider usa il suo dominio operativo.

Una password errata torna a `/poc` con un errore. Se la password manca nella configurazione del servizio, il modulo è disabilitato. L'accesso ordinario da `/accesso`, il login demo precedente e le protezioni D72 rimangono disponibili. L'ingresso demo sostituisce la sessione operativa sullo stesso host. Usare una finestra privata per mantenere aperte entrambe le sessioni.

Un form rifiutato non emette pass. Se manca la configurazione per i pass il form può comunque riuscire e mostrare i link di accesso manuale. Un pass scaduto, alterato o destinato all'altro host non concede la sessione. [Verifica del form e delle due navigazioni](../../../tests/e2e/landing-poc.spec.ts).

Le verifiche comprendono [accesso manuale in Playwright](../../../tests/e2e/session-demo.spec.ts), [test del servizio](../../../services/checkout-api/src/demo-landing-handoff.test.ts) e [riscontri online per l'accesso dalla landing](../../../services/checkout-api/online-deployment.md#accesso-dalla-landing-del-23-novembre-2026). Il POC usa il checkout simulato. Catalogo, ordini, pagamenti e stati operativi delle viste ordinarie provengono dai contratti persistenti.

## Cosa collegare per riprendere la grafica del POC

| Superficie del POC | Funzioni disponibili nel prodotto | Lavoro residuo |
| --- | --- | --- |
| Home cliente e menu a sezioni | Sedi, apertura, prezzo, ingredienti, allergeni, disponibilità e opzioni sono serviti dal backend. Home operativa con copertina POC e azioni verso menu e gruppo. | Per ottenere il menu del POC, aggiungere categorie, ordine di esposizione e foto gestibili dall'admin, poi collegare le schede prodotto ai dati della sede. |
| Composizione pizza, carrello, checkout | Opzioni prodotto, carrello, preventivo, fascia, ritiro/consegna, coupon, Stripe e contanti sono disponibili. | Collegare le schermate distinte del POC al flusso persistente. Composizione per passaggi, regole tra scelte, mancia e ricerca dell'indirizzo del cliente richiedono decisioni e supporto specifico. |
| Ordini, riordino e fedeltà | Storico, riordino, aggiornamenti, punti, premi, coupon ed email sono operativi. | Collegare timeline e vista premi ai dati reali. Recensioni, abbonamenti e mappa GPS richiedono regole e contratti propri. |
| Ordine con amici | Invito, contributi, scadenza e pagamento unico sono implementati. | Riutilizzare la presentazione del POC con le azioni e gli errori della raccolta persistente. |
| Dashboard, ordini, menu e magazzino admin | Sidebar, selezione sede, griglia dashboard e buona parte della coda condividono la struttura POC. Catalogo, ricette, inventario, fasce e ordini sono persistenti. | Collegare gli editor visuali del POC ai form e ai salvataggi reali. Foto e categorie dipendono dal catalogo persistente. |
| Marketing, insight e integrazioni admin | Coupon, programma fedeltà, cinque metriche, assegnazione rider ed email operative sono implementati. | Campagne automatiche, AI, analisi avanzate ed export, fatturazione e integrazioni POS/contabilità richiedono regole o servizi. La mappa non riceve posizione rider dal flusso attuale. |

Ordine di lavoro proposto: cliente **menu → prodotto → carrello → checkout**, poi storico/riordino, premi e gruppo. Per il ristorante, partire da menu e magazzino, che alimentano anche il menu pubblico. Catalogo, immagini, prezzi, categorie e regole commerciali restano gestiti dal pannello admin.

Fonti: [inventario corrente](../flow-inventory.md), [ordinazione](customer-ordering-and-payment.md), [client](../../../apps/client/README.md), [admin](../../../apps/admin/README.md).
