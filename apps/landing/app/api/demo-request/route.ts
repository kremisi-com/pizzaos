import {
  readDemoRequestFormData,
  sendDemoRequestMail,
} from "../../../src/features/home/demo-request-mail";
import { createDemoAccess } from "../../../src/features/home/demo-handoff";

export async function POST(request: Request): Promise<Response> {
  const formData = await request.formData();
  const data = readDemoRequestFormData(formData);
  const result = await sendDemoRequestMail(data);
  const demoAccess = result.success && data.requestType !== "contact" ? createDemoAccess() : undefined;
  const status = result.success ? 200 : 400;

  return Response.json(demoAccess ? { ...result, demoAccess } : result, { status, headers: { "cache-control": "no-store" } });
}

export function GET(): Response {
  return Response.json(
    { success: false, error: "Method not allowed" },
    { status: 405 },
  );
}
