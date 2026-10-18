import { remember } from "@/lib/memory";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const body = await req.json();
  if (!body?.machineId || !body?.userId || !body?.text) {
    return Response.json({ error: "machineId, userId, and text are required" }, { status: 400 });
  }
  try {
    return Response.json(await remember(body));
  } catch (err) {
    return Response.json({ error: (err as Error).message }, { status: 500 });
  }
}
