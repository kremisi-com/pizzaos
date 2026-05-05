# Piano Interventi Admin POC (Allineamento a Client)
## Obiettivo
Risolvere tutte le issue del pannello Admin mantenendo una regola chiave:
- allineare sempre **Admin -> Client**
- modifiche al Client: **minime**, idealmente **zero**
## Vincoli Non Negoziabili
- Frontend-only POC
- Nessuna integrazione reale backend/AI/GPS/pagamenti
- Nessuna comunicazione runtime tra app
- Persistenza locale via `localStorage`
- Copy prodotto in italiano
- Coerenza narrativa client->admin nel demo
## Issue da Risolvere
- Ordini: manca "In consegna" nel riepilogo alto
- Menù: non si possono modificare prezzo e ingredienti
- Magazzino: deve mostrare ingredienti singoli, non pizze
- Dynamic Pricing: da spostare in Marketing
- Analytics: rinominare in "Analytics and AI", aggiungere insight/grafici animati/AI live typing simulato
- Integrazioni: rimuovere elementi non davvero supportati
- Equilibrare i due POC: flussi e concetti oggi scollegati
- Profilo ristoratore: abbonamento attivo e cambio piano
## Strategia di Allineamento (Scelta B)
Pseudo-correlazione forte tra Client e Admin, senza sync runtime:
- stessi riferimenti ordine demo (`demoOrderRef`) visibili in entrambe le app
- stessa sequenza narrativa stati ordine
- naming coerente su prodotti/prezzi/coupon/loyalty
- seed e simulazioni deterministiche parallele (locali, indipendenti)
## Piano Esecutivo per Fasi
### Fase 1 — Correlation Contract (Shared-only, client-safe)
- Stato: ✅ completata (contract shared introdotto e seed admin allineati senza impatti UX client)
- Definire contratto shared per:
    - `demoOrderRef`
    - mapping stati ordine canonico
    - coerenza naming commerciale
- Applicare il contratto ai seed admin (senza alterare UX client)
  **Done quando:** l’admin mostra riferimenti/stati coerenti col client senza cambi client.
---
### Fase 2 — Quick Fix immediati (Admin-only)
- Ordini: aggiungere KPI “In consegna” nel riepilogo top
- Integrazioni: rimuovere opzioni non supportate e stati fuorvianti
  **Done quando:** issue Ordini + Integrazioni chiuse e test aggiornati.
---
### Fase 3 — Menù completo (Admin + Shared)
- Abilitare modifica `basePrice` nel form prodotto
- Abilitare modifica ingredienti (lista add/remove/edit)
- Estendere modello shared se manca il campo ingredienti
- Aggiornare seed coerenti
  **Done quando:** prodotto salvabile con nome/descrizione/prezzo/ingredienti.
---
### Fase 4 — Magazzino ingredienti + move Dynamic Pricing (Admin + Shared)
- Migrare Magazzino da stock pizze/prodotti a stock ingredienti
- Aggiornare tabella, alert, soglie, azioni operative
- Spostare Dynamic Pricing da Magazzino a Marketing
  **Done quando:** Magazzino è ingredient-first, Dynamic Pricing solo in Marketing.
---
### Fase 5 — Analytics and AI upgrade (Admin-only)
- Rinominare sezione in “Analytics and AI”
- Aggiungere:
    - trend charts animati
    - insight cards arricchite
    - simulazione AI “scrittura in tempo reale”
- Collegare update a eventi ordine simulati locali admin
  **Done quando:** esperienza analytics/AI più viva e coerente col racconto demo.
---
### Fase 6 — Profilo Ristoratore (Admin-only)
- Nuova area profilo con:
    - piano attivo
    - upgrade/downgrade simulato
    - stato rinnovo/fatturazione mock
- Inserimento in navigazione admin
  **Done quando:** pagina profilo navigabile e demoabile.
---
### Fase 7 — Equilibrio cross-POC (Admin-first focus)
- Allineare lessico e milestones admin ai concetti client
- Uniformare ID demo, tempi percepiti, narrativa ordine
- Nessun coupling runtime tra app
  **Done quando:** demo client->admin risulta seamless pur restando simulata localmente.
---
### Fase 8 — QA, Test, Documentazione
- Aggiornare test unit/component interessati
- Aggiornare `apps/admin/README.md`
- Aggiornare planning docs admin (requirements/design/implementation plan)
- Verifica finale checklist issue
  **Done quando:** tutte le issue sono risolte, test verdi, demo coerente.
## Priorità di Implementazione
1. Correlation contract shared
2. Quick fixes (Ordini + Integrazioni)
3. Menù (prezzo + ingredienti)
4. Magazzino ingredienti + Dynamic Pricing in Marketing
5. Analytics and AI upgrade
6. Profilo ristoratore
7. Bilanciamento narrativo finale
8. QA + docs
## Regola Operativa Durante Implementazione
Per ogni cambiamento:
1. provare soluzione **Admin-only**
2. se non basta, usare **Shared-only**
3. toccare Client **solo se bloccante reale**
4. documentare ogni eventuale eccezione client
## Criteri Finali di Accettazione
- Tutti i punti issue chiusi
- Admin riallineato al client senza refactor client non necessari
- Flussi e concetti coerenti tra i due POC
- Nessuna violazione dei vincoli POC
- Incrementi demoabili e testabili
