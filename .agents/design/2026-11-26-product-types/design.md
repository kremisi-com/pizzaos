# Cinque tipi di prodotto

Implementare il piano approvato in chat: Pizza, Panino, Prodotto, Box, Menu. Il tipo è scelto da Aggiungi prodotto e immutabile. Categoria e nome non determinano il tipo. Nessun deploy online.

Ownership: domain possiede contratti e composizione pura; checkout-api validazione, prezzi autorevoli e scorte; admin configurazione; client personalizzazione e percorso sequenziale. Nessun collegamento runtime fra app.

Seguire il contratto in product-types/CONTRACT_DESIGN.md e i requisiti osservabili in product-types/REQUIREMENTS.md. Test indipendenti prima delle implementazioni. Conservare le modifiche preesistenti salvate nel patch baseline temporaneo; non includerle nel commit.
