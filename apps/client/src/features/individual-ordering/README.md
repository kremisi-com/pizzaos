# Ordine individuale persistente

Il checkout operativo `/ordina/checkout` riprende intestazione, sezioni e azione fissa del carrello. Il blocco mostra stima prodotti oppure totale verificato e il passo corrente (accesso, verifica, conferma o recupero), con spiegazione dei dati mancanti e delle invalidazioni. Le scelte modalità/pagamento sono radio visibili. Dopo la verifica il focus passa al riepilogo; contatti e pagamento restano separati. Nessun prezzo, beneficio o costo consegna è reso autorevole dal client.

`OrderSlotSelect` accetta `detailed` per raggruppare le fasce per giorno e mostrare la previsione di «Appena possibile» nel checkout dedicato; gli altri consumatori conservano la presentazione precedente. I pagamenti già conclusi dalla risposta del servizio, incluso totale zero, non richiedono una riconciliazione aggiuntiva. I pagamenti pendenti si recuperano dal checkout anche a carrello vuoto. [Flusso e casi limite](../../../../../.agents/product-definition/flows/customer-ordering-and-payment.md#presentazione-del-checkout-operativo).

Verifiche dell'allineamento: `src/test/operational-checkout*.test.tsx` e `pnpm exec playwright test --config playwright.checkout-alignment.config.ts` dalla root (porte 3921/3924, build `.next-checkout-alignment-e2e`). Il componente inline `view="all"`, il checkout POC e il gruppo mantengono i propri percorsi.

La schermata iniziale propone «Sfoglia il menu» e «Ordine di gruppo»; l'accesso agli ordini resta nella navigazione inferiore, senza il pulsante duplicato «I tuoi ordini» tra le azioni iniziali.

Il fondo del menu mantiene 24 px di spazio prima del pulsante Carrello. **Ordini** apre la [pagina dedicata](../orders/README.md) `/ordina/ordini`; il menu e il checkout non mostrano lo storico. **Segui l'ordine** raggiunge direttamente il relativo ordine. Le precedenti ancore del menu vengono normalizzate dalla composizione. Il checkout riceve il riferimento `#ordine-ID` per riprendere un pagamento carta già esistente, senza nuovo invio.

Il menu operativo apre il carrello dedicato `/ordina/carrello`; «Vai al checkout» porta a `/ordina/checkout`, con «Consegna e pagamento» subito aperta e focalizzata. Entrambi i percorsi ricaricano lo stesso draft operativo. La vista `all`, usata dalle prove preesistenti del componente, conserva l'apertura esplicita del checkout inline. «Completa pagamento esistente» dal menu raggiunge il checkout, dove si può riprendere il pagamento con Elements anche a carrello vuoto.

Questa feature possiede presentazione e interazioni del primo flusso individuale cliente. Riceve il port pubblico `IndividualApi` dalla composizione dell'app; non dipende da repository locali, codice di altre app o implementazione del servizio. Gli ordini, i totali, le riserve e i pagamenti sono autorevoli nel servizio checkout.

L'entry pubblico `index.ts` esporta `IndividualStripeFields` e `ConfirmIndividualPayment`: il flusso gruppo riusa questa capability Stripe Elements senza accedere ai componenti privati della feature o introdurre un secondo provider di pagamento.

Il selettore pubblico `OrderSlotSelect` è condiviso con il checkout gruppo. Mostra le finestre del catalogo nel fuso orario della sede, incluse quelle in corso, e disabilita quelle esaurite.

`DeliveryAddressField` è condiviso con il checkout gruppo. Usa `IndividualApi.searchDeliveryAddresses` per cercare vie e civici vicino alla sede. Solo la scelta di un civico aggiorna il punto nel carrello. Il backend conserva le regole di area, costo e minimo. [Flusso e casi limite](../../../../../.agents/product-definition/flows/customer-ordering-and-payment.md#indirizzo-di-consegna).

La composizione live inietta anche `PromotionsApi`: la capability pubblica `features/promotions` presenta wallet e scelta codici/premio, mentre il checkout canonico calcola ogni beneficio. Il copier/validator del draft e del tentativo originale conserva solo `benefits` (codici e boolean di riscatto), mai saldo o breakdown fidati. I conflitti economici precedenti all'ordine permettono correzione e nuova quote; esiti incerti mantengono la richiesta originale. Totale zero confermato server non richiede Stripe anche col metodo carta.

La modalità demo precedente è separata. Requisiti e contratti sono in `.agents/design/2026-11-05-individual-ordering/ordering-surfaces/`. Verificare lint, typecheck, test e build dell'app, controllo architettura ed E2E individuale.

Il draft conserva solo la composizione e scade dopo sette giorni. Un checkout dall'esito incerto conserva separatamente la richiesta originale e l'identificativo dell'account per un retry identico: include il telefono necessario al contratto, mai dati carta o `clientSecret`. «Recupera tentativo ordine» chiarisce l'esito anche per i contanti e blocca nuovi invii finché il servizio non risponde in modo autorevole. Se nel frattempo il draft cambia, il recupero conserva il nuovo carrello. Quando il browser nega lo storage il tentativo resta in memoria: occorre mantenere aperta la pagina. I vecchi record che contengono solo una chiave restano bloccanti, perché il port non può ricostruirne fedelmente la richiesta.

Gli eventi della composizione ricaricano catalogo e ordini senza cancellare le righe. Il catalogo ricevuto viene applicato solo alla selezione corrente; modifiche ai prodotti, alle disponibilità, alle fasce o alle condizioni di consegna invalidano il preventivo e richiedono una nuova verifica. Un evento ordine con catalogo identico conserva il riepilogo.

Le sezioni del menu, la personalizzazione e le informazioni alimentari appartengono alla feature [menu](../menu/README.md), condivisa anche con il gruppo e con le aggiunte prima dell'accettazione. Il draft locale e il tentativo originale conservano identificativi e quantità delle scelte. Dopo l'invio, la conferma collega alla timeline dell'ordine alimentata dagli stati del servizio.

L'entry pubblico espone anche `writeIndividualDraft`, `readCheckoutAttempt` e `IndividualAdditions`, utilizzati dalla composizione della pagina Ordini per il riordino e le aggiunte già supportate. Prezzi, scorte, pagamenti e stati restano autorevoli nel servizio.
