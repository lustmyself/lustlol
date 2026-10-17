import { errorResponse } from "@/lib/riot/errors";
import { serverForMatchId } from "@/lib/riot/servers";
import { getTimeline } from "@/lib/riot/timeline";

export async function GET(req: Request) {
  const id = new URL(req.url).searchParams.get("id")?.toUpperCase() ?? "";
  const server = serverForMatchId(id);
  if (!server) return Response.json({ error: "bad_request" }, { status: 400 });
  try {
    return Response.json(await getTimeline(id, server));
  } catch (e) {
    return errorResponse(e);
  }
}
