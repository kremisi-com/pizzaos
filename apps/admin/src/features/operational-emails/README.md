# Email operative della sede

La feature presenta lo stato autorevole degli invii attraverso il port pubblico `OperationalEmailApi`. L'entry `index.tsx` esporta `OperationalEmailPanel`, con sede, versione di refresh e intervallo polling opzionali. Non invia email e non importa implementazioni del servizio o composizione.

La lista distingue evento, destinatario, stato, tentativi, data e prossimo retry. Gli errori hanno testo controllato per codice; eccezioni, configurazione SMTP e segreti non vengono stampati. Il polling predefinito di tre secondi riprende gli aggiornamenti anche senza nuovi eventi ordine; `pollMs=0` disabilita il polling nel consumer iniettato. La risposta della sede precedente non appare dopo cambio sede e le revisioni precedenti non sovrascrivono quelle più recenti.

L'admin legge l'outbox della propria sede, senza endpoint browser di invio o simulazione. Un errore email non impedisce il normale lavoro sull'ordine. Lo stato resta sempre nell'app; WhatsApp resta manuale. SMTP, policy destinatari e retry persistenti appartengono a `services/checkout-api`.

Verifica: test/lint/typecheck/build admin, architettura e `pnpm exec playwright test --config playwright.operational-emails.config.ts`. Specifica `.agents/design/2026-11-05-operational-emails/`.
