import type { Logger } from "pino";
export type FailureCategory = "expected" | "dependency" | "unexpected" | "operational";
export interface DiagnosticContext {
  operation: string; code?: string; category?: FailureCategory;
  requestId?: string; route?: string; method?: string; statusCode?: number; durationMs?: number;
  orderId?: string; storeId?: string; additionId?: string; jobId?: string; emailId?: string;
  provider?: string; attempts?: number;
}
export interface DiagnosticEvent extends DiagnosticContext {
  code: string; category: FailureCategory; environment: string; release: string;
  error?: { type: string; code?: string; frames: { file: string; line: number; column: number }[]; cause?: DiagnosticEvent["error"] };
  suppressed?: number;
}
export interface DiagnosticReporter { capture(event: DiagnosticEvent): void; flush(): Promise<void>; }
export interface Diagnostics {
  logger: Logger;
  run<T>(context: DiagnosticContext, work: () => T): T;
  report(error: unknown, context: DiagnosticContext): void;
  record(code: string, context: DiagnosticContext): void;
  flush(): Promise<void>;
}
/** Classified HTTP response without arbitrary exception details. */
export declare function classifyFailure(error: unknown): { statusCode: number; code: string; message: string; category: FailureCategory };
/** Sanitized JSON logging, context propagation and bounded repeat suppression. */
export declare function createDiagnostics(options?: {
  environment?: string; release?: string; level?: string;
  stream?: { write(line: string): unknown }; reporter?: DiagnosticReporter;
  now?: () => number; repetitionWindowMs?: number; maxKeys?: number;
}): Diagnostics;
