# Implementazione UI

Nuova capability app-local `features/promotions` con entry pubblico; non riusare modello locale demo. Adapter HTTP duplicati piccoli indipendenti nelle due app per evitare coupling app-to-app. Shell passano PromotionsApi a feature individuale e gruppo; admin composition aggiunge pannello e carica catalogo. Componenti CSS Module allineati alle espressioni client/admin già attive.

Wallet fetch/poll5s e refreshVersion eventi; confronta programma/revision/saldo per invalidare quote tramite callback stabile, non sovrascrive input coupon in corso. Initial load non deve creare loop rendering. Stato richieste sequenziato/ignore stale alla selezione sede; cambiare tenant cancella wallet precedente prima di mostrare nuovo. Guest mostra login solo per benefici individuali; gruppo nonhost non monta il pannello. Disabilita selezione durante tentativi congelati.

Admin stato form programma e coupon separato. Fetch legato sede/reload, dirty form non sovrascritto da refresh periodico. Save optimistic revision ed errori strutturati; bottone edit popola form dal coupon server. Null limite/date come campo vuoto, default economici solo dalla risposta programma. Disattivazione stesso endpoint saveCoupon con active false. Nessun seed o saldo di test in runtime.

Individual draft.copy conserva benefits validati, checkout-attempt usa stesso copier; reordering nuovo cart può conservare codici ma sempre nuova verifica richiesta. Finestra quote invalidata su selezione/onTermsChange e contatore asincrono già previsto. Group fulfillment JSON hash include benefits e contratti service strict li validano. Summary estrae solo quote.promotions e total server, nessun ricalcolo economico.

Checklist: admin config+edit+disable, tenant switching e errori, wallet/read min, input codici/reward, individual+group host, snapshot summary, quote invalidation e original retry, no benefits su delta, browser flow completion/restore, accessibilità etichette e controlli, mobile italiano, no coupling privato.
