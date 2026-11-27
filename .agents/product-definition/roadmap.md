# Lavoro residuo e criteri di rilascio

Punto zero del 25 novembre 2026. Il [perimetro corrente](current-state.md) e l'[inventario F01–F24](flow-inventory.md) distinguono implementazione e lacune; la precedente [tabella degli incrementi](../archive/2026-11-25-pilot-progress.md) è archiviata. Questo ordine tecnico non modifica decisioni commerciali o attiva risorse cloud.

## Versione candidata per un pilota controllato

| Passo | Condizione osservabile | Stato / fonte |
|---|---|---|
| Stabilizzazione locale | Suite raccolte, calendario deterministico, salvataggi sede atomici, chiamanti coerenti | Modifiche e verifiche nel [riesame](../design/2026-11-25-stabilization/REVIEW.md); deploy non eseguito |
| Integrazione dei lavori paralleli | Catalogo/configurazione Next e questa stabilizzazione convivono su una revisione precisa, senza modifiche estranee | Worktree separato dalla base `9c27263`; modifiche locali del checkout principale escluse |
| Contratto servizio/admin | API e admin della candidata pubblicati insieme, vecchie sessioni/configurazioni rilette | `configurationRevision` obbligatoria per aggiornare sedi esistenti; [flusso](flows/store-configuration.md) |
| Dati della sede | Menu, prezzi, dosi, scorte, allergeni e foto verificati dal gestore e pubblicati dal pannello | Bozze/importazioni non certificano i dati; [menu](flows/menu-ordering.md) |
| Esecuzione automatica | Worker del rilascio attivo e stabile; scadenze, riconciliazioni e outbox avanzano con browser chiusi | Ultima evidenza registrata: worker fermo; [registro online](../../services/checkout-api/online-deployment.md) |
| Collaudo candidato | Cliente, operatore e rider su dispositivi fisici distinti: login, sottodominio, indirizzo, carta/3DS, contanti, consegna/ritiro, email | Prove online precedenti su sessioni desktop, non rinnovate dal punto zero |
| Errori e isolamento | Conflitto scorte/configurazioni, ultimo slot, doppio invio, pagamento incerto, annullamento/rimborso/retry, revoca rider e altra sede | Test locali distinti dal collaudo cloud della stessa versione |
| Esercizio misurato | Traffico Neon in finestre comparabili, `x-request-id` dai proxy pubblicati, alert ricevuti e retention verificata | La misura locale dello snapshot e l'evento Sentry ricevuto non chiudono queste prove |

## Prima dell'apertura a utenti e pagamenti reali

D16/D31 restano rinviate: privacy, obblighi operativi/fiscali e conservazione dei dati vanno definiti senza considerarli risolti dalle prove con dati fittizi. Mancano inoltre una procedura di backup con ripristino provato, monitoraggio presidiato, supporto e gestione delle anomalie economiche. La produzione separata deve essere preparata e collaudata con configurazioni proprie; l'alias Vercel Production del pilota serve oggi ambiente test.

## Capacità fuori dal perimetro operativo corrente

Abbonamenti cliente/PizzaOS e fatturazione, marketing automatico, recensioni, AI/BI avanzata, export analytics, GPS/ottimizzazione, POS/contabilità, CRM/trial e onboarding self-service restano esclusi dagli incrementi o da definire secondo il [registro decisioni](decisions.md). La loro priorità commerciale richiede una scelta esplicita; questa roadmap non ne approva il rinvio generale. Coupon/fedeltà, gruppo, email operative e aggiunte con delta sono già nel perimetro implementato e non vanno riproposti come capacità da autorizzare.

Ogni avanzamento aggiorna la fonte proprietaria, il criterio residuo e l'evidenza con versione e ambiente. Una prova locale non chiude una riga che richiede il rilascio online.

## Incremento cinque tipi di prodotto

L'incremento [carrello condiviso e pagamenti per quota](../design/2026-11-27-shared-cart/design.md) sostituisce il gruppo con deadline e unico pagante. Rimangono distinti implementazione/verifiche locali e collaudo online, soprattutto riconciliazione a browser chiusi, riserve indefinite, più paganti e rimborsi. Il worker operativo del rilascio resta un criterio da verificare online, non certificato dai test locali.

Pizza, Panino, Prodotto, Box e Menu sequenziale sono approvati nella [specifica proprietaria](flows/menu-ordering.md#tipi-di-prodotto-panino-box-e-menu). Implementazione e verifiche locali nel [riesame SDD](../design/2026-11-26-product-types/REVIEW.md). Resta separato il rilascio coordinato API/admin/client e il collaudo online; nessun deploy incluso nell'incremento.
