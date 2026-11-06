# Port UI

`apps/admin/src/features/operational-emails/index.tsx` esporta `OperationalEmailPanel` props `{api:OperationalEmailApi;storeId:string;refreshVersion?:number;pollMs?:number}`. Entry pubblico, nessun import servizio/composizione. Adapter `createOperationalEmailApi():OperationalEmailApi` in composition/api/operational-email-api.ts; same-origin cookies/no-store e path `/api/pilot/v1/pilot/stores/:id/emails`.

Etichette essenziali: «Email operative», «Aggiorna invii», «Nessuna email operativa», «In attesa», «Invio in corso», «Nuovo tentativo», «Bloccato», «Inviato». Eventi: «Ordine ricevuto», «Ordine accettato», «Pronto al ritiro», «In consegna», «Ordine annullato», «Rimborso completato», «Rimborso non riuscito». Ogni record article con aria-label `Email <id>` e dati server, mai rawerror. Poll default3000ms, disattivazione e risposte tardive ignorate alla selezione sede. Errori API accesso/rete in italiano con retry lettura; nessuna conferma invio inventata.

Composizione PilotOperationalPanels aggiunge scheda per sede attiva e port iniettato. Nessuna UI cliente nuova: ordine/stato in app rimangono autorevoli e utilizzabili. Stub firme in public.stub.ts.

`pollMs=0` disabilita il polling nel consumer iniettato; il runtime live usa il default3000ms. Gli errori di caricamento e i codici ultimo errore sono presentati con testo controllato, senza stampare eccezioni raw.
