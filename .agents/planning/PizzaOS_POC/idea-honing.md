# Requirements Clarification

## Question 1

**Question**

Per questo POC, qual e' la priorita' di demo tra le tre superfici principali: landing page, web app cliente e web app admin?

Puoi anche rispondere con un ordine di priorita', ad esempio:

- landing > cliente > admin
- cliente > admin > landing
- tutte e tre con pari priorita'

**Answer**

Final decision: tutte e tre le superfici hanno pari priorita' nella demo.

## Question 2

**Question**

Vuoi che landing page, web app cliente e web app admin siano presentate come un unico prodotto con navigazione coerente e design system condiviso, oppure come tre esperienze distinte ma collegate?

Esempi di risposta utili:

- unico prodotto coerente
- esperienze distinte ma collegate

**Answer**

Final decision: esperienze distinte ma collegate, accessibili su domini differenti.

## Question 3

**Question**

Per la demo, vuoi un monorepo Next.js con tre applicazioni separate (`landing`, `client`, `admin`) oppure una singola app Next.js che simula tre domini tramite route separate?

Ti propongo le due opzioni per chiarezza:

- monorepo con tre app separate: piu' fedele ai domini distinti e piu' AI-friendly per feature ownership
- singola app con route separate: piu' rapida da costruire ma meno coerente con la presentazione finale

**Answer**

Final decision: monorepo con tre app separate (`landing`, `client`, `admin`) gestito con Turborepo.

## Question 4

**Question**

Per questo POC, dove vuoi spingere di piu' la qualita' percepita?

Puoi scegliere l'obiettivo prevalente:

- impatto visivo e storytelling da demo commerciale
- profondita' funzionale delle interazioni mockate
- equilibrio tra i due

**Answer**

Final decision: obiettivo prevalente sull'impatto visivo e sullo storytelling della demo commerciale.

## Question 5

**Question**

Quanto devono essere navigabili e complete le interazioni del POC?

Scegli l'opzione che piu' ti rappresenta:

- demo guidata: flussi principali molto curati, resto piu' superficiale
- demo semi-completa: la maggior parte delle schermate e' navigabile con dati mock
- demo quasi completa: quasi tutto cliccabile e coerente, anche se mockato

**Answer**

Final decision: demo quasi completa, con quasi tutto cliccabile e coerente anche se mockato.

## Question 6

**Question**

Vuoi che il POC sia brandizzato come prodotto PizzaOS gia' quasi definitivo, oppure preferisci un branding piu' neutro e facilmente sostituibile?

Opzioni tipiche:

- branding PizzaOS forte e definitivo
- branding leggero, facile da cambiare

**Answer**

Final decision: branding PizzaOS forte e gia' definito.

## Question 7

**Question**

Qual e' il target principale che vuoi far percepire nel POC?

Puoi scegliere il focus dominante:

- pizzeria singola premium
- piccola catena di pizzerie
- prodotto flessibile per entrambi, ma con demo centrata sulla catena

**Answer**

Final decision: prodotto flessibile per singola pizzeria o catena, ma demo centrata sulla singola pizzeria.

Alternative considered:

- piccola catena di pizzerie
- demo centrata sulla catena

## Question 8

**Question**

Per la web app cliente, quale contesto d'uso deve essere prioritario nella demo?

Opzioni utili:

- mobile-first, utente che ordina da smartphone
- desktop-first, esperienza da laptop/tablet
- responsive bilanciata, ma con priorita' mobile

**Answer**

Final decision: web app cliente mobile-first.

## Question 9

**Question**

Per landing page e web app admin, posso assumere priorita' desktop-first?

Se vuoi, puoi anche specificare:

- landing desktop-first, admin desktop-first
- landing responsive forte, admin desktop-first
- altra combinazione

**Answer**

Final decision: landing responsive forte, admin desktop-first.

## Question 10

**Question**

Vuoi che il POC sia ambientato su una pizzeria fittizia specifica, con catalogo, brand e contenuti narrativi coerenti, oppure preferisci contenuti piu' generici e dimostrativi?

Opzioni tipiche:

- pizzeria fittizia specifica e memorabile
- contenuti generici e neutri

**Answer**

Final decision: ambientazione su una pizzeria fittizia specifica, con contenuti coerenti.

## Question 11

**Question**

Che lingua deve usare il POC nelle interfacce e nella landing?

Opzioni comuni:

- italiano
- inglese
- interfaccia italiana con alcuni termini di prodotto in inglese

**Answer**

Final decision: italiano per interfacce e landing.

## Question 12

**Question**

Se dovessi mostrare il POC in una demo di pochi minuti, qual e' il flusso principale che deve risultare impeccabile?

Puoi rispondere in forma sintetica, ad esempio:

- utente scopre il prodotto dalla landing, ordina dal client, il ristoratore gestisce l'ordine da admin
- focus su ordering cliente end-to-end
- focus su dashboard admin e valore operativo

**Answer**

Final decision: flusso principale della demo = utente scopre il prodotto dalla landing, ordina dal client, il ristoratore gestisce l'ordine da admin.

Additional requirements:

- il flusso admin deve mostrare valore operativo aggiuntivo dopo l'ordine
- analytics e insight IA devono aggiornarsi a seguito dell'ordine, ma in modo simulato
- le app non comunicano realmente tra loro nel POC
- l'aggiornamento ordini lato admin e' simulato localmente

## Question 13

**Question**

Nel monorepo vuoi anche pacchetti condivisi tra le tre app, oltre alle app stesse?

La scelta che consiglierei per un POC AI-friendly e':

- si': package condivisi per UI, design tokens, dati mock, tipi di dominio e utility
- no': ogni app autonoma, con poca condivisione

**Answer**

Final decision: si', il monorepo deve includere package condivisi tra le app.

Preferred shared areas:

- UI condivisa
- design tokens
- dati mock
- tipi di dominio
- utility

## Question 14

**Question**

Tra tutte le funzionalita' elencate nel brief, vuoi che ciascuna abbia almeno una presenza concreta nel POC, anche solo come UI/placeholder navigabile, oppure vuoi distinguere tra funzionalita' core e funzionalita' solo teaser?

Risposte utili:

- ogni bullet deve comparire almeno in forma navigabile
- distinguiamo core vs teaser

**Answer**

Final decision: ogni bullet del brief deve comparire almeno in forma navigabile nel POC.

## Question 15

**Question**

Per rendere la demo ripetibile, vuoi che ogni app parta da uno stato iniziale curato e abbia anche un meccanismo esplicito di reset o reseed dei dati mock?

Esempi di risposta:

- si', stato iniziale guidato + reset demo
- solo stato iniziale, senza reset visibile
- no, persistenza libera in localStorage

**Answer**

Final decision: si', ogni app deve avere stato iniziale guidato e un meccanismo esplicito di reset o reseed dei dati mock.

## Question 16

**Question**

Nella landing, cosa devono fare concretamente le CTA principali della demo?

Opzioni possibili:

- aprire direttamente le altre app (`Prova subito` -> client, `Area ristoratore` o equivalente -> admin)
- aprire solo modali/form dimostrativi nella landing
- combinazione delle due

**Answer**

Final decision: combinazione delle due.

Implications noted:

- alcune CTA della landing devono aprire altre app
- altre CTA possono aprire modali o form dimostrativi nella landing

## Question 17

**Question**

Per l'approccio TDD del monorepo, vuoi che il design assuma una baseline di testing moderna per frontend, ad esempio unit/component test + end-to-end test?

Se non hai preferenze forti, la baseline sensata per questo POC sarebbe:

- Vitest
- React Testing Library
- Playwright

**Answer**

Final decision: baseline di testing del monorepo definita come:

- Vitest per unit e integration test
- React Testing Library per component test
- Playwright per end-to-end test e smoke test delle demo principali

Rationale:

- stack moderna e coerente con Next.js/Turborepo
- buona separazione tra test veloci e test end-to-end
- adatta a un piano TDD con incrementi demoabili

## Question 18

**Question**

Qual e' il criterio di successo principale del POC?

Puoi rispondere con la metrica o il risultato che conta di piu', ad esempio:

- impressionare investitori o prospect in una demo
- validare l'architettura e la struttura del monorepo
- dimostrare che il prodotto copre davvero il flusso operativo completo
- altro criterio principale

**Answer**

Final decision: il criterio di successo principale del POC e' impressionare prospect o investitori in demo.

Secondary success criterion:

- dimostrare copertura percepita del flusso operativo completo
- mostrare che il prodotto "copre tutto" anche quando alcune parti sono simulate

## Question 19

**Question**

Hai una direzione visiva precisa per il brand PizzaOS oppure vuoi che il design la definisca da zero?

Risposte utili:

- ho gia' riferimenti visivi o brand da seguire
- definiscila tu da zero
- definiscila tu, ma con un tono specifico (es. premium, tech, bold, calda, minimal)

**Answer**

Final decision: brand system unico PizzaOS con declinazioni distinte per superficie.

Selected visual direction:

- client: warm tech premium
- admin: bold operational SaaS
- landing: editorial premium food

Design constraint:

- le tre app devono sembrare parti dello stesso ecosistema, non prodotti scollegati

## Question 20

**Question**

Per rispettare il requisito "AI-friendly", quale livello di documentazione vuoi come baseline nella repository?

Le opzioni piu' sensate sono:

- README a root, per ogni app, per ogni package condiviso e per ogni feature principale
- README a root, per ogni app e per ogni package, ma non per ogni feature
- README solo a root e per le tre app

**Answer**

Final decision: README a root, per ogni app e per ogni package condiviso, ma non per ogni feature.

## Question 21

**Question**

Per il frontend del POC, preferisci un approccio con componenti prevalentemente custom sopra un design system interno, oppure vuoi basarti in modo forte su una libreria UI esistente?

Opzioni sensate:

- design system interno con componenti custom
- libreria UI come base forte, poi personalizzazione
- approccio ibrido

**Answer**

Final decision: approccio ibrido tra libreria UI esistente e design system interno/custom.

## Question 22

**Question**

Hai preferenze sullo stack di styling e componentistica del monorepo, oppure vuoi che lo definisca io nel design?

Opzioni tipiche:

- scegli tu
- Tailwind CSS + componenti headless/base
- altra preferenza esplicita

**Answer**

Final decision: stack di styling e componentistica definito nel design, con vincolo esplicito di non usare Tailwind CSS.

## Question 23

**Question**

Nel pannello admin, la gestione multi-store deve essere solo percepibile tramite UI e selettore profilo, oppure vuoi che il cambio store modifichi davvero dati mock, dashboard e ordini visibili?

Opzioni utili:

- solo percezione UI del multi-store
- cambio store realmente simulato con dataset diversi

**Answer**

Final decision: il cambio store nell'admin deve essere realmente simulato con dataset diversi.

## Question 24

**Question**

Come vuoi gestire l'accesso demo alle tre app?

Opzioni sensate:

- accesso immediato senza login, con utente gia' assunto
- schermate di login fake molto leggere, poi ingresso rapido
- landing pubblica, client senza login, admin con login fake

**Answer**

Final decision: accesso immediato senza login per tutte le app, con utente gia' assunto.

## Question 25

**Question**

Nel POC vuoi mostrare in modo esplicito anche stati di errore, empty state e casi limite nelle UI principali, oppure vuoi ottimizzare soprattutto il percorso ideale della demo?

Opzioni utili:

- privilegiamo il happy path, ma con alcuni stati edge selezionati
- mostriamo in modo esteso anche errori ed empty state
- quasi solo happy path

**Answer**

Final decision: privilegiare il happy path della demo, includendo alcuni stati edge selezionati.

## Completion

Requirements clarification marked as complete by the user on 2026-03-25.
