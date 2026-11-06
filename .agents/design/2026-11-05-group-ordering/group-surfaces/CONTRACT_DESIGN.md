# Port UI

Il port pubblico è `GroupOrderingApi` del task group-service e `IndividualApi` già esistente. La UI esporta `PersistentGroupScreen` da `apps/client/src/features/group-order/components/persistent-group-screen.tsx` con props `{api:GroupOrderingApi; individualApi:IndividualApi; groupId?:string; inviteToken?:string; pollMs?:number}`. I test UI iniettano port pubblici. Le route `/ordina/gruppo` e `/ordina/gruppo/[id]` montano composizione live; mai repository locale demo.

Lo stub senza corpi è `public.stub.ts` in questa cartella. Il componente Stripe e il relativo tipo sono riusati attraverso l'entry pubblico `individual-ordering/index.ts`.

Adapter pubblico app: `createGroupOrderingApi():GroupOrderingApi` in `apps/client/src/composition/api/group-ordering-api.ts`. Il protocollo segue group-service/CONTRACT_DESIGN, include cookie same-origin e no-store. Errori espongono code/message come IndividualApiError. Nessuna capability appare in props, localStorage/sessionStorage o link condiviso.

Le etichette essenziali italiane sono «Ordine di gruppo», «Crea gruppo», «Nome», «Scadenza raccolta», «Link invito», «Entra nel gruppo», «Chiudi raccolta», «Verifica totale gruppo», «Conferma ordine di gruppo», «Recupera tentativo gruppo». Comandi mutazione sono disabilitati durante richieste e raccolta chiusa per invitati. Le notifiche periodiche non sovrascrivono campi in corso; quote stale non consentono conferma.

Gli ordini gruppo sono normali IndividualOrder, con note per riga `Per <nome> · <note>` leggibili dall'admin esistente. La UI ordine individuale non necessita dati ospiti o capacità gruppo.
