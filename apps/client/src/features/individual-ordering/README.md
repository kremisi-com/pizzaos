# Ordine individuale persistente

Questa feature possiede presentazione e interazioni del primo flusso individuale cliente. Riceve il port pubblico `IndividualApi` dalla composizione dell'app; non dipende da repository locali, codice di altre app o implementazione del servizio. Gli ordini, i totali, le riserve e i pagamenti sono autorevoli nel servizio checkout.

L'entry pubblico `index.ts` esporta `IndividualStripeFields` e `ConfirmIndividualPayment`: il flusso gruppo riusa questa capability Stripe Elements senza accedere ai componenti privati della feature o introdurre un secondo provider di pagamento.

La composizione live inietta anche `PromotionsApi`: la capability pubblica `features/promotions` presenta wallet e scelta codici/premio, mentre il checkout canonico calcola ogni beneficio. Il copier/validator del draft e del tentativo originale conserva solo `benefits` (codici e boolean di riscatto), mai saldo o breakdown fidati. I conflitti economici precedenti all'ordine permettono correzione e nuova quote; esiti incerti mantengono la richiesta originale. Totale zero confermato server non richiede Stripe anche col metodo carta.

La modalità demo precedente è separata. Requisiti e contratti sono in `.agents/design/2026-11-05-individual-ordering/ordering-surfaces/`. Verificare lint, typecheck, test e build dell'app, controllo architettura ed E2E individuale.

Il draft conserva solo la composizione e scade dopo sette giorni. Un checkout dall'esito incerto conserva separatamente la richiesta originale e l'identificativo dell'account per un retry identico: include il telefono necessario al contratto, mai dati carta o `clientSecret`. «Recupera tentativo ordine» chiarisce l'esito anche per i contanti e blocca nuovi invii finché il servizio non risponde in modo autorevole. Se nel frattempo il draft cambia, il recupero conserva il nuovo carrello. Quando il browser nega lo storage il tentativo resta in memoria: occorre mantenere aperta la pagina. I vecchi record che contengono solo una chiave restano bloccanti, perché il port non può ricostruirne fedelmente la richiesta.

Gli eventi della composizione ricaricano catalogo e ordini senza cancellare le righe. Il catalogo ricevuto viene applicato solo alla selezione corrente; modifiche ai prodotti, alle disponibilità, alle fasce o alle condizioni di consegna invalidano il preventivo e richiedono una nuova verifica. Un evento ordine con catalogo identico conserva il riepilogo.
