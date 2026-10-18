import { listEntities } from "@/lib/memory";

export const dynamic = "force-dynamic";

export async function GET() {
  return Response.json(listEntities());
}
