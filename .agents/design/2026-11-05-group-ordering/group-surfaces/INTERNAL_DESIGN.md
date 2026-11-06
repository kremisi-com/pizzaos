# Presentazione interna

Composizione client crea entrambi i port HTTP; route server conserva mode guard live con middleware già valido per /ordina/*. Fragment letto solo client dopo mount e rimosso dall'URL dopo join (cookie personale consente refresh). Può restare frammento mentre visitor per copiare invito. Referrer policy non espone frammento.

Screen separa creazione, contributo personale/riepilogo e checkout host. Polling 2s usa group.read(id,inviteToken), sempre server-authoritative; aggiorna solo snapshot/catalogo, non form locale. Riferimenti monotoni evitano risposte stale. Quote legata a revision+fulfillment+catalog terms e contatore richieste; invalidare su cambiamenti e ignore risultati in ritardo. Draft righe personali locale memoria; salvataggio esplicito con revisione. Host rimozione via replaceLines esclusivamente per ridurre righe altrui; implementazione service valida questo vincolo.

Checkout: il server conserva input congelato per reload; `recover(id):Promise<IndividualCheckoutResult>` host-only ripete la richiesta originale senza persistere telefono nel browser. Elements conferma carta e riconcilia l'ordine canonico. Dopo invio il link a `/ordina#i-tuoi-ordini` consente recupero pagamento esistente, verifica esito e ricreazione di ordine con pagamento fallito anche in contanti; nessun secondo checkout sul gruppo congelato. Nessun raw field carta.

Checklist: live link, autenticazione create, ingresso guest/cookie, polling indipendente, campi stabili, revisioni/conflitti, chiusura, no stock prenotato, fulfillment host, quote invalidation, cash/card single order, recovery, attribuzione admin, responsive Italiano.
