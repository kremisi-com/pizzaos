# Requisiti

Login reale Google o magic link tramite Auth.js; carrello non perso attraversando login. Segreti e PostgreSQL appartengono al servizio. Sessione HttpOnly; scritture same-origin, origine verificata e niente header di impersonificazione. Sedi e inviti creati solo da email superadmin configurate sul server. Ogni richiesta protetta verifica sessione e appartenenza corrente.

Runtime fallisce esplicitamente se configurazione necessaria manca; nessun login fittizio o provider carta simulato selezionabile dal browser. Configurazione e script locali documentati, .env.example senza segreti. Webhook verifica firma sul corpo originale, riconcilia dal provider; duplicati non duplicano effetto. Worker avvia riconciliazione e scadenze anche senza visite UI. Restart non perde ordini/operazioni remote pendenti.

Due app accedono al medesimo servizio attraverso proxy same-origin; autorizzazioni applicate sul servizio. Il proxy inoltra cookie e Set-Cookie, risposta e stream senza cache; limita destinazione e metodi, rifiuta origini estranee sulle mutazioni. Lo stream termina quando la sessione scade e non espone ordini altrui.
