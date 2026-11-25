# PizzaOS_POC

## Source

- Acquired from direct conversation input on 2026-03-25.

## Rough Idea

# PizzaOS — Proof of Concept (Scope Ridotto)

## Obiettivo

Realizzare una demo funzionante (con dati mockati o hard-coded) che mostri il valore del prodotto senza backend complesso né integrazioni reali.

---

# Architettura POC (semplificata)

- **Frontend unico**: Next.js (React framework) (App Router)
- **Stato**: client-side (React state / Zustand)
- **Persistenza**: localStorage
- **API**: mock (JSON statici)
- **Auth**: utente già loggato (hardcoded)
- **Realtime**: simulato (timer / polling fake)

---

# 1. WebApp Cliente

## Ordinazione e menu

- Visualizzazione menu:
  - Prodotti crudi / cotti
  - Disponibilità prodotti (mock)
  - Slot orari con stato (sold-out visivo)
- Dettaglio pizza:
  - Personalizzazione completa:
    - ingredienti
    - impasto
    - varianti
- Lista allergeni per prodotto
- Abbinamenti suggeriti (es. pizza + birra)

## Carrello e ordine

- Aggiunta prodotti al carrello
- Checkout:
  - Pagamento simulato
  - Possibilità di lasciare mancia
- Stato ordine (mock):
  - In preparazione
  - In consegna
  - Consegnato

## Riordino e storico

- Archivio ordini
- Riordino rapido
- “Ordina come l’ultima volta” (auto-trigger all’apertura)

## Marketing lato cliente

- Sistema punti (mock UI)
- Premi riscattabili
- Coupon:
  - generati
  - inserimento codice sconto (BONUS)
- Abbonamento pizze:
  - UI con piano (es. 4 pizze/mese -15%)

## Feedback

- Prompt post-ordine:
  - Se feedback positivo → redirect simulato a Google

## Tracking e notifiche (simulati)

- Tracking rider (finto):
  - posizione simulata su mappa statica
- Notifiche UI:
  - ordine aggiornato
  - consegna partita

---

# 2. WebApp Admin (Ristoratore)

## Gestione ordini

- Dashboard ordini:
  - lista in tempo reale (mock)
  - stato ordine
- Smistamento automatico:
  - visualizzazione separata:
    - cucina
    - bar
- Dettaglio ordine:
  - prodotti
  - note
  - priorità (simulata)

## Menu e prodotti

- Creazione/modifica prodotti
- Creazione di più menù:
  - Menù pranzo / cena
  - Menù stagionale
  - ...
- Upload immagini prodotto
- Generazione immagini (mock AI)

## Pricing

- Pricing dinamico:
  - Flag lato admin per abilitare pricing dinamico automatico sui prodotti per ottimizzare i guadagni

## Inventario

- Visualizzazione stock ingredienti
- Evidenziazione prodotti esauriti

## Gestione multi-store

- Selettore profilo (catena)

## Marketing

- Creazione coupon:
  - valore fisso / percentuale
- Simulazione automation:
  - cliente inattivo → sconto
  - post ordine → -10%
  - compleanno → promo
- Tessera fedeltà (overview)

## Analytics (mock)

- Dashboard:
  - vendite
  - prodotti più cliccati
- Heatmap menu (fake)
- Suggerimenti AI (statici):
  - spingi margherita + birra
  - smaltisci impasto X
  - utente ricorrente → notificalo

## Delivery

- Simulazione:
  - assegnazione rider
  - tracking base
- Integrazione Deliveroo:
  - solo placeholder UI

---

# 3. Landing Page (Presentazione Prodotto)

## Obiettivo

Vendere il prodotto, non la demo.

---

## Hero

- Value proposition:
  - “Sistema completo per pizzerie: ordini, marketing e analytics in un’unica piattaforma”
- CTA:
  - Richiedi demo
  - Prova subito

---

## Sezione: Ordinazione evoluta

- Personalizzazione estrema pizza
- Riordino intelligente (“come l’ultima volta”)
- Menu dinamico e disponibilità in tempo reale
- Multi-device ordering (spiegazione):
  - Sessione condivisa tramite WebSocket
  - Stato sincronizzato tra utenti
  - Carrello collaborativo

---

## Sezione: Marketing automatico

- Automazioni:
  - cliente inattivo → sconto
  - post ordine → retention
  - compleanno → engagement
- Sistema coupon avanzato
- Tessera fedeltà
- Abbonamenti

---

## Sezione: Delivery e tracking

- Tracking rider live
- Ottimizzazione consegne
- Integrazione con piattaforme esterne

---

## Sezione: Analytics & AI

- Suggerimenti automatici:
  - aumento vendite
  - gestione inventario
- Heatmap menu
- Analisi comportamento clienti

---

## Sezione: Pannello ristoratore

- Gestione ordini in tempo reale
- Smistamento automatico cucina/bar
- Pricing dinamico
- Gestione catene

---

## Sezione: Ecosistema

*(funzionalità NON presenti nel POC ma mostrate)*

- POS integration
- Fatturazione automatica
- Network pizzerie
- Zero commissioni

---

## Sezione: Differenziazione

- No commissioni per ordine
- Controllo totale del cliente
- Automazione marketing nativa
- Data-driven decision making

---

# Note importanti (scelte consapevoli del POC)

## Cosa NON è implementato realmente

- Backend reale
- Pagamenti veri (solo simulati)
- AI reale (solo suggerimenti statici)
- Tracking GPS reale
- Automazioni reali
- Integrazioni esterne

## Cosa viene simulato

- Stato ordini
- Rider tracking
- Analytics
- Marketing automation

---

# Estensioni future (oltre POC)

- Backend event-driven
- Realtime multi-user reale
- ML per suggerimenti
- Integrazione POS e delivery
- Sistema multi-tenant completo

---

# Sintesi

Il POC dimostra:

- Esperienza utente completa
- Valore marketing
- Visione AI-driven
- Scalabilità futura

Minimizzando:

- Complessità tecnica
- Costi di sviluppo iniziali
- Dipendenze esterne

## Additional Constraints From User

- Quando farai il design, strutturare la repository in modo AI-friendly:
  - struttura ad albero divisa per features
  - file README di documentazione
- Quando farai le task, seguire approccio TDD.
- Ogni task deve includere una sezione "Demo" con funzionalità testabili manualmente.
