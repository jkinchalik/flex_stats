export const runtime = "nodejs";

export async function GET(): Promise<Response> {
  return Response.json({ ok: true, time: new Date().toISOString() });
}
