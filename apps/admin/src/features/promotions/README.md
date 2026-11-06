# Configurazione coupon e fedeltà

La feature possiede form e presentazione delle configurazioni commerciali della sede. `PromotionAdminPanel` è esportato dall'entry pubblico `index.tsx` e riceve `PromotionsApi`, sede attiva e prodotti dalla composizione. Non importa implementazioni del servizio o della composizione e non modifica il POC marketing.

Il programma e tutti i coupon sono letti/salvati sul servizio: tasso punti, premio, attivazione, validità, minimo, prodotti ammessi e limiti. I valori UI sono in euro/percentuale e il servizio rivalida gli interi cent/basis point. I salvataggi usano revisioni server; un conflitto ricarica la configurazione senza dichiarare un successo. I form in corso non vengono sovrascritti dal normale refresh operativo. I limiti mostrano utilizzi consumati e impegnati restituiti dal servizio.

La scheda «Coupon e fedeltà» nella composizione operativa carica il catalogo della sede e monta questo pannello. Il riepilogo breve nell'ordine canonico rende espliciti lordo, coupon, premio e netto dovuto al ristorante.

Verifica: test admin, lint/typecheck/build e architettura. Browser `pnpm exec playwright test --config playwright.promotions-loyalty.config.ts`, senza provider esterni. Specifica `.agents/design/2026-11-05-promotions-loyalty/`.
