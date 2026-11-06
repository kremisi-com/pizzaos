# Raccolta ordini di gruppo

Il modulo possiede raccolte persistenti, partecipanti, capability e revisioni. Usa lo stesso repository transazionale del checkout e salva l'estensione opzionale `groups` nello snapshot, senza nuove tabelle. `GroupOrderingApi` in `@pizzaos/domain` è il contratto browser.

`group-service.ts` autorizza l'organizzatore autenticato e le capability personali; il link invito permette lettura e ingresso. Il riepilogo espone solo nomi e scelte. Scadenza e worker chiudono la raccolta senza riservare risorse. Dopo chiusura l'organizzatore può correggere i contributi, rimuovendo soltanto prodotti da quelli altrui.

Preventivo, riserve, pagamento e ordine sono delegati al servizio individuale canonico. Le note delle righe iniziano con `Per <nome>` e conservano le note personali. Ogni raccolta conserva una chiave canonica privata casuale, generata dal server con 32 byte crittografici e mai esposta nei DTO. Prima del checkout viene congelata la richiesta originale; la stessa chiave persistita assicura recupero e unicità anche attraverso riavvio o risposta persa. Una chiave individuale costruita dall'id pubblico del gruppo non può occupare quella della raccolta. L'organizzatore recupera la richiesta server con `recover`, senza conservare i contatti nel browser. Le modifiche restano bloccate quando l'esito è incerto.

`group-http.ts` registra `/v1/pilot/groups` e le operazioni `join`, `lines`, `remove-participant`, `close`, `quote`, `checkout`, `recover`. Eredita proxy e blocco demo, verifica Origin sulle scritture e valida input senza coercizione né rimozione silenziosa di campi. Join emette il cookie HttpOnly personale `pizzaos-group-<id>`, SameSite=Lax, Secure in HTTPS; le risposte sono no-store. Cookie e invito non consentono di leggere l'ordine completo: il relativo accesso resta individuale.

Verifica dal root: `pnpm --filter @pizzaos/checkout-api test`, `typecheck`, `build`, `lint`; scenari dedicati in `group-service.test.ts` e `group-http.test.ts`.

`GroupFulfillment.benefits` seleziona coupon/premio solo per l�organizzatore pagante; quote inoltra l�identit� host al servizio canonico. Riscatto e accredito appartengono al wallet host. Snapshot invitati e capability non espongono wallet, movimenti o contatti del checkout.
