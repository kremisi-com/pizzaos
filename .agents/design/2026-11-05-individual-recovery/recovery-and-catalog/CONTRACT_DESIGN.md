# Contratto pubblico

Port e tipi IndividualApi: leggere esclusivamente il contratto pubblico già completo in ../../2026-11-05-individual-ordering/ordering-surfaces/CONTRACT_DESIGN.md (o packages/domain/src/individual-ordering.ts, API pubblica). Component entry: apps/client/src/features/individual-ordering/components/individual-ordering-screen.tsx.

export declare function IndividualOrderingScreen(props: {api: IndividualApi; refreshVersion?: number; connection?: string}): React.JSX.Element;

refreshVersion incrementato dalla composizione significa che i dati remoti potrebbero essere cambiati. Componente deve aggiornare catalogo e ordini, senza cancellare draft. api.checkout di input identico con stessa idempotencyKey restituisce lo stesso ordine; una chiave con input diverso genera idempotency_conflict. api.orders restituisce solo ordini autorizzati. Errori economici definitivi invalidano il preventivo; rete incerta non prova il fallimento. Nessuna nuova route o modifica al contratto del servizio è necessaria.

UI italiana con azioni Aggiungi <prodotto>, Verifica disponibilità e totale, Telefono per l’ordine, Conferma e invia ordine, Aggiorna ordini. Può aggiungere un’azione esplicita per recuperare un tentativo incerto. Testare comportamento utente tramite port fake conforme; non vincolare test a chiavi private o struttura storage del tentativo.
