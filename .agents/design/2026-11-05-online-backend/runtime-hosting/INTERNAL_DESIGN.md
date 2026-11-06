# Implementazione interna

Estrarre la configurazione server in funzione pura e la creazione app/pool in factory asincrona. Un ciclo indipendente incapsula timer, promessa tick in corso e arresto; gli ingressi standalone e daemon ne gestiscono start/stop e chiudono pool/app solo dopo il drain.

La funzione Vercel attende app.ready e inoltra IncomingMessage/ServerResponse al server Fastify, mantenendo streaming e raw webhook. Esbuild include codice del servizio e lascia esterne le dipendenze npm; il packaging crea un artefatto separato senza workspace sibling o env. Il daemon usa lo stesso bundle runtime e una singola istanza.

Checklist: configurazione prima delle risorse; niente segreti negli errori; origini validate; Stripe test isolato; zero worker nelle funzioni; tick non sovrapposti; arresto attende il lavoro; nessuna migrazione automatica nel runtime; nessun import tra app; artifact pulito.
