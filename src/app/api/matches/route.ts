import { getMatchPage } from "@/lib/riot/player";
import { errorResponse } from "@/lib/riot/errors";
import { getServer } from "@/lib/riot/servers";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const server = getServer(url.searchParams.get("server") ?? "");
  const puuid = url.searchParams.get("puuid");
  if (!server || !puuid) return Response.json({ error: "bad_request" }, { status: 400 });

  const start = Math.max(0, Number(url.searchParams.get("start")) || 0);
  const count = Math.min(20, Math.max(1, Number(url.searchParams.get("count")) || 10));
  const queue = Number(url.searchParams.get("queue")) || undefined;
  try {
    return Response.json(await getMatchPage(server.id, puuid, start, count, queue));
  } catch (e) {
    return errorResponse(e);
  }
}
