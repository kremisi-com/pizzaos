# Ordine individuale persistente

Questa feature espone il modulo di configurazione persistente della sede per Magazzino, Profilo e creazione sede. Il [catalogo](../catalog/README.md) gestisce i menu di una sede esistente. La composizione fornisce i dati e salva tramite il port pubblico `IndividualApi`. Lista, dettaglio e azioni sugli ordini sono nella [feature Ordini](../orders/README.md). Gli ordini, i totali, le riserve e i pagamenti sono autorevoli nel servizio checkout.

In Profilo l'operatore cerca l'indirizzo con `StoreAddressApi`, conferma una corrispondenza e salva. Il servizio checkout cerca su Geoapify e registra le coordinate della corrispondenza. Il campo mostra i crediti Geoapify e OpenStreetMap. Le sedi precedenti possono salvare le altre impostazioni conservando le coordinate già registrate.

In Magazzino il gestore registra le scorte e dichiara, per ogni ingrediente, gli allergeni presenti e quelli che potrebbero esserlo. La spunta **Possibile extra** abilita prezzo di vendita in euro e dose per aggiunta nelle unità delle ricette. Prezzo e dose vuoti restano **Da verificare**; non sono valori zero impliciti. Le bozze Pizza custom collegate al Magazzino propongono solo ingredienti abilitati e acquisiscono questi dati al salvataggio. Il menu attivo conserva prezzi e dosi pubblicati fino alla successiva pubblicazione; le scorte correnti continuano a governare le riserve. [Pubblicazione e conflitti](../../../../../.agents/product-definition/flows/menu-ordering.md#gusti-e-formule-di-composizione).

Il Profilo mostra anche la settimana tipo, le capacità per fascia e le date protette. Il servizio genera le disponibilità del checkout nel fuso della sede. Le modifiche del calendario vengono salvate con la configurazione della sede.

La configurazione usa la versione opaca ricevuta dal servizio. La composizione conserva i campi indipendenti aggiornati altrove e invia la versione della rilettura; un conflitto successivo è rifiutato atomicamente dal servizio. La bozza resta nel form e l'errore chiede di ricaricare prima di ripetere. [Regole correnti](../../../../../.agents/product-definition/flows/store-configuration.md).

La modalità demo è separata. Specifica corrente: [configurazione sede](../../../../../.agents/product-definition/flows/store-configuration.md); gli SDD del primo incremento restano evidenze storiche. Verificare lint, typecheck, test e build dell'app, controllo architettura ed E2E individuale.

La creazione sede permette di inserire prodotti senza aggiungere personalizzazioni manuali. Per salse e aggiunte usare prodotti, categorie e abbinamenti nel Menu; le eventuali opzioni già presenti si conservano.

Il Profilo mostra il link pubblico di una sede con sottodominio. Il superadmin può assegnare una nuova etichetta a una sede al momento della creazione o al primo salvataggio dell'indirizzo pubblico. [Regole del servizio](../../../../../.agents/product-definition/flows/customer-ordering-and-payment.md#sottodomini-delle-sedi).

Il Magazzino conserva scorte null per ingredienti importati non ancora verificati. Il campo mostra Da verificare; zero rappresenta esaurimento confermato. Si può salvare una configurazione con scorte ignote se non vengono compromesse le riserve degli ordini.
