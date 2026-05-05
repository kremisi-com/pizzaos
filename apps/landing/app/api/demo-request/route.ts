import {
  readDemoRequestFormData,
  sendDemoRequestMail,
} from "@/features/home/demo-request-mail";

export async function POST(request: Request): Promise<Response> {
  const formData = await request.formData();
  const result = await sendDemoRequestMail(readDemoRequestFormData(formData));
  const status = result.success ? 200 : 400;

  return Response.json(result, { status });
}

export function GET(): Response {
  return Response.json(
    { success: false, error: "Method not allowed" },
    { status: 405 },
  );
}
