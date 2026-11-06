import nodemailer from "nodemailer";
import type SMTPTransport from "nodemailer/lib/smtp-transport";
import { createConnection, type Socket } from "node:net";
import type { OperationalEmailOptions, OperationalEmailSender } from "./contract";
import { validFrom, validRecipient } from "./validation";

export function createSmtpOperationalEmailSender(options: { smtpUrl: string; from: string; localOnly?: boolean; sendTimeoutMs?: number }): OperationalEmailSender {
  let url: URL;
  try { url = new URL(options.smtpUrl); } catch { throw new Error("Configurazione email non valida: OPERATIONAL_SMTP_URL"); }
  if (!["smtp:", "smtps:"].includes(url.protocol) || (options.localOnly && !["127.0.0.1", "localhost", "[::1]"].includes(url.hostname))) throw new Error("Configurazione email non valida: OPERATIONAL_SMTP_URL");
  if (!validFrom(options.from)) throw new Error("Configurazione email non valida: OPERATIONAL_EMAIL_FROM");
  const timeout = options.sendTimeoutMs ?? 30_000;
  if (!Number.isSafeInteger(timeout) || timeout < 1 || timeout > 30_000) throw new Error("Configurazione email non valida: sendTimeoutMs");
  let auth: SMTPTransport.Options["auth"];
  try { auth = url.username ? { user: decodeURIComponent(url.username), pass: decodeURIComponent(url.password) } : undefined; }
  catch { throw new Error("Configurazione email non valida: OPERATIONAL_SMTP_URL"); }
  const active = new Set<() => void>(); let closed = false;
  return {
    async send(message) {
      if (closed || !validRecipient(message.to) || !validFrom(message.from) || (options.localOnly && !message.to.toLowerCase().endsWith(".test"))) throw new Error("Invio email non disponibile.");
      let socket: Socket | undefined; let cancelled = false; let timer: ReturnType<typeof setTimeout> | undefined;
      let rejectDeadline: (error: Error) => void = () => {};
      const cancel = () => { cancelled = true; socket?.destroy(); rejectDeadline(new Error("Invio email temporaneamente non disponibile.")); };
      const host = url.hostname.replace(/^\[|\]$/g, ""); const port = Number(url.port || (url.protocol === "smtps:" ? 465 : 587));
      const transportOptions: SMTPTransport.Options = {
        host, port, secure: url.protocol === "smtps:",
        auth,
        ignoreTLS: url.searchParams.get("ignoreTLS") === "true", requireTLS: url.searchParams.get("requireTLS") === "true",
        logger: false, debug: false, connectionTimeout: Math.min(timeout, 10_000), greetingTimeout: Math.min(timeout, 10_000), socketTimeout: timeout,
        getSocket(_configuration, callback) {
          if (cancelled) { callback(new Error("Invio email interrotto."), undefined); return; }
          // Owning the underlying socket lets an absolute deadline interrupt even a
          // peer that sends endless partial replies, through TLS upgrades as well.
          const connection = createConnection({ host, port }); socket = connection;
          const fail = (error: Error) => { connection.removeListener("connect", connected); callback(error, undefined); };
          const connected = () => { connection.removeListener("error", fail); callback(null, { connection }); };
          connection.once("error", fail); connection.once("connect", connected);
        }
      };
      const transport = nodemailer.createTransport(transportOptions);
      active.add(cancel);
      try {
        const deadline = new Promise<never>((_resolve, reject) => { rejectDeadline = reject; timer = setTimeout(cancel, timeout); });
        const result = await Promise.race([transport.sendMail({ from: message.from, to: message.to, subject: message.subject, text: message.text, messageId: message.messageId }), deadline]);
        if (!result.accepted.some((recipient: string | { address: string }) => (typeof recipient === "string" ? recipient : recipient.address).toLowerCase() === message.to.toLowerCase())) throw new Error("recipient");
      } catch { throw new Error("Invio email temporaneamente non disponibile."); }
      finally { if (timer) clearTimeout(timer); active.delete(cancel); socket?.destroy(); transport.close(); }
    },
    close() { closed = true; for (const cancel of active) cancel(); }
  };
}
export function readOperationalEmailConfiguration(env: Record<string, string | undefined>): OperationalEmailOptions {
  const mode = env.OPERATIONAL_EMAIL_MODE ?? "test";
  if (mode !== "test" && mode !== "live") throw new Error("Configurazione email non valida: OPERATIONAL_EMAIL_MODE");
  const environment = env.PIZZAOS_ENVIRONMENT ?? "production";
  if (environment !== "production" && environment !== "test") throw new Error("Configurazione email non valida: PIZZAOS_ENVIRONMENT");
  if (mode === "live" && env.PIZZAOS_ENVIRONMENT !== "production") throw new Error("Configurazione email non valida: OPERATIONAL_EMAIL_MODE");
  const testRecipients = (env.OPERATIONAL_EMAIL_TEST_RECIPIENTS ?? "").split(",").map(value => value.trim().toLowerCase()).filter(Boolean);
  if (testRecipients.some(value => !validRecipient(value) || value.includes("*"))) throw new Error("Configurazione email non valida: OPERATIONAL_EMAIL_TEST_RECIPIENTS");
  const from = env.OPERATIONAL_EMAIL_FROM || env.AUTH_EMAIL_FROM;
  if (from && !validFrom(from)) throw new Error("Configurazione email non valida: OPERATIONAL_EMAIL_FROM");
  const smtpUrl = env.OPERATIONAL_SMTP_URL || env.SMTP_URL;
  return { mode, environment, testRecipients, from, sender: smtpUrl && from ? createSmtpOperationalEmailSender({ smtpUrl, from }) : undefined };
}
