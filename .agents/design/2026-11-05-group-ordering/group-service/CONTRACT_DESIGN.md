# Contratti pubblici

Stub di firme senza corpi: `public.stub.ts` in questa cartella. Contratto runtime pubblico: `packages/domain/src/group-ordering.ts`, esportato da `@pizzaos/domain` (contenuto firme sotto). Factory server pubblica del modulo: `services/checkout-api/src/group/group-service.ts`; registrazione HTTP: `services/checkout-api/src/group/group-http.ts`. I test possono usare factory pubbliche esistenti `createOrderingService`, `buildOrderingApp` e i port `OrderingRepository`, `OrderingPayments`, senza consultare la loro implementazione.

Limiti input: nome 1-120 caratteri non vuoti, note personali fino a 800 caratteri (anche multilinea), 100 righe complessive, 1-100 unità per riga e fino a 50 opzioni uniche. L'attribuzione non tronca nome o note e rimane entro il limite canonico di 1000 caratteri per riga. L'organizzatore può solo rimuovere righe o ridurre quantità nei contributi altrui; può sostituire completamente le proprie scelte prima dell'invio. La rimozione del partecipante host è sempre vietata.

```ts
import type { IndividualActor, IndividualLine, IndividualCart, IndividualQuote, IndividualCheckoutResult } from '@pizzaos/domain';
export interface GroupParticipant { id: string; name: string; host: boolean; lines: IndividualLine[]; }
export interface GroupSnapshot {
  id: string; storeId: string; deadline: string; status: 'open'|'closed'|'submitted'; revision: number;
  participants: GroupParticipant[]; role: 'host'|'participant'|'visitor'; participantId: string|null;
  /** Present only for host, allows recovering the invitation and uncertain checkout. */
  inviteToken?: string; orderId?: string; checkoutPending?: boolean;
}
export type GroupFulfillment = Pick<IndividualCart,'mode'|'slotId'|'notes'|'address'>;
export interface GroupQuote { revision: number; quote: IndividualQuote; }
export interface GroupCheckout {
  revision: number; fingerprint: string; fulfillment: GroupFulfillment;
  phone: string; method: 'card'|'cash'; idempotencyKey: string;
}
export interface GroupOrderingApi {
  /** Host-only create; no reservation. */
  create(input: {storeId:string; name:string; deadline:string}): Promise<GroupSnapshot>;
  read(id:string, inviteToken?:string): Promise<GroupSnapshot>;
  /** Sets personal HttpOnly capability; repeated valid capability preserves participant. */
  join(id:string, input:{inviteToken:string; name:string}): Promise<GroupSnapshot>;
  replaceLines(id:string, input:{participantId:string; revision:number; lines:IndividualLine[]}):Promise<GroupSnapshot>;
  removeParticipant(id:string,input:{participantId:string; revision:number}):Promise<GroupSnapshot>;
  close(id:string,input:{revision:number}):Promise<GroupSnapshot>;
  quote(id:string,input:{revision:number; fulfillment:GroupFulfillment}):Promise<GroupQuote>;
  checkout(id:string,input:GroupCheckout):Promise<IndividualCheckoutResult>;
  /** Host-only recovery of the frozen original request after lost response/reload. */
  recover(id:string):Promise<IndividualCheckoutResult>;
}
```

Server `GroupAccess = { actor: IndividualActor|null; capability?: string }`. `createGroupOrderingService({repository,ordering,now?,id?,token?})` returns `GroupOrderingService`. It has the same browser methods with first argument `access`, except `create(actor,input)`, `join(access,id,input):Promise<{group:GroupSnapshot;capability:string}>`, and `tick():Promise<void>`. `repository` implements existing `OrderingRepository`; `ordering` existing `OrderingService`. `now` returns Date; `id`/`token` return strings; defaults must be cryptographically secure. Direct service errors carry `code` and `statusCode` (401 unauthorized,403 forbidden,404 not_found,400 invalid_input,409 conflicts). Additional group errors: `revision_conflict`, `group_closed`, `checkout_pending`; canonical errors remain unchanged.

`registerGroupOrderingRoutes(app,{groups,authenticate})` attaches routes before `app.ready()`, inheriting `buildOrderingApp` protections. Base `/v1/pilot/groups`: `POST /` create; `GET /:id?inviteToken=` read; `POST /:id/join`; `PUT /:id/lines` replaceLines; `POST /:id/remove-participant`; `POST /:id/close`; `POST /:id/quote`; `POST /:id/checkout`; `POST /:id/recover` with empty object body. Bodies exactly match browser inputs and reject extra fields before coercion. Join JSON is only GroupSnapshot; capability is cookie `pizzaos-group-<id>`, HttpOnly, Path=/, SameSite=Lax, Secure for canonical HTTPS origin, Max-Age=604800. Cookie access also allows private read without invite token. Browser API always credentials same-origin/no-store. Read with invite token alone returns visitor; host cookie/account gives host. Missing access is forbidden and invalid group/token is not_found or forbidden. Removal of a participant invalidates that capability; access through a valid invitation may still produce visitor but never participant.

Quote preconditions: correct host, closed, expected revision, nonempty lines. Checkout additionally requires confirmed quote fingerprint and original exact retry input. All group mutations are revisioned; server closure increments revision once. Deadline acts at >= deadline, independent of timers. Submitted read exposes only minimised group data to guests. Canonical order lifecycle remains through IndividualApi (only host customer and authorized operators).
