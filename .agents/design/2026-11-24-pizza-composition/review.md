# Verifica locale del 24 novembre 2026

## Comportamento verificato

- Catalogo strutturato di impasti, basi, formati, topping, gusti e formule, con proiezione autorevole e prezzi completi.
- Tutte le formule senza gusto, sconti su unità più costose, supplementi standard, rimozioni per contributo anche con ingredienti condivisi, indisponibilità recuperabile rimuovendo il topping incluso.
- Pannello per componenti e voci commerciali, duplicazione/rimozione coerenti e salvataggio bozza. Foto e anteprime appartengono alle entità sorgenti.
- Scheda cliente con CSS e sezioni del PoC; dialog isolato tramite portal per impedire l'ereditarietà dei pulsanti operativi. Screenshot mobile ispezionati per Margherita, Simple, Wild e Savage, con anteprima impasto/base e overlay configurati.
- Preventivo, checkout contanti e cucina nel browser. La copia del carrello conserva il tipo pizza anche nel payload del tentativo idempotente. Storico immutabile e parità preventivo gruppo verificati via HTTP.
- Conversione esplicita uno-a-molti, sola bozza, anteprima pura, ripetizione senza incremento di revisione, rifiuto mappature mancanti/ambigue.

## Controlli eseguiti

- Client: suite completa 123 test; dopo gli ultimi interventi, controlli mirati live/PoC (10) e recupero carrello/scheda (16), inclusi due nuovi casi di conservazione del tipo pizza nel checkout.
- Admin: suite completa 115 test, inclusa la regressione conferma eliminazione già presente nella branch.
- Dominio: 29 test complessivi, di cui 10 indipendenti sul catalogo pizza.
- Servizio: suite completa 581 test passati, 22 saltati in 6 file che richiedono PostgreSQL di test configurato. Incluse 13 accettazioni HTTP pizza e 11 scenari di migrazione.
- Browser: `pnpm exec playwright test --config playwright.menu-ordering.config.ts`, 2 scenari passati. Il test preesistente è stato allineato ai link della navigazione admin corrente. Il nuovo scenario controlla le quattro schede, supplemento impasto a totale 720 centesimi, checkout e dettaglio cucina.
- Lint e typecheck dei moduli modificati; build client, admin e servizio passate. Test del controllo architetturale: 4 passati, inclusa esclusione degli output Next isolati `.next-*`.
- `git diff --check` senza errori. Nessun ciclo nuovo dopo la separazione dei tipi pizza dal compilatore.

## Limiti distinti dall'implementazione

Il comando globale `pnpm architecture:check` segnala nove import preesistenti dalle feature admin verso `composition/admin-toast`. Il confronto delle violazioni con i file a HEAD ha verificato **9 preesistenti, 0 nuove**. Non sono state riscritte feature estranee per risolverle. Il controllo ora esclude anche gli artefatti Next con directory isolate, evitando letture di file transitori durante i test.

Nessun manifest commerciale è stato applicato a un database online, nessun menu della sede è stato pubblicato implicitamente. Deploy e verifica online di questa versione restano distinti da queste prove locali; le evidenze online precedenti non vengono aggiornate retroattivamente. Restano da eseguire i test PostgreSQL saltati prima di considerare verificata la persistenza su database reale di questa revisione.
