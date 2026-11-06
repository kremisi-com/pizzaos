# Coupon e fedeltà live

La feature presenta il wallet della sede e la selezione commerciale nel checkout individuale e dell'host gruppo. Il port pubblico `PromotionsApi` viene iniettato dalla composizione; il vecchio modello loyalty locale demo resta separato. Nessun saldo, sconto o accredito è calcolato o persistito dal browser.

L'entry `index.tsx` esporta `PromotionSelectionPanel`, `PromotionSelectionProps` e `PromotionSummary`. Il pannello legge saldo/punti impegnati/disponibili e regole dal servizio, applica codici nell'ordine esplicito e seleziona un premio. Il polling e gli eventi invalidano la quote se cambiano programma o saldo; gli input coupon in corso restano stabili. Il riepilogo presenta esclusivamente il breakdown server e delivery separata.

Il carrello conserva solo `PromotionSelection`, inclusa la richiesta checkout originale attraverso reload/retry. Un errore economico definitivo precedente all'ordine libera il tentativo browser per correggere i benefici; un esito incerto conserva la richiesta originale. Totale zero verificato server permette conferma esplicita senza Stripe anche se è selezionato il metodo carta. Aggiunte successive usano il delta canonico senza una nuova selezione benefici.

Verifica: test client, lint/typecheck/build e architettura. Browser completo `pnpm exec playwright test --config playwright.promotions-loyalty.config.ts`. Specifica `.agents/design/2026-11-05-promotions-loyalty/`.
