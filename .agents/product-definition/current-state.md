# Stato corrente e punto zero

Consolidamento del **25 novembre 2026**, dalla base `9c27263610a01e57ef08e3bd5e1762a76c04aa0d` con la stabilizzazione descritta nel [riesame](../design/2026-11-25-stabilization/REVIEW.md). Il checkout principale aveva lavori non committati su catalogo e configurazione Next: sono esclusi da questa fotografia e conservati nel loro checkout. Questo documento è l'ingresso corrente; i verbali datati attestano soltanto le versioni effettivamente provate.

## Maturità e perimetro

PizzaOS è un pilota avanzato per ordinazione e operazioni di una sede, senza clienti o operatori reali attivi. Tre app indipendenti (`landing`, `client`, `admin`) consumano un servizio autorevole per identità, configurazione, ordini e integrazioni. Rider appartiene ad admin con host e autorizzazioni propri. [Ownership](../../docs/architecture/ownership.md).

| Capacità implementata | Fonte corrente | Limite della dichiarazione |
|---|---|---|
| Google/magic link, superadmin, operatori e rider; demo isolata per sessione | [Accessi](flows/identity-and-access.md), [demo](flows/poc-and-interface.md) | Profilo/consensi commerciali e onboarding self-service non completati |
| Configurazione sede, magazzino, indirizzo confermato, sottodominio e settimana tipo | [Configurazione](flows/store-configuration.md), [calendario](flows/customer-ordering-and-payment.md#calendario-e-capacità) | Eccezioni manuali per singola data escluse; controllo concorrente introdotto localmente in questa stabilizzazione |
| Menu in bozza/pubblicato, ricette, preferenze/allergeni, gusti/formule, extra e consumo impasto/formato | [Menu](flows/menu-ordering.md), D79–D87 nel [registro](decisions.md) | I dati importati non verificati non diventano pubblicabili; pubblicazione del gestore distinta dal deploy del codice |
| Carrello, preventivo autorevole, carta/contanti, recupero, aggiunte con delta, annullamento/rimborso | [Ordine individuale](flows/customer-ordering-and-payment.md) | Il carrello resta sul dispositivo; dispute del provider non hanno un flusso completo |
| Carrello condiviso persistente, QR, anticipi e rimborsi per quota | [Gruppo](flows/group-ordering.md), [SDD del 27 novembre](../design/2026-11-27-shared-cart/design.md) | Incremento locale senza scadenza: quote pagate con ingredienti riservati, saldo del creatore e visibilità anticipata alla pizzeria. Il collaudo online di questo incremento resta distinto dalle prove precedenti |
| Coda/preparazione, assegnazione rider, problemi e nuovo tentativo | [Operazioni e consegne](flows/operations-and-delivery.md) | Assegnazione manuale; GPS e ottimizzazione percorsi esclusi |
| Coupon/fedeltà, email operative e cinque metriche | [Promozioni](flows/promotions-and-loyalty.md), [email](flows/operational-emails.md), [analytics](flows/analytics.md) | Non comprende campagne automatiche, BI/AI, abbonamenti o fatturazione PizzaOS |
| Log sanitizzati, correlazione, Sentry opzionale e retry durevoli | [Diagnostica](flows/backend-observability.md) | Configurare un SDK non certifica recapito alert, retention o servizio presidiato |

Recensioni, abbonamenti, marketing automatico, GPS, AI/BI avanzata, POS/contabilità, fatturazione PizzaOS e CRM/onboarding restano demo, esclusi dagli incrementi o da definire secondo le decisioni esistenti. Il riordino documentale non ne approva il rinvio commerciale né ne attesta l'implementazione. La mappa completa F01–F24 resta nell'[inventario](flow-inventory.md).

## Versione locale e ambiente pubblicato

La versione stabilizzata ha superato lint, typecheck, architettura, build di tutti i workspace e **1.242 test**; 22 test PostgreSQL/Auth sono saltati in assenza del database locale dedicato. Verificati 2 scenari browser calendario/Profilo e 7 scenari individuali (6 al primo passaggio, lo scenario sidebar dopo l'aggiornamento dell'asserzione obsoleta sullo stato del menu). Il [riesame](../design/2026-11-25-stabilization/REVIEW.md) registra comandi, limiti e prove indipendenti. I browser usano servizio isolato con stato in memoria e sostituzioni dei provider, senza attestare PostgreSQL o provider esterni reali.

Il [registro online](../../services/checkout-api/online-deployment.md#allineamento-catalogo-e-rilascio-del-25-novembre-2026) documenta il successivo rilascio coordinato del 25 novembre dal candidato `9784e70`: API, admin/rider e client aggiornati, salvataggio autenticato della bozza verificato con risposta 200 e toast positivo. Il backend precedente rifiutava il nuovo campo `inventoryMode`; la stabilizzazione è ora inclusa nel pilota. Una scheda con revisione superata riceve 409 e conserva le modifiche locali. Il worker è fermo, con quota mensile Hobby Daemons esaurita. La produzione è separata, vuota/non migrata secondo l'ultima evidenza.

La verifica locale del candidato conferma 1.242 test passati, 22 saltati, lint/build/architettura riusciti. La suite browser menu aggiuntiva ha 2 scenari passati, incluso impasto/formato dalla bozza al cliente, e 3 falliti su percorsi/asserzioni precedenti: non costituisce una verifica completa verde del menu. Dettagli e limiti restano nel registro online.

Il percorso cliente → admin → rider con Stripe/3DS ed email è stato provato in sandbox il 5 e il 23 novembre, in sessioni desktop. Queste prove non certificano le modifiche successive del menu né la stabilizzazione attuale. La presenza di un deploy Ready o di `/health` 200 non sostituisce il collaudo operativo.

## Criteri ancora da chiudere

Per il pilota controllato: integrare i lavori paralleli, scegliere la versione candidata, applicare il contratto servizio/admin insieme, verificare il worker del rilascio, dati menu validati dal gestore, accessi e ordine su dispositivi fisici distinti, conflitti/scadenze/rimborsi e isolamento tra sedi. Procedura e lacune sono nella [roadmap](roadmap.md).

Prima di utenti e pagamenti reali restano D16/D31, conservazione dei dati, backup con ripristino provato, monitoraggio/alert e supporto. Sono requisiti di esercizio ancora aperti; questa attività non li dichiara risolti.

## Come mantenere il punto zero

Cambiare regole e casi limite nella fonte proprietaria del flusso, architettura/comandi nel README del modulo, lacune nell'inventario e lavoro residuo nella roadmap. Aggiornare qui soltanto maturità, perimetro e riferimenti alle prove. [Workflow](README.md#manutenzione-nella-stessa-modifica).

La [mappa dell'archivio](../archive/README.md) sostituisce gli ingressi alla vecchia pianificazione. Gli SDD restano evidenze tecniche datate; nessun requisito corrente richiede di ricostruire la sequenza storica per comprendere il flusso.
