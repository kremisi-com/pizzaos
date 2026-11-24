# Impasti e formati collegati al Magazzino

La richiesta del 24 novembre sostituisce la configurazione di ricette per impasto/base/formato: ogni impasto sceglie una sola voce di Magazzino; ogni formato indica le unità da scalare dalla voce dell'impasto selezionato. La base diventa un normale ingrediente della pizza. Restano prezzi differenziali e standard comuni.

Ownership: domain possiede contratti e composizione deterministica; admin possiede selettore filtrabile e campi; checkout-api valida la sorgente e gestisce riserve/scarico. Il client usa la proiezione pubblicata. Nessuna modifica diretta all'ambiente online.

Gli snapshot esistenti sono una dipendenza concreta: restano leggibili per ordini e menu già pubblicati. La modifica della configurazione converte la bozza al modello `dough-format`; gli ingredienti della base standard di ogni voce diventano ingredienti inclusi. Non si indovinano associazioni o consumi ambigui. La pubblicazione richiede di completarli.

Verifica test-first indipendente sui contratti nuovi; regressioni sui contratti storici, verifiche admin/client/servizio e confini. Commit e push sulla branch corrente, escludendo modifiche preesistenti.
