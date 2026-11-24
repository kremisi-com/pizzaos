# Pizze da gusto e formule, con la UX del PoC

Decisioni confermate in chat il 24 novembre 2026: Simple, Wild e Savage partono tutte senza gusto; il prezzo completo include impasto, base e formato standard. Le alternative applicano supplementi configurati. Le rimozioni non riducono il prezzo. La persistenza resta JSON PostgreSQL.

Il frontend PoC è il riferimento: anteprima, sezioni espandibili Impasto/Base/Formato/Ingredienti/Extra, controlli normale/extra/senza, categorie extra, allergeni, note cucina, abbinamenti, CTA fissa e feedback. Nessun nuovo wizard. La UI operativa consuma contratti pubblici senza dipendere dal repository demo.

Ownership: `packages/domain` possiede catalogo pizza e calcolo deterministico; `services/checkout-api` validazione, proiezione autorevole, persistenza e migrazione; `apps/admin` configurazione; `apps/client` UX. Non sono necessari spostamenti strutturali né nuovi workspace.

Il catalogo pizza è la fonte di impasti, basi, formati, topping, gusti e formule. Le voci commerciali generate sono proiezioni compatibili con il catalogo ordinario, non un prodotto contenitore da zero euro. Le sezioni conservano ordine e riferimenti alle voci. Le formule sono voci commerciali distinte. Il servizio rigenera la proiezione dai dati strutturati prima di salvarla: prezzi e ricette proiettati non sono una seconda fonte.

Compatibilità: nessuna riscrittura di ordini o tentativi di pagamento storici. Cataloghi senza configurazione pizza conservano il comportamento esistente. Conversione esplicita solo in bozza, con anteprima, senza deduzioni dai nomi e senza pubblicazione automatica. Dati mancanti rimangono da verificare.
