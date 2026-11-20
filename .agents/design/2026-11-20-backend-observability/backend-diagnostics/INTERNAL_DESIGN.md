# Implementazione interna

- Pino diretto e istanza condivisa con Fastify, logging automatico HTTP disattivato; completamento ed errore emessi dai nostri hook per evitare URL/header grezzi e duplicazioni.
- AsyncLocalStorage per contesto richiesta e job. UUID generato dal backend. Header hook prima di auth, inclusi rifiuti e validazione; body errore con ID. Route template dalle routeOptions; fallback statico per not found.
- Sanitizzazione per allowlist: niente messaggi liberi; tipi errore noti, stack solo frame file/riga/colonna, cause limitate e gestione cicli. Hook Pino filtra anche chiamate dirette. Il reporter riceve copie sicure. Limite mappa deduplica e finestra 60s con conteggio soppresse, requestId incluso per non sopprimere richieste diverse.
- Adapter Sentry con defaultIntegrations:false, niente auto tracing, captureEvent manuale e beforeSend ricostruttivo. Nessun import/inizializzazione se DSN assente. Flush limitato e fallimenti isolati, anche in serverless finally. Nessun log locale di segreti di configurazione.
- Reporter iniettato alle factory: coprire catch recuperabili nelle operazioni provider senza aggiungere side effect transazionali. Email diagnostica dopo finalizzazione della claim. Timer creano jobId per tick e recupero; processi possiedono shutdown e flush.
- Runtime webhook traduce la sola eccezione firma Stripe in errore pubblico previsto; il boundary non trasforma più tutti gli errori in 400.
- Verifica reale successiva: conservare platform node e marcatori in_app per i frame .ts/.tsx nel filtro Sentry finale. SQLSTATE53000 appartiene ai codici noti di dipendenza indisponibile e alla allowlist diagnostica; non serializzare il testo libero della quota.
- Il builder genera .vercelignore con esclusioni di node_modules, .vercel, env e log; il dry-run di deploy verifica i nove file previsti, senza pubblicazione. La scelta operativa di pausa fra1=0 per quota Neon è esterna al ciclo di retry applicativo e resta da revocare esplicitamente al ripristino.
- Build esbuild con mappe inline senza sourcesContent per risolvere posizioni senza file aggiuntivi nel worker; Node con supporto source map. Dipendenze incluse nel manifest di deployment.
- Dominio aggiunge internal_error; proxy inoltrano header risposta; UI cliente conserva fallback/recupero esistenti. Stati admin esistenti confermati dalle regressioni.

Checklist: R1 correlazione e concorrenza; R2 mapping; R3 emissione singola; R4 allowlist su entrambe le destinazioni; R5 catch e stati; R6 limiti/failure isolation; R7 opt-in e flush; R8 firma/SSE; R9 runtime/proxy/fatal. I test indipendenti precedono l'implementazione. README, flow F23/F24, D73, inventory e roadmap distinguono locale/online.
