# Deploy del pilota: domini operativi e ambienti

Stato: aggiornato il 2026-11-05. Client, admin/rider e backend sono online sul database Neon di test. `admin.pizzaos.app` e `rider.pizzaos.app` servono lo stesso deploy di `apps/admin`; `client.pizzaos.app` usa il nuovo flusso persistente sul medesimo servizio `api.pizzaos.app`. Verificati Google reale, permessi distinti, contanti/consegna, pagamento/rimborso Stripe sandbox e persistenza dopo riavvio. La successiva [prova cliente completa](../../../services/checkout-api/online-client-verification.md) copre Stripe Elements, challenge 3DS, gestione admin, consegna rider e tre email Delivered. Resta il criterio D56 dei dispositivi fisici distinti. Produzione separata e non attivata. Risorse, versioni e limiti sono nel [registro di pubblicazione](../../../services/checkout-api/online-deployment.md).

## Applicazioni e indirizzi

| Superficie | Indirizzo | Responsabilità |
|---|---|---|
| Landing | `landing.pizzaos.app` (esistente, non aggiornata in questo rilascio) | Presentazione PizzaOS, distinta dall'operatività |
| Client | `client.pizzaos.app` (pubblicato e verificato sul pilota test) | Menu, carrello, ordini e stato cliente |
| Admin | `admin.pizzaos.app` (D71) | Configurazione sede e gestione ordini |
| Rider | `rider.pizzaos.app` (D71) | Sole consegne assegnate all'identità collegata |
| Backend | `api.pizzaos.app` | Servizio condiviso per identità, ordini, pagamenti e persistenza; nessun quarto frontend |

Rider è una vista mobile essenziale di `apps/admin`. I due sottodomini operativi puntano allo stesso progetto e deploy frontend per ambiente: si mantengono le tre applicazioni `landing`, `client` e `admin`, senza un quarto deploy frontend. Il backend ha un proprio progetto di servizio. La composizione di `apps/admin` seleziona ingresso e navigazione in base all'host: esperienza operatore su `PIZZAOS_APP_ORIGIN`, esperienza rider su `PIZZAOS_RIDER_ORIGIN`. Le pagine verificano la sessione lato server prima di rendere le shell. I percorsi `/operazioni` e `/rider` restano responsabilità di `apps/admin`; sull'host distinto dell'altra area tornano alla home locale. Comportamento verificato sia sui due host locali sia online.

Gli attuali host operativi pubblici ospitano il pilota test. L'ambiente Vercel denominato Production identifica gli alias, ma usa soltanto database e provider test. La futura produzione e le anteprime richiedono host e credenziali propri; nessun segreto o database di produzione viene riutilizzato automaticamente nelle anteprime.

## Configurazione hosting verificata

- Progetto corretto: [`kremisis-projects/pizzaos-admin`](https://vercel.com/kremisis-projects/pizzaos-admin), ID `prj_KzbNoKFKlPO2c8VhzHi5pfDCxDuO`. `admin.pizzaos.app` era già associato; `rider.pizzaos.app` è stato aggiunto allo stesso progetto senza redirect.
- Zona `pizzaos.app` verificata nel medesimo team, delegata a `ns1.vercel-dns.com` e `ns2.vercel-dns.com`. Il record wildcard ALIAS è gestito da Vercel; la configurazione rider risulta corretta senza nuovi record manuali. Nessuna modifica ai nameserver OVH o ai record della posta in ingresso.
- Variabili dell'alias operativo configurate: `PIZZAOS_APP_ORIGIN=https://admin.pizzaos.app`, `PIZZAOS_RIDER_ORIGIN=https://rider.pizzaos.app`, `PIZZAOS_SERVICE_URL=https://api.pizzaos.app` e segreto proxy protetto. Backend `pizzaos-api` nello stesso team, HTTP Functions e Daemon minimo da 1 GiB in `fra1`; budget autorizzato soltanto gratuito.
- Resend gratuito con `pizzaos.app` verificato: aggiunti soltanto il TXT DKIM e i CNAME di invio richiesti, senza cambiare nameserver o posta in ingresso. OAuth Google in test con callback esatte dei tre host applicativi e due utenti di prova.
- Durante l'individuazione dell'account, su indicazione iniziale dell'utente era stato creato anche un progetto vuoto omonimo in `benjanapos-projects`, ID `prj_hHutfpU79G6C5fQvDtdOaGuW1AJz`, con richieste dominio non verificate. Non ha deployment e non serve i domini; non usarlo per i rilasci PizzaOS.

## Identità e autorizzazioni

Auth.js gestisce le identità Google/magic link secondo D04. La medesima identità può avere appartenenze diverse: gli operatori accedono alle sedi autorizzate, il rider alle proprie assegnazioni. Un login riuscito non concede automaticamente un ruolo.

Il superadmin invita gli operatori (D07/D55); l'operatore gestisce l'elenco e l'accesso dei rider della propria sede (D57). Il ruolo rider è distinto dagli operatori equiparati di D05. Il servizio controlla ogni lettura e azione; la separazione non dipende dal sottodominio, dal percorso URL o dalla visibilità dei pulsanti. Il rider non riceve configurazioni, analytics, pagamenti del provider o ordini assegnati ad altri.

Le sessioni browser restano sul rispettivo host; condividere Auth.js e il database non richiede cookie estesi a tutti i sottodomini. Admin e rider hanno ingressi di accesso distinti sui rispettivi host, con destinazioni consentite dal ruolo. La configurazione di origini, callback OAuth, magic link e proxy deve supportare e verificare entrambi gli host operativi, mantenendo separati test e produzione.

## Dati e backend

Client, admin e rider consumano le API del medesimo servizio autorevole `services/checkout-api`. Il servizio possiede PostgreSQL, pagamenti e transizioni. I browser non accedono direttamente al database. Nessuna app importa l'implementazione di un'altra app.

Un database PostgreSQL per ambiente conserva identità, sedi, configurazioni, ordini, assegnazioni e analytics. Le sedi restano isolate dalle autorizzazioni lato servizio; rider e clienti ricevono soltanto i dati pertinenti. Un database per ogni frontend creerebbe copie da sincronizzare e non è previsto.

Test e futura produzione usano database e credenziali distinti, incluse chiavi Stripe, segreti sessione/proxy e configurazioni email/OAuth. I deploy di anteprima non devono usare il database di produzione.

Il backend Vercel separa le richieste Fastify/SSE in Functions dal worker persistente Daemon. I due ingressi usano lo stesso runtime e database; il worker possiede i cicli indipendenti per riconciliazione e invii operativi. Il processo standalone conserva HTTP e worker per lo sviluppo. La quota gratuita Hobby del Daemon è finita: una istanza da 1 GiB consente al massimo 17,5 giorni mensili secondo la quota memoria, condivisa dal team; al limite Vercel arresta il worker. Non è sufficiente pubblicare i soli frontend e non si garantisce esecuzione mensile continua sul piano gratuito.

## Verifiche di rilascio e prossimi ambienti

Le verifiche online sono registrate nel documento del servizio, inclusi mapping degli host, Google, cookie e permessi, flusso contanti/consegna, Stripe sandbox e riavvio. Un magic link di prova risulta Delivered in Resend. Il [verbale client](../../../services/checkout-api/online-client-verification.md) documenta inoltre Stripe Elements/3DS nel browser cliente, ordine carta completato dal rider e tre email operative Delivered; la allowlist resta limitata all'account di prova. Prima dell'attivazione commerciale completare prove su dispositivi fisici distinti e controlli tra sedi e ambienti del relativo rilascio, oltre ai limiti elencati nel verbale. D16/D31 restano aperte per la successiva messa in esercizio con dati reali.

Fonti tecniche: README delle applicazioni e del servizio; [Vercel monorepos](https://vercel.com/docs/monorepos) per i progetti frontend separati. Le scelte di prodotto sono registrate in [decisions.md](../decisions.md).
