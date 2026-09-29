# Inventario iniziale dei flussi da definire

## Scopo e lettura corretta

La pianificazione in `.agents/planning/PizzaOS_POC/` definisce un prodotto dimostrativo: stati locali, dati seedati, accesso presunto, integrazioni simulate e nessun collegamento runtime tra landing, client e admin. Questa ricognizione avvia il passaggio a una specifica per il prodotto definitivo; non presume che ogni funzionalità POC debba diventare una funzionalità di produzione.

Legenda: **presente** = requisito o contratto già esiste; **parziale** = esiste una base ma mancano regole o implementazione completa; **da decidere** = richiede una decisione di prodotto prima di specificare il comportamento.

## Basi già presenti nel repository

- `@pizzaos/domain` espone un `ClientApiContract` per sessione, catalogo, carrello, checkout, stato checkout, ordini, riordino, loyalty, premi, coupon, gruppo, tracking e aggiornamenti live.
- `services/checkout-api` è un servizio Fastify con PostgreSQL e Stripe per creazione idempotente del checkout, lettura e riconciliazione di tentativi di pagamento. Non è un backend completo degli ordini/catalogo: al momento accetta importi e payload d'ordine dal client, non espone webhook, autenticazione, API catalogo/admin o transizioni operative.
- Il client include Stripe.js e stati pagamento separati dagli stati ordine; la logica di checkout reale va verificata contro le regole economiche e operative finali.
- Il dominio include transizioni d'ordine, conflitti di disponibilità server-authoritative e buste eventi versionate come contratti; ciò non prova che esista un trasporto o un servizio live implementato.
- Admin e client hanno flussi POC locali. La strategia di allineamento documentata usa riferimenti narrativi condivisi, non sincronizzazione dati.

## Flussi da specificare

| ID | Flusso | Stato rispetto al POC | Lacuna da chiudere |
|---|---|---|---|
| F01 | Identità cliente, registrazione/accesso, profilo e sessione | Accesso presunto; contratto sessione presente | Identità, metodi di accesso, verifica, recupero, consensi, account ospite, sicurezza |
| F02 | Identità operatore, ruoli e accesso ai punti vendita | Accesso presunto; selettore multi-store mock | Inviti, ruoli/permessi, autenticazione forte, appartenenza a tenant/store e audit |
| F03 | Onboarding ristorante/tenant e configurazione negozio | Quasi assente | Creazione tenant, sedi, orari, zone, contatti, fuso, valuta, configurazione iniziale |
| F04 | Catalogo: creazione, revisione, pubblicazione e versioni | CRUD mock admin; lettura catalogo nel contratto client | Owner, stati bozza/pubblicato, approvazione, orari, propagazione, rollback e versionamento |
| F05 | Prezzi, varianti, ingredienti, allergeni e informazioni al cliente | Modelli e form parziali | Prezzo autorevole, storico, derivazione allergeni, avvertenze, responsabilità e localizzazione |
| F06 | Disponibilità, scorte e prenotazione stock | Simulazione locale; contratto conflitti presente | Ricette/consumo, soglie, aggiornamento stock, riserva/rilascio, concorrenza e riconciliazione |
| F07 | Scoperta del negozio, indirizzo e idoneità delivery/pickup | Percorso demo basato su store predefinito | Selezione sede, copertura, costi/minimi, indirizzo, geocodifica e fallback pickup |
| F08 | Fasce orarie/capacità e orari limite | Slot visibili nel client | Chi configura capacità, cutoff, ritardi, chiusure, timezone, saturazione e riprenotazione |
| F09 | Carrello e ricalcolo prezzi | Flusso guest-to-auth senza stacco; recupero reload con dati selezionati in localStorage, senza sync multi-device | Scadenza draft e comportamento su conflitti prezzo/stock/slot (D37/D42/D48) |
| F10 | Coupon, promozioni, loyalty e premi | Flussi/contratti client; marketing mock admin | Regole di cumulabilità, budget, limiti, riserva, consumo, accredito/reversal punti, abuso e scadenze |
| F11 | Checkout, pagamento, conferma ordine e rifiuti | Servizio checkout/Stripe parziale già presente; incasso al checkout e rimborso su rifiuto decisi | Prezzo server-authoritative, idempotenza, 3DS, esiti asincroni, contanti, stato/fallimento rimborsi (D18/D33) |
| F12 | Coda ordini admin, accettazione/rifiuto e preparazione | Timeout automatico definito; dashboard solo admin con aggiornamento live richiesto; risorse/capacità riservate durante attesa risposta via email/WhatsApp | Trasporto/fallback live, motivi di rifiuto e casi programmati (D17/D34/D40) |
| F13 | Modifiche, annullamento, rimborso e contestazione | Solo cliente modifica; annullamento autonomo prima dell'accettazione; dopo, richiesta via email/WhatsApp; alternativa concordata → annullamento + nuovo carrello senza prodotto mancante; attesa senza limite con riserva | Contatti/template, processo annullamento post-accettazione e stati di rimborso (D20/D35/D36/D38/D39/D44/D45/D47) |
| F14 | Fulfillment: ritiro, consegna, rider e prova di consegna | Simulazione admin/client | Assegnazione, dispatch, riassegnazione, tracking, ritardi, mancata consegna e chiusura |
| F15 | Aggiornamenti live e notifiche | Contratto eventi; mock locali | Trasporto, ordinamento, retry/cursor, canali, preferenze, deduplica e fallback offline |
| F16 | Storico, riordino e feedback | Definiti a livello UI/contratto | Visibilità ordini, eleggibilità feedback, una recensione?, riordino con catalogo/prezzi correnti |
| F17 | Ordine di gruppo | Carrello locale condiviso simulato | Link/accesso reale, ruoli, chiusura, modifiche concorrenti, pagante e ripartizione |
| F18 | Marketing automation | Flussi statici/mock | Eventi di ingresso, segmenti, consenso, regole, invio, soppressione, test e misurazione |
| F19 | Analytics e insight AI | Dashboard simulata | Fonti/eventi, definizioni metriche, latenze, privacy, spiegabilità, azioni e limiti AI |
| F20 | Abbonamenti e fatturazione PizzaOS | Profilo admin simulato | Piani commerciali, metrica di fatturazione, ciclo, pagamenti, downgrade, insolvenza e fatture |
| F21 | Landing, acquisizione lead e avvio prova/demo | Moduli dimostrativi | Lead owner, CRM/consenso, onboarding, trial, separazione messaggi disponibili vs roadmap |
| F22 | Integrazioni POS, delivery, contabilità e piattaforme | Alcune solo placeholder | Quali si lanciano, direzione dati, fonte autorevole, mapping, errori e supporto operativo |
| F23 | Errori, indisponibilità e ripetizione sicura | Categorie generiche POC; checkout idempotente | Esperienza per timeout, rete, duplicati, coda offline, payment pending e recupero |
| F24 | Sicurezza, privacy, conservazione ed esercizio | Quasi assenti dalle specifiche POC | Dati personali/pagamento, GDPR, retention/cancellazione, log, backup, incidenti e supporto |

## Riscontro comparativo: pratiche osservate

Questi esempi descrivono strumenti specifici consultati il 29 settembre 2026 e non sono una rilevazione esaustiva di tutti i concorrenti né decisioni già approvate per PizzaOS.

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

## Documenti POC da trattare come storia, non specifica attuale

- `.agents/planning/PizzaOS_POC/rough-idea.md`: perimetro esplicito di demo mock e lista aspirazionale, include anche funzioni teaser.
- `.agents/planning/PizzaOS_POC/requirements/`: requisiti vincolati a frontend-only, localStorage e assenza di comunicazione reale tra app.
- `.agents/planning/PizzaOS_POC/design/` e `implementation/`: piani e scelte di implementazione della demo, non una specifica di produzione.
- `.agents/planning/PizzaOS_POC/admin-alignment-plan.md`: decisioni valide per allineare i due POC, in particolare pseudo-correlazione, non sincronizzazione runtime.
- `.agents/design/2026-09-17-progressive-disclosure/`: refactor architetturale già eseguito e relativo stato; mantenere come documento storico del cambiamento.

## Struttura di destinazione proposta

```text
.agents/
  product-definition/
    README.md
    decisions.md
    flow-inventory.md
    glossary.md
    roadmap.md
    flows/
      identity-and-access.md
      tenant-and-store-setup.md
      catalog-and-availability.md
      customer-ordering-and-payment.md
      restaurant-operations.md
      fulfillment-and-notifications.md
      promotions-and-loyalty.md
      group-ordering.md
      analytics-and-automation.md
      billing-and-integrations.md
      privacy-and-reliability.md
    architecture/
      system-context.md
      ownership-and-data-boundaries.md
      service-contracts.md
      operational-requirements.md
  planning/PizzaOS_POC/       # archivio storico, marcato come sostituito
  design/<data>-<intervento>/ # design SDD implementativi completati o pianificati
  skills/                     # workflow e competenze agent
```

La suddivisione definitiva dipende dalle risposte seguenti: non apriremo specifiche granulari prima di sapere quali capacità fanno parte della prima versione commerciale.

