type PilotAnalyticsErrorCode = "unauthorized" | "forbidden" | "not_found" | "invalid_input";

export class PilotAnalyticsError extends Error {
  readonly statusCode: number;

  constructor(readonly code: PilotAnalyticsErrorCode, message: string) {
    super(message);
    this.name = "PilotAnalyticsError";
    this.statusCode = { unauthorized: 401, forbidden: 403, not_found: 404, invalid_input: 400 }[code];
  }
}
