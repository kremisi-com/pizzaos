# Disegno interno

Catalogo normalizzato nello snapshot JSON; compilazione pura in proiezioni `IndividualProduct` con gruppi e identificatori stabili. Il servizio verifica il catalogo prima della compilazione e rigenera le proiezioni al confine amministrativo. Il calcolo composizione già condiviso resta il punto unico per quote, ricette e sconti.

La migrazione conserva i dati originali, produce solo una bozza e riusa le identità dichiarate esplicitamente. Nessuna inferenza per nome.

Checklist: entità distinte; formule senza gusto; differenziali standard; ricette sostitutive; rimozioni; sconti; autorizzazioni/revisioni; stock/allergeni; input non fidato; storico; migrazione idempotente.
