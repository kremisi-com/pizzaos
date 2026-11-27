import { orderingSubdomainForHost } from "@pizzaos/domain";
import type { FastifyRequest } from "fastify";
import { groupStoreId } from "./group/group-service";
import type { OrderingRepository } from "./ordering-contract";
import { OrderingError } from "./ordering-service";

export interface OrderingSites {
  domain: string;
  origins: string[];
  repository: OrderingRepository;
}

export interface OrderingSite {
  storeId: string;
  name: string;
}

export function orderingSubdomainForOrigin(origin: string, domain: string | undefined): string | undefined {
  if (!domain) return undefined;
  try {
    const url = new URL(origin);
    if (url.origin !== origin || url.protocol !== "https:" || url.port) return undefined;
    return orderingSubdomainForHost(url.hostname, domain);
  } catch {
    return undefined;
  }
}

export function findOrderingSite(sites: OrderingSites, subdomain: string): Promise<OrderingSite | null> {
  return sites.repository.transact(state => {
    const store = Object.values(state.stores).find(candidate => candidate.orderingSubdomain === subdomain);
    return store ? { storeId: store.id, name: store.name } : null;
  });
}

const pilot = "/v1/pilot";
const customerRoutes = new Set([
  `GET ${pilot}/ordering-site`, `GET ${pilot}/session`, `GET ${pilot}/stores`,
  `GET ${pilot}/orders`, `GET ${pilot}/events`, `GET ${pilot}/stream`,
  `GET ${pilot}/food-preferences`, `PUT ${pilot}/food-preferences`
]);
const orderRoutes = new Set([
  `POST ${pilot}/orders/:id/reconcile`, `POST ${pilot}/orders/:id/actions`,
  `PATCH ${pilot}/orders/:id/notes`, `POST ${pilot}/orders/:id/additions/quote`, `POST ${pilot}/orders/:id/additions`
]);
const groupRoutes = new Set([
  `POST ${pilot}/groups/:id/name`, `POST ${pilot}/groups/:id/pay-share`, `POST ${pilot}/groups/:id/payments/:paymentId/reconcile`, `POST ${pilot}/groups/:id/refund-share`,
  `GET ${pilot}/groups/:id`, `POST ${pilot}/groups/:id/join`, `PUT ${pilot}/groups/:id/lines`,
  `POST ${pilot}/groups/:id/remove-participant`, `POST ${pilot}/groups/:id/close`,
  `POST ${pilot}/groups/:id/quote`, `POST ${pilot}/groups/:id/checkout`, `POST ${pilot}/groups/:id/recover`
]);

export async function authorizeOrderingSiteRoute(
  request: FastifyRequest, site: OrderingSite, sites: OrderingSites, customerId: () => Promise<string | undefined>
): Promise<void> {
  const route = `${request.method} ${request.routeOptions.url}`;
  const unavailable = () => new OrderingError("not_found", "Percorso non disponibile per questa sede.");
  if (request.routeOptions.url === "/api/pilot/auth/*") return;
  if (customerRoutes.has(route)) {
    const query = request.query as { storeId?: unknown };
    if (query.storeId !== undefined) throw unavailable();
    return;
  }
  if (route === `GET ${pilot}/groups/context` || route === `POST ${pilot}/groups/context`) {
    const value = (request.method === "GET" ? request.query : request.body) as { storeId?: unknown };
    if (value.storeId !== site.storeId) throw unavailable();
    return;
  }
  const { id } = (request.params ?? {}) as { id?: string };
  if (route === `GET ${pilot}/stores/:id` || route === `GET ${pilot}/stores/:id/loyalty`
    || route === `POST ${pilot}/stores/:id/delivery-address-search` || route === `GET ${pilot}/stores/:id/menu-images/:imageId`) {
    if (id !== site.storeId) throw unavailable();
    return;
  }
  if (route === `POST ${pilot}/quote` || route === `POST ${pilot}/checkouts` || route === `POST ${pilot}/groups`) {
    const input = request.body as { cart?: { storeId?: unknown }; storeId?: unknown };
    if ((route === `POST ${pilot}/groups` ? input.storeId : input.cart?.storeId) !== site.storeId) throw unavailable();
    return;
  }
  if (id && groupRoutes.has(route)) {
    if (!await sites.repository.transact(state => groupStoreId(state, id) === site.storeId)) throw unavailable();
    return;
  }
  if (id && orderRoutes.has(route)) {
    if (route.endsWith("/actions") && (request.body as { action: string }).action !== "cancel") throw unavailable();
    const order = await sites.repository.transact(state => Object.hasOwn(state.orders, id)
      ? { storeId: state.orders[id].storeId, customerId: state.orders[id].customerId } : null);
    if (order?.storeId !== site.storeId) throw unavailable();
    const actor = await customerId();
    if (!actor) throw new OrderingError("unauthorized", "Accedi per continuare.");
    if (order.customerId !== actor) throw unavailable();
    return;
  }
  throw unavailable();
}
