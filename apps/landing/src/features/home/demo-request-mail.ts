export interface DemoRequestData {
  readonly name: string;
  readonly email: string;
  readonly pizzeriaName: string;
  readonly city: string;
  readonly message?: string;
}

export interface DemoRequestMailResult {
  readonly success: boolean;
  readonly message?: string;
  readonly error?: string;
  readonly errors?: readonly string[];
}

interface SendDemoRequestOptions {
  readonly endpoint?: string;
  readonly fetcher?: typeof fetch;
}

interface MailEndpointResponse {
  readonly success?: unknown;
  readonly message?: unknown;
  readonly error?: unknown;
  readonly errors?: unknown;
}

const DEFAULT_MAIL_ENDPOINT = "https://api.kremisi.com/pizzaos-mail.php";
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export type DemoRequestIntent = "demo-access" | "free-trial";

const DEMO_REQUEST_MESSAGES: Record<DemoRequestIntent, string> = {
  "demo-access": "Richiesta inviata dal form di accesso demo PizzaOS.",
  "free-trial":
    'Richiesta inviata dopo il click sul pulsante "Inizia la prova gratuita".',
};

export function readDemoRequestFormData(formData: FormData): DemoRequestData {
  return {
    name: getFormValue(formData, "name"),
    email: getFormValue(formData, "email"),
    pizzeriaName: getFormValue(formData, "pizzeriaName"),
    city: getFormValue(formData, "city"),
    message: getFormValue(formData, "message"),
  };
}

export function validateDemoRequestData(
  data: DemoRequestData,
): readonly string[] {
  const errors: string[] = [];

  if (!data.name.trim()) {
    errors.push("Nome richiesto");
  }

  if (!data.email.trim() || !EMAIL_PATTERN.test(data.email)) {
    errors.push("Email valida richiesta");
  }

  if (!data.pizzeriaName.trim()) {
    errors.push("Nome pizzeria richiesto");
  }

  return errors;
}

export function buildPizzaOsMailPayload(
  data: DemoRequestData,
): URLSearchParams {
  return new URLSearchParams({
    name: data.name.trim(),
    email: data.email.trim(),
    pizzeriaName: data.pizzeriaName.trim(),
    city: data.city.trim(),
    message: resolveDemoRequestMessage(data.message),
  });
}

export function createDemoRequestMessage(intent: DemoRequestIntent): string {
  return DEMO_REQUEST_MESSAGES[intent];
}

export async function sendDemoRequestMail(
  data: DemoRequestData,
  options: SendDemoRequestOptions = {},
): Promise<DemoRequestMailResult> {
  const errors = validateDemoRequestData(data);

  if (errors.length > 0) {
    return {
      success: false,
      errors,
      error: errors[0],
    };
  }

  const endpoint =
    options.endpoint ??
    process.env["KREMISI_MAIL_ENDPOINT"] ??
    DEFAULT_MAIL_ENDPOINT;
  const fetcher = options.fetcher ?? fetch;

  try {
    const response = await fetcher(endpoint, {
      method: "POST",
      body: buildPizzaOsMailPayload(data),
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      cache: "no-store",
    });
    const result = await readMailEndpointResponse(response);

    if (!response.ok || !result.success) {
      return {
        success: false,
        error: getEndpointError(result),
        errors: getEndpointErrors(result),
      };
    }

    return {
      success: true,
      message:
        typeof result.message === "string"
          ? result.message
          : "Email sent successfully",
    };
  } catch {
    return {
      success: false,
      error: "Impossibile inviare il form. Riprova tra poco.",
    };
  }
}

function getFormValue(formData: FormData, key: string): string {
  return (formData.get(key) ?? "").toString().trim();
}

function resolveDemoRequestMessage(message: string | undefined): string {
  const trimmedMessage = message?.trim();

  return trimmedMessage && trimmedMessage.length > 0
    ? trimmedMessage
    : createDemoRequestMessage("demo-access");
}

async function readMailEndpointResponse(
  response: Response,
): Promise<MailEndpointResponse> {
  try {
    const jsonValue: unknown = await response.json();

    if (jsonValue && typeof jsonValue === "object") {
      return jsonValue as MailEndpointResponse;
    }
  } catch {
    return {};
  }

  return {};
}

function getEndpointError(result: MailEndpointResponse): string {
  if (typeof result.error === "string" && result.error.trim()) {
    return result.error;
  }

  const errors = getEndpointErrors(result);

  if (errors.length > 0) {
    return errors[0] ?? "Impossibile inviare il form.";
  }

  return "Impossibile inviare il form.";
}

function getEndpointErrors(result: MailEndpointResponse): readonly string[] {
  if (!Array.isArray(result.errors)) {
    return [];
  }

  return result.errors.filter(
    (error): error is string => typeof error === "string" && error.trim() !== "",
  );
}
