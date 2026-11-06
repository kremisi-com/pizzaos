import { afterEach, describe, expect, it } from 'vitest';
import { cleanupDom, domFireEvent, domScreen, domWaitFor, domWithin, renderDom } from '@pizzaos/testing';
import type { OperationalEmailApi, OperationalEmailDelivery, OperationalEmailOverview } from '@pizzaos/domain';
import { OperationalEmailPanel } from '../features/operational-emails';
afterEach(cleanupDom);
const message = (status: OperationalEmailDelivery['status'] = 'pending'): OperationalEmailDelivery => ({ id: 'email-1', orderId: 'order-1', event: 'received', recipient: 'buyer@pizzaos.test', status, attempts: status === 'retrying' ? 1 : 0, createdAt: '2026-11-05T18:00:00.000Z', updatedAt: '2026-11-05T18:00:00.000Z', sentAt: status === 'sent' ? '2026-11-05T18:00:05.000Z' : null, nextAttemptAt: status === 'retrying' ? '2026-11-05T18:00:05.000Z' : null, lastError: status === 'retrying' ? { code: 'smtp_unavailable', message: 'Invio temporaneamente non disponibile.' } : null });
const apiFor = (messages: OperationalEmailDelivery[]): OperationalEmailApi => ({ async list() { return { revision: 1, messages }; } });
describe('Email operative: pannello pubblico', () => {
  it('mostra uno stato in attesa fornito dal port pubblico', async () => {
    renderDom(<OperationalEmailPanel api={apiFor([message()])} storeId="store" pollMs={0} />);
    await domWaitFor(() => expect(domScreen.getByRole('article', { name: 'Email email-1' }).textContent).toContain('In attesa'));
    const row = domWithin(domScreen.getByRole('article', { name: 'Email email-1' }));
    expect(row.getByText('Ordine ricevuto')).toBeTruthy(); expect(row.getByText(/buyer@pizzaos[.]test/)).toBeTruthy();
    expect(domScreen.queryByRole('button', { name: /invia|simula/i })).toBeNull();
  });
  it.each([['sending', 'Invio in corso'], ['retrying', 'Nuovo tentativo'], ['blocked', 'Bloccato'], ['sent', 'Inviato']] as const)('traduce %s con %s', async (status, label) => {
    renderDom(<OperationalEmailPanel api={apiFor([message(status)])} storeId="store" pollMs={0} />); await domWaitFor(() => expect(domScreen.getByText(label)).toBeTruthy());
  });
  it('spiega il retry automatico e mantiene un solo record dopo successo tramite polling', async () => {
    let state = message('retrying'); const api: OperationalEmailApi = { async list() { return { revision: state.status === 'sent' ? 2 : 1, messages: [state] }; } };
    renderDom(<OperationalEmailPanel api={api} storeId="store" pollMs={20} />);
    await domWaitFor(() => expect(domScreen.getByText('Nuovo tentativo')).toBeTruthy()); expect(domScreen.getAllByText(/automaticamente/i).length).toBeTruthy();
    state = message('sent'); await domWaitFor(() => expect(domScreen.getByText('Inviato')).toBeTruthy()); expect(domScreen.getAllByRole('article')).toHaveLength(1);
  });
  it('errore di lettura in italiano offre riprova e nasconde errore provider raw', async () => {
    let fail = true; const api: OperationalEmailApi = { async list() { if (fail) throw new Error('smtp://secret:password@provider.invalid'); return { revision: 1, messages: [] }; } };
    renderDom(<OperationalEmailPanel api={api} storeId="store" pollMs={0} />);
    await domWaitFor(() => expect(domScreen.getByRole('alert')).toBeTruthy()); expect(domScreen.getByRole('alert').textContent).not.toMatch(/secret|password|provider.invalid/);
    fail = false; domFireEvent.click(domScreen.getByRole('button', { name: /riprova|aggiorna invii/i })); await domWaitFor(() => expect(domScreen.getByText('Nessuna email operativa')).toBeTruthy());
  });
  it('cambio sede cancella dati precedenti e ignora risposta tardiva', async () => {
    let resolveFirst!: (value: OperationalEmailOverview) => void;
    const api: OperationalEmailApi = { async list(storeId) { if (storeId === 'first') return new Promise((resolve) => { resolveFirst = resolve; }); return { revision: 1, messages: [{ ...message(), id: 'second', recipient: 'second@pizzaos.test' }] }; } };
    const view = renderDom(<OperationalEmailPanel api={api} storeId="first" pollMs={0} />);
    await domWaitFor(() => expect(resolveFirst).toBeTypeOf('function')); view.rerender(<OperationalEmailPanel api={api} storeId="second" pollMs={0} />);
    await domWaitFor(() => expect(domScreen.getByText(/second@pizzaos[.]test/)).toBeTruthy()); resolveFirst({ revision: 9, messages: [message()] });
    await domWaitFor(() => expect(domScreen.queryByText(/buyer@pizzaos[.]test/)).toBeNull());
  });
});

