import { describe, expect, it } from "vitest";
import {
  buildPizzaOsMailPayload,
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

    expect(readDemoRequestFormData(formData)).toEqual({
      name: "Mario Rossi",
      email: "mario@pizzeria.it",
      pizzeriaName: "Pizzeria Demo",
      city: "Roma",
    });
  });

  it("validates required PizzaOS lead fields", () => {
    expect(
      validateDemoRequestData({
        name: "",
        email: "not-an-email",
        pizzeriaName: "",
        city: "",
      }),
    ).toEqual([
      "Nome richiesto",
      "Email valida richiesta",
      "Nome pizzeria richiesto",
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
      "name=Mario+Rossi&email=mario%40pizzeria.it&pizzeriaName=Pizzeria+Demo&city=Roma",
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
      },
      { fetcher },
    );

    expect(callCount).toBe(0);
    expect(result.success).toBe(false);
    expect(result.errors).toEqual([
      "Nome richiesto",
      "Email valida richiesta",
      "Nome pizzeria richiesto",
    ]);
  });

  it("builds the exact payload expected by pizzaos-mail.php", () => {
    const payload = buildPizzaOsMailPayload({
      name: "Mario Rossi",
      email: "mario@pizzeria.it",
      pizzeriaName: "Pizzeria Demo",
      city: "",
    });

    expect([...payload.entries()]).toEqual([
      ["name", "Mario Rossi"],
      ["email", "mario@pizzeria.it"],
      ["pizzeriaName", "Pizzeria Demo"],
      ["city", ""],
    ]);
  });
});
