import { ask } from "@/lib/memory";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const body = await req.json();
  if (!body?.machineId || !body?.userId || !body?.question) {
    return Response.json({ error: "machineId, userId, and question are required" }, { status: 400 });
  }
  try {
    return Response.json(await ask(body));
  } catch (err) {
    return Response.json({ error: (err as Error).message }, { status: 500 });
  }
}
