# Deploy del pilota: domini operativi e ambienti

Architettura consolidata il 25 novembre 2026; nessuna nuova verifica cloud implicita. Client, admin/rider e backend condividono il database di test all'interno dell'ambiente. `admin.pizzaos.app` e `rider.pizzaos.app` servono lo stesso deploy di `apps/admin`; il client usa `api.pizzaos.app`. Produzione separata e non attivata secondo l'ultima evidenza. Versioni, istanze worker e prove effettive sono nell'[ultimo stato registrato](../../../services/checkout-api/online-deployment.md), senza estenderle a HEAD. [Criteri residui](../roadmap.md).

## Applicazioni e indirizzi

| Superficie | Indirizzo | Responsabilità |
|---|---|---|
| Landing | `www.pizzaos.app` | Presentazione PizzaOS e accesso alle demo |
| Client | `client.pizzaos.app` (pubblicato e verificato sul pilota test) | Menu, carrello, ordini e stato cliente |
| Admin | `admin.pizzaos.app` (D71) | Configurazione sede e gestione ordini |
| Rider | `rider.pizzaos.app` (D71) | Sole consegne assegnate all'identità collegata |
| Backend | `api.pizzaos.app` | Servizio condiviso per identità, ordini, pagamenti e persistenza; nessun quarto frontend |

Rider è una vista mobile essenziale di `apps/admin`. I due sottodomini operativi puntano allo stesso progetto e deploy frontend per ambiente: si mantengono le tre applicazioni `landing`, `client` e `admin`, senza un quarto deploy frontend. Il backend ha un proprio progetto di servizio. La composizione di `apps/admin` seleziona ingresso e navigazione in base all'host: esperienza operatore su `PIZZAOS_APP_ORIGIN`, esperienza rider su `PIZZAOS_RIDER_ORIGIN`. Le pagine verificano la sessione lato server prima di rendere le shell. I percorsi `/operazioni` e `/rider` restano responsabilità di `apps/admin`; sull'host distinto dell'altra area tornano alla home locale. Comportamento verificato sia sui due host locali sia online.

Gli attuali host operativi pubblici ospitano il pilota test. L'ambiente Vercel denominato Production identifica gli alias, ma usa soltanto database e provider test. La futura produzione e le anteprime richiedono host e credenziali propri; nessun segreto o database di produzione viene riutilizzato automaticamente nelle anteprime.

## Configurazione hosting e riferimenti

Andrea ha autorizzato il 26 novembre 2026 i deploy automatici del backend dal solo branch `main`, per ora unico branch di rilascio. Il progetto esistente `pizzaos-api` usa il repository `kremisi-com/pizzaos`, root `services/checkout-api`, con i file esterni alla root inclusi. Configurazione e controlli appartengono al servizio: [runtime e deploy](../../../services/checkout-api/README.md#runtime-e-artefatto-vercel). API e worker vengono preparati dalla stessa revisione; il worker resta fermo (`fra1=0`). Migrazioni e pubblicazione dei menu non sono conseguenze del push. La verifica effettiva del collegamento e dei rilasci è distinta dalla scelta ed è registrata nel [verbale online](../../../services/checkout-api/online-deployment.md).

Le associazioni sotto derivano dai verbali del pilota. Non attestano disponibilità o numero istanze al momento della lettura; prima di un rilascio applicare il [runbook](../../../services/checkout-api/pilot-operations.md).

- Progetto corretto: [`kremisis-projects/pizzaos-admin`](https://vercel.com/kremisis-projects/pizzaos-admin), ID `prj_KzbNoKFKlPO2c8VhzHi5pfDCxDuO`. `admin.pizzaos.app` era già associato; `rider.pizzaos.app` è stato aggiunto allo stesso progetto senza redirect.
- Zona `pizzaos.app` verificata nel medesimo team, delegata a `ns1.vercel-dns.com` e `ns2.vercel-dns.com`. Il record wildcard ALIAS è gestito da Vercel; la configurazione rider risulta corretta senza nuovi record manuali. Nessuna modifica ai nameserver OVH o ai record della posta in ingresso.
- Variabili dell'alias operativo: `PIZZAOS_APP_ORIGIN=https://admin.pizzaos.app`, `PIZZAOS_RIDER_ORIGIN=https://rider.pizzaos.app`, `PIZZAOS_SERVICE_URL=https://api.pizzaos.app` e segreto proxy protetto. Backend `pizzaos-api` nello stesso team, HTTP Functions e worker `reconciliation` separati. Neon è passato a Launch il 23 novembre per azione dell'utente; non assumere un vincolo Free o nuove autorizzazioni di spesa dai vecchi piani.
- Resend gratuito con `pizzaos.app` verificato: aggiunti soltanto il TXT DKIM e i CNAME di invio richiesti, senza cambiare nameserver o posta in ingresso. OAuth Google in test con callback esatte dei tre host applicativi e due utenti di prova.
- Durante l'individuazione dell'account, su indicazione iniziale dell'utente era stato creato anche un progetto vuoto omonimo in `benjanapos-projects`, ID `prj_hHutfpU79G6C5fQvDtdOaGuW1AJz`, con richieste dominio non verificate. Non ha deployment e non serve i domini; non usarlo per i rilasci PizzaOS.

## Sottodomini delle sedi

Per D76, collegare `*.pizzaos.app` al progetto `pizzaos-client` e verificare DNS, HTTPS e la pagina per un host ancora senza sede. La zona usa già i nameserver Vercel. Gli indirizzi espliciti delle altre superfici restano associati ai rispettivi progetti.

Impostare `PIZZAOS_ORDERING_DOMAIN=pizzaos.app` per servizio, client e admin nell'ambiente del pilota. Sul servizio, impostare `PIZZAOS_ORDERING_AUTH_ORIGIN=https://client.pizzaos.app`, già presente tra le origini esatte consentite e registrata come callback Google. Pubblicare nell'ordine servizio, client, collegamento wildcard, admin. Con l'admin aggiornato il superadmin può assegnare i sottodomini senza interventi DNS per sede.

Il servizio rifiuta richieste a host dinamici privi di associazione e applica l'isolamento anche alle API. Le sessioni delle sedi sono specifiche del singolo host. Ogni ambiente usa il proprio dominio e la propria origine OAuth se attiva questa funzione.

È possibile conservare gli indirizzi cliente già in uso in `PIZZAOS_CLIENT_LEGACY_HOSTS`. Per un alias sotto il dominio ordini il fallback al pilota vale fino all'assegnazione a una sede. Gli altri host privi di associazione mostrano il messaggio di sito non configurato.

## Identità e autorizzazioni

Auth.js gestisce le identità Google/magic link secondo D04. La medesima identità può avere appartenenze diverse: gli operatori accedono alle sedi autorizzate, il rider alle proprie assegnazioni. Un login riuscito non concede automaticamente un ruolo.

Il superadmin invita gli operatori (D07/D55); l'operatore gestisce l'elenco e l'accesso dei rider della propria sede (D57). Il ruolo rider è distinto dagli operatori equiparati di D05. Il servizio controlla ogni lettura e azione; la separazione non dipende dal sottodominio, dal percorso URL o dalla visibilità dei pulsanti. Il rider non riceve configurazioni, analytics, pagamenti del provider o ordini assegnati ad altri.

Le sessioni browser restano sul rispettivo host; condividere Auth.js e il database non richiede cookie estesi a tutti i sottodomini. Admin e rider hanno ingressi di accesso distinti sui rispettivi host, con destinazioni consentite dal ruolo. La configurazione di origini, callback OAuth, magic link e proxy deve supportare e verificare entrambi gli host operativi, mantenendo separati test e produzione.

## Dati e backend

Client, admin e rider consumano le API del medesimo servizio autorevole `services/checkout-api`. Il servizio possiede PostgreSQL, pagamenti e transizioni. I browser non accedono direttamente al database. Nessuna app importa l'implementazione di un'altra app.

Un database PostgreSQL per ambiente conserva identità, sedi, configurazioni, ordini, assegnazioni e analytics. Le sedi restano isolate dalle autorizzazioni lato servizio; rider e clienti ricevono soltanto i dati pertinenti. Un database per ogni frontend creerebbe copie da sincronizzare e non è previsto.

Test e futura produzione usano database e credenziali distinti, incluse chiavi Stripe, segreti sessione/proxy e configurazioni email/OAuth. I deploy di anteprima non devono usare il database di produzione.

Il backend Vercel separa le richieste Fastify/SSE in Functions dal worker persistente Daemon. I due ingressi usano lo stesso runtime e database; il worker possiede i cicli indipendenti per riconciliazione e invii operativi. Il processo standalone conserva HTTP e worker per lo sviluppo. L'ultima evidenza registra il worker fermo dopo il collaudo: pubblicare frontend/API non ne certifica l'attività. Disponibilità, piani, quote e costi si verificano sulla piattaforma al momento del rilascio, conservando le misure nel registro online.

## Verifiche di rilascio e prossimi ambienti

Le verifiche online sono registrate nel documento del servizio, inclusi mapping degli host, Google, cookie e permessi, flusso contanti/consegna, Stripe sandbox e riavvio. Il [verbale client](../../../services/checkout-api/online-client-verification.md) documenta Stripe Elements/3DS e tre email Delivered per quella prova. Il 23 novembre le email operative sono passate a `test_open` nel solo pilota: l'allowlist iniziale non è l'ultima modalità registrata. Prima dell'attivazione commerciale completare prove su dispositivi fisici distinti e controlli tra sedi e ambienti della versione candidata. D16/D31 e i criteri della roadmap restano aperti.

Fonti tecniche: README delle applicazioni e del servizio; [Vercel monorepos](https://vercel.com/docs/monorepos) per i progetti frontend separati. Le scelte di prodotto sono registrate in [decisions.md](../decisions.md).
