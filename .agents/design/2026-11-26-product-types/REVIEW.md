# Verifica cinque tipi di prodotto

## Approvato e implementazione

Piano e scelte approvati in chat il 26 novembre 2026. Cinque tipi vincolanti alla creazione, Panino con extra comuni senza impasti/formati, Box con gruppi creabili, Menu sequenziale a prezzo fisso con variazioni e sole rimozioni/note. Nessun deploy online incluso.

## TDD indipendente

Il test agent ha ricevuto solo REQUIREMENTS, CONTRACT_DESIGN e dichiarazioni dei contratti pubblici. Prima implementazione: 30 test falliti sugli stub `SDD: implementation pending`; successivamente 31 con consumo null fra fasi. Ulteriori red indipendenti hanno identificato l'impasto consigliato con prezzo negativo e la rimozione seguita da extra dello stesso ingrediente. Correzioni verificate con 34 test indipendenti passati.

Test API e UI sono stati eseguiti in red prima delle relative implementazioni. Il test browser indipendente usa API pubbliche per preparare ricette e catalogo, interfaccia per creare tipi, pubblicare e ordinare.

## Verifiche locali

- Dominio: 34 nuovi test indipendenti passati; suite precedente del dominio passata. Typecheck, lint e build passati.
- Architettura: confini e 4 test del verificatore passati. Contratti foglia separati dai risolutori per evitare cicli.
- Servizio: suite completa con 698 test passati e 22 saltati (database dedicati non configurati); dopo gli ultimi casi limite, 33 test HTTP mirati passati, inclusi 14 sui tipi di prodotto. Build e controlli TypeScript/lint passati.
- Admin e client: 80 file e 336 test passati nella suite completa; dopo il recupero delle fasi obsolete, tutti e 5 i test del configuratore Menu passati. Typecheck, lint e build di entrambe le app passati.
- Regressioni finali: 131 test di dominio/API/documentazione passati dopo la correzione rimozione+extra; 192 test di proxy, confini, workspace e pacchetti condivisi passati.
- Browser: due scenari passati nella verifica finale (31 secondi): classificazione strutturale Box con scelte precedenti e percorso cinque tipi/Menu. Verificati creazione e salvataggio automatico, modifica da pannello di quantità/ripetizioni Box e variazioni prezzo Menu positive/negative, pubblicazione, rimozioni/note, avanti/indietro e payload con preventivo da 1.150 centesimi. I primi tentativi hanno richiesto nuove cache Next isolate e attesa della selezione dopo idratazione; gli errori dei selettori del test sono stati corretti prima della verifica finale. Screenshot desktop e mobile ispezionati.

## Limiti

Verifiche locali con harness isolato; nessuna attestazione di deploy, provider esterni o database di produzione. Modifiche preesistenti nel checkout sono preservate e vengono escluse dal commit di questo intervento.
