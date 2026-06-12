import { describe, expect, it } from "vitest";
import {
  buildPizzaOsMailPayload,
  createDemoRequestMessage,
  readDemoRequestFormData,
  sendDemoRequestMail,
  validateDemoRequestData,
} from "../features/home/demo-request-mail";

describe("demo request mail", () => {
  it("reads PizzaOS fields from form data", () => {
    const formData = new FormData();

    formData.set("name", " Mario Rossi ");
    formData.set("email", " mario@pizzeria.it ");
    formData.set("pizzeriaName", " Pizzeria Demo ");
    formData.set("city", " Roma ");
    formData.set("message", ' Click su "Inizia la prova gratuita". ');
    formData.set("policyConsent", "accepted");

    expect(readDemoRequestFormData(formData)).toEqual({
      name: "Mario Rossi",
      email: "mario@pizzeria.it",
      pizzeriaName: "Pizzeria Demo",
      city: "Roma",
      message: 'Click su "Inizia la prova gratuita".',
      policyConsent: true,
    });
  });

  it("validates required PizzaOS lead fields", () => {
    expect(
      validateDemoRequestData({
        name: "",
        email: "not-an-email",
        pizzeriaName: "",
        city: "",
        policyConsent: false,
      }),
    ).toEqual([
      "Nome richiesto",
      "Email valida richiesta",
      "Nome pizzeria richiesto",
      "Devi accettare Privacy Policy e Cookie Policy per inviare il form",
    ]);
  });

  it("reads PizzaOS contact fields from form data", () => {
    const formData = new FormData();

    formData.set("requestType", "contact");
    formData.set("name", " Mario Rossi ");
    formData.set("emailOrPhone", " +39 333 123 4567 ");
    formData.set("message", " Vorrei maggiori informazioni. ");

    expect(readDemoRequestFormData(formData)).toEqual({
      requestType: "contact",
      name: "Mario Rossi",
      emailOrPhone: "+39 333 123 4567",
      message: "Vorrei maggiori informazioni.",
    });
  });

  it("requires only a non-empty contact string for contact messages", () => {
    expect(
      validateDemoRequestData({
        requestType: "contact",
        name: "",
        emailOrPhone: " +39 333 123 4567 ",
        message: "",
      }),
    ).toEqual([]);

    expect(
      validateDemoRequestData({
        requestType: "contact",
        name: "Mario Rossi",
        emailOrPhone: "   ",
        message: "Vorrei maggiori informazioni.",
      }),
    ).toEqual(["Inserisci email o telefono"]);
  });

  it("requires policy consent for otherwise valid leads", () => {
    expect(
      validateDemoRequestData({
        name: "Mario Rossi",
        email: "mario@pizzeria.it",
        pizzeriaName: "Pizzeria Demo",
        city: "Roma",
        policyConsent: false,
      }),
    ).toEqual([
      "Devi accettare Privacy Policy e Cookie Policy per inviare il form",
    ]);
  });

  it("sends a form-urlencoded payload to the configured Kremisi endpoint", async () => {
    const requests: Array<{
      readonly input: string | URL | Request;
      readonly init?: RequestInit;
    }> = [];
    const fetcher: typeof fetch = async (input, init) => {
      requests.push({ input, init });

      return new Response(
        JSON.stringify({ success: true, message: "Email sent successfully" }),
        { status: 200 },
      );
    };

    const result = await sendDemoRequestMail(
      {
        name: "Mario Rossi",
        email: "mario@pizzeria.it",
        pizzeriaName: "Pizzeria Demo",
        city: "Roma",
        message: createDemoRequestMessage("free-trial"),
        policyConsent: true,
      },
      {
        endpoint: "https://api.kremisi.com/pizzaos-mail.php",
        fetcher,
      },
    );

    expect(result).toEqual({
      success: true,
      message: "Email sent successfully",
    });
    expect(requests).toHaveLength(1);
    expect(requests[0]?.input).toBe(
      "https://api.kremisi.com/pizzaos-mail.php",
    );
    expect(requests[0]?.init?.method).toBe("POST");
    expect(requests[0]?.init?.headers).toEqual({
      "Content-Type": "application/x-www-form-urlencoded",
    });
    expect(requests[0]?.init?.body?.toString()).toBe(
      "name=Mario+Rossi&email=mario%40pizzeria.it&pizzeriaName=Pizzeria+Demo&city=Roma&message=Richiesta+inviata+dopo+il+click+sul+pulsante+%22Inizia+la+prova+gratuita%22.+Consenso+Privacy+Policy+e+Cookie+Policy+accettato.",
    );
  });

  it("does not call the endpoint when validation fails", async () => {
    let callCount = 0;
    const fetcher: typeof fetch = async () => {
      callCount += 1;

      return new Response(JSON.stringify({ success: true }), { status: 200 });
    };

    const result = await sendDemoRequestMail(
      {
        name: "",
        email: "bad-email",
        pizzeriaName: "",
        city: "",
        policyConsent: false,
      },
      { fetcher },
    );

    expect(callCount).toBe(0);
    expect(result.success).toBe(false);
    expect(result.errors).toEqual([
      "Nome richiesto",
      "Email valida richiesta",
      "Nome pizzeria richiesto",
      "Devi accettare Privacy Policy e Cookie Policy per inviare il form",
    ]);
  });

  it("builds the exact payload expected by pizzaos-mail.php", () => {
    const payload = buildPizzaOsMailPayload({
      name: "Mario Rossi",
      email: "mario@pizzeria.it",
      pizzeriaName: "Pizzeria Demo",
      city: "",
      message: createDemoRequestMessage("free-trial"),
      policyConsent: true,
    });

    expect([...payload.entries()]).toEqual([
      ["name", "Mario Rossi"],
      ["email", "mario@pizzeria.it"],
      ["pizzeriaName", "Pizzeria Demo"],
      ["city", ""],
      [
        "message",
        'Richiesta inviata dopo il click sul pulsante "Inizia la prova gratuita". Consenso Privacy Policy e Cookie Policy accettato.',
      ],
    ]);
  });

  it("builds the contact payload expected by pizzaos-mail.php", () => {
    const payload = buildPizzaOsMailPayload({
      requestType: "contact",
      name: "Mario Rossi",
      emailOrPhone: "+39 333 123 4567",
      message: "Vorrei maggiori informazioni.",
    });

    expect([...payload.entries()]).toEqual([
      ["requestType", "contact"],
      ["name", "Mario Rossi"],
      ["emailOrPhone", "+39 333 123 4567"],
      ["message", "Vorrei maggiori informazioni."],
    ]);
  });

  it("adds the default demo message when no source message is provided", () => {
    const payload = buildPizzaOsMailPayload({
      name: "Mario Rossi",
      email: "mario@pizzeria.it",
      pizzeriaName: "Pizzeria Demo",
      city: "",
      policyConsent: true,
    });

    expect(payload.get("message")).toBe(
      "Richiesta inviata dal form di accesso demo PizzaOS. Consenso Privacy Policy e Cookie Policy accettato.",
    );
  });
});
