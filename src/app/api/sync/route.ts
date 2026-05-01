import { syncRoster } from "@/lib/sync/sync";

export const runtime = "nodejs";
export const maxDuration = 60;

function authorize(req: Request): Response | null {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return Response.json(
      { error: "CRON_SECRET is not set" },
      { status: 500 },
    );
  }
  const header = req.headers.get("authorization") ?? "";
  if (header !== `Bearer ${secret}`) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  return null;
}

async function handle(req: Request): Promise<Response> {
  const unauthorized = authorize(req);
  if (unauthorized) return unauthorized;
  const summary = await syncRoster();
  return Response.json(summary);
}

export async function POST(req: Request): Promise<Response> {
  return handle(req);
}

export async function GET(req: Request): Promise<Response> {
  return handle(req);
}
