import type { FastifyInstance, FastifyRequest } from "fastify";
import type { FoodPreferences, IndividualActor, MenuDraft } from "@pizzaos/domain";
import type { OrderingService } from "./ordering-contract";
import { OrderingError } from "./ordering-service";
import { isMenuRecord } from "./menu-catalog";
import { MENU_IMAGE_BODY_LIMIT, MENU_IMAGE_TYPES, validMenuImage, type MenuImages } from "./menu-images";

export function registerMenuRoutes(app: FastifyInstance, options: {
  service: OrderingService;
  authenticate(request: FastifyRequest): Promise<IndividualActor | null>;
  menuImages?: MenuImages;
}) {
  const { service, authenticate, menuImages } = options;
  const menus = "/v1/pilot/stores/:id/menu-admin";
  const images = "/v1/pilot/stores/:id/menu-images";
  const preferences = "/v1/pilot/food-preferences";
  const invalid = (message: string) => new OrderingError("invalid_input", message);

  function menu() {
    if (!service.menu) throw new OrderingError("service_unavailable", "Gestione menu non disponibile.");
    return service.menu;
  }

  app.addContentTypeParser(MENU_IMAGE_TYPES, { parseAs: "buffer", bodyLimit: MENU_IMAGE_BODY_LIMIT }, (_request, body, done) => done(null, body));
  app.get<{ Params: { id: string } }>(menus, async (request, reply) => {
    reply.header("cache-control", "no-store");
    return menu().workspace(await authenticate(request), request.params.id);
  });
  app.put<{ Params: { id: string }; Body: { revision: number; draft: MenuDraft } }>(`${menus}/drafts`, async request => {
    const { id } = request.params;
    const input = request.body;
    const actor = await authenticate(request);
    if (!isMenuRecord(input) || Object.keys(input).some(key => key !== "revision" && key !== "draft")) throw invalid("Bozza non valida.");
    const products = Array.isArray(input.draft?.products) ? input.draft.products : [];
    const catalog = input.draft?.pizzaCatalog;
    const pizzaEntries = [...(Array.isArray(catalog?.tastes) ? catalog.tastes : []), ...(Array.isArray(catalog?.formulas) ? catalog.formulas : [])];
    const photoIds = [...new Set([...products, ...pizzaEntries].flatMap(product => typeof product?.imageId === "string" ? [product.imageId] : []))];
    if (photoIds.length) {
      await menu().imageAccess(actor, id);
      for (const imageId of photoIds) {
        const exists = menuImages?.owns ? await menuImages.owns(id, imageId) : Boolean(await menuImages?.get(id, imageId));
        if (!exists) throw invalid("La foto selezionata non appartiene a questa sede.");
      }
    }
    return menu().saveDraft(actor, id, input.revision, input.draft);
  });
  app.delete<{ Params: { id: string; draftId: string }; Body: { revision: number } }>(`${menus}/drafts/:draftId`, async request => {
    const input = request.body;
    if (!isMenuRecord(input) || Object.keys(input).some(key => key !== "revision")) throw invalid("Controlla la revisione del menu.");
    return menu().removeDraft(await authenticate(request), request.params.id, input.revision, request.params.draftId);
  });
  app.post<{ Params: { id: string }; Body: { revision: number; draftId: string } }>(`${menus}/publish`, async request => {
    const input = request.body;
    if (!isMenuRecord(input) || Object.keys(input).some(key => key !== "revision" && key !== "draftId")) throw invalid("Pubblicazione non valida.");
    return menu().publish(await authenticate(request), request.params.id, input.revision, input.draftId);
  });
  app.post<{ Params: { id: string }; Body: Buffer }>(images, { bodyLimit: MENU_IMAGE_BODY_LIMIT }, async request => {
    const { id } = request.params;
    await menu().imageAccess(await authenticate(request), id);
    if (!menuImages) throw new OrderingError("service_unavailable", "Caricamento foto non disponibile.");
    const type = request.headers["content-type"]?.split(";", 1)[0]?.trim() ?? "";
    if (!Buffer.isBuffer(request.body) || !await validMenuImage({ type, bytes: request.body })) {
      throw invalid("Scegli una foto JPEG, PNG o WebP valida, fino a 2 MB.");
    }
    return { id: await menuImages.save(id, { type, bytes: request.body }) };
  });
  app.get<{ Params: { id: string; imageId: string } }>(`${images}/:imageId`, async (request, reply) => {
    const { id, imageId } = request.params;
    const access = await menu().imageAccess(await authenticate(request), id, imageId);
    const photo = await menuImages?.get(id, imageId);
    if (!photo) throw new OrderingError("not_found", "Foto non trovata.");
    return reply.type(photo.type).header("x-content-type-options", "nosniff")
      .header("cache-control", access === "published" ? "public, max-age=300" : "no-store").send(photo.bytes);
  });
  app.get(preferences, async (request, reply) => {
    reply.header("cache-control", "no-store");
    return menu().preferences(await authenticate(request));
  });
  app.put<{ Body: FoodPreferences }>(preferences, async (request, reply) => {
    reply.header("cache-control", "no-store");
    return menu().savePreferences(await authenticate(request), request.body);
  });
}
