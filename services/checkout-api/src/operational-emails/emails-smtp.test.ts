import { createServer, type Socket } from 'node:net';
import { describe, expect, it } from 'vitest';
import { createSmtpOperationalEmailSender } from './index';

async function localSink(rejectRecipient = false, dropAck = false) {
  const sockets = new Set<Socket>(); const envelopes: string[] = []; const documents: string[] = [];
  const server = createServer((socket) => {
    sockets.add(socket); socket.on('close', () => sockets.delete(socket)); socket.write('220 localhost ESMTP test\r\n');
    let buffer = ''; let data = false; let document = '';
    socket.on('data', (chunk) => {
      buffer += chunk.toString();
      for (;;) {
        const index = buffer.indexOf('\r\n'); if (index < 0) break;
        const line = buffer.slice(0, index); buffer = buffer.slice(index + 2);
        if (data) { if (line === '.') { documents.push(document); data = false; document = ''; if (dropAck) socket.end(); else socket.write('250 2.0.0 Message accepted\r\n'); } else document += line + '\r\n'; continue; }
        if (/^EHLO|^HELO/i.test(line)) socket.write('250-localhost\r\n250 8BITMIME\r\n');
        else if (/^MAIL FROM:/i.test(line)) { envelopes.push(line); socket.write('250 2.1.0 OK\r\n'); }
        else if (/^RCPT TO:/i.test(line)) { envelopes.push(line); socket.write(rejectRecipient ? '550 5.1.1 Rejected\r\n' : '250 2.1.5 OK\r\n'); }
        else if (/^DATA/i.test(line)) { data = true; socket.write('354 End data with <CR><LF>.<CR><LF>\r\n'); }
        else if (/^QUIT/i.test(line)) { socket.end('221 Bye\r\n'); }
        else socket.write('250 OK\r\n');
      }
    });
  });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve)); const address = server.address(); if (!address || typeof address === 'string') throw new Error('SMTP sink non disponibile');
  const smtpUrl = `smtp://127.0.0.1:${address.port}?ignoreTLS=true`;
  const url = new URL(smtpUrl); if (url.hostname !== '127.0.0.1') throw new Error('SMTP sink deve essere loopback');
  return { smtpUrl, envelopes, documents, async close() { for (const socket of sockets) socket.destroy(); await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve())); } };
}
const message = { to: 'buyer@pizzaos.test', from: 'PizzaOS <orders@pizzaos.test>', messageId: '<operational-email-test@pizzaos.test>', subject: 'Ordine ricevuto', text: 'Ordine test ricevuto. Pizza Test, quantità 1. Totale 10,00 EUR.' };
describe('adapter SMTP email operative con sink reale solo locale', () => {
  it('deadline totale chiude anche il socket di un sink muto', async () => {
    const sockets = new Set<Socket>(); let closed = false;
    const server = createServer((socket) => { sockets.add(socket); socket.resume(); socket.on('close', () => { closed = true; sockets.delete(socket); }); });
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve)); const address = server.address(); if (!address || typeof address === 'string') throw new Error('Sink SMTP non disponibile');
    const sender = createSmtpOperationalEmailSender({ smtpUrl: `smtp://127.0.0.1:${address.port}`, from: message.from, localOnly: true, sendTimeoutMs: 100 });
    try { await expect(sender.send(message)).rejects.toBeTruthy(); await expect.poll(() => closed, { timeout: 1000 }).toBe(true); expect(sockets.size).toBe(0); }
    finally { await sender.close?.(); for (const socket of sockets) socket.destroy(); await new Promise<void>((resolve) => server.close(() => resolve())); }
  });
  it('consegna destinatario, testo italiano e Message-ID stabile', async () => {
    const sink = await localSink(); const sender = createSmtpOperationalEmailSender({ smtpUrl: sink.smtpUrl, from: message.from, localOnly: true });
    try { await sender.send(message); await sender.send(message); expect(sink.documents).toHaveLength(2); expect(sink.envelopes.filter((line) => line.startsWith('RCPT TO:'))).toEqual(['RCPT TO:<buyer@pizzaos.test>', 'RCPT TO:<buyer@pizzaos.test>']); for (const document of sink.documents) { expect(document).toContain('Ordine ricevuto'); expect(document).toContain(message.messageId); expect(document).toMatch(/Pizza Test/); expect(document).not.toMatch(/^Cc:|^Bcc:/im); } } finally { await sender.close?.(); await sink.close(); }
  });
  it('rifiuto SMTP non viene trattato come successo', async () => {
    const sink = await localSink(true); const sender = createSmtpOperationalEmailSender({ smtpUrl: sink.smtpUrl, from: message.from, localOnly: true });
    try { await expect(sender.send(message)).rejects.toBeTruthy(); expect(sink.documents).toHaveLength(0); } finally { await sender.close?.(); await sink.close(); }
  });
  it('ACK incerto dopo DATA non finge successo', async () => {
    const sink = await localSink(false, true); const sender = createSmtpOperationalEmailSender({ smtpUrl: sink.smtpUrl, from: message.from, localOnly: true });
    try { await expect(sender.send(message)).rejects.toBeTruthy(); expect(sink.documents).toHaveLength(1); } finally { await sender.close?.(); await sink.close(); }
  });
  it.each(['smtp://provider.invalid:25', 'smtp://127.0.0.1.provider.invalid:25', 'smtp://192.0.2.1:25'])('guardia localOnly rifiuta %s prima di aprire socket', (smtpUrl) => {
    expect(() => createSmtpOperationalEmailSender({ smtpUrl, from: message.from, localOnly: true })).toThrow();
  });
});

