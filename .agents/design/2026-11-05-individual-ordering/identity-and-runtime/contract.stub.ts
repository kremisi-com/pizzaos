import type { Pool } from "pg";
import type { FastifyRequest, FastifyInstance } from "fastify";
import type { IndividualActor } from "@pizzaos/domain";
import type { OrderingService } from "../ordering-service/contract.stub";
export interface AuthOptions { pool: Pool; secret: string; proxySecret: string; origins: string[]; googleClientId: string; googleClientSecret: string; smtpUrl: string; emailFrom: string; }
/** Proxy authority is server-controlled; session resolves only verified Auth.js identity. */
export declare function createOrderingAuth(options: AuthOptions): {
  authorizeProxy(request: FastifyRequest): boolean;
  authHandler(request: FastifyRequest): Promise<Response>;
  authenticate(request: FastifyRequest): Promise<IndividualActor | null>;
};
/** HTTP routes and injected ports are specified in ordering-service/CONTRACT_DESIGN.md. */
export declare function buildOrderingApp(options: {
  service: OrderingService;
  authenticate(request: FastifyRequest): Promise<IndividualActor | null>;
  authorizeProxy?(request: FastifyRequest): boolean;
  authHandler?(request: FastifyRequest): Promise<Response>;
  webhook?(body: Buffer, signature: string): Promise<void>;
}): FastifyInstance;
