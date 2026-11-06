import { describe, expect, it, vi } from 'vitest';
import { createOperationalWorkers } from '../reconciliation-worker';
describe('runner email operative separato da riconciliazione ordini', () => {
  it('start e tick ordine continuano con sender sospeso, stop drena entrambi', async () => {
    vi.useFakeTimers(); let release!: () => void; const suspended = new Promise<void>((resolve) => { release = resolve; }); let orders = 0; let emails = 0;
    const worker = createOperationalWorkers({ reconcileOrders: async () => { orders++; }, dispatchEmails: async () => { emails++; await suspended; }, intervalMs: 100 });
    try {
      let started = false; Promise.resolve(worker.start()).then(() => { started = true; }); await vi.advanceTimersByTimeAsync(0); expect(started).toBe(true);
      await vi.advanceTimersByTimeAsync(400); expect(orders).toBeGreaterThanOrEqual(4); expect(emails).toBe(1);
      let stopped = false; const stopping = worker.stop().then(() => { stopped = true; }); await vi.advanceTimersByTimeAsync(0); expect(stopped).toBe(false);
      const before = orders; await vi.advanceTimersByTimeAsync(400); expect(orders).toBe(before); release(); await stopping; expect(stopped).toBe(true);
    } finally { release(); await worker.stop(); vi.useRealTimers(); }
  });
});
