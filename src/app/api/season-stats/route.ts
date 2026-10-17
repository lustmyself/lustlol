import { errorResponse } from "@/lib/riot/errors";
import { getServer } from "@/lib/riot/servers";
import { seasonStats } from "@/lib/riot/sync";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const server = getServer(url.searchParams.get("server") ?? "");
  const puuid = url.searchParams.get("puuid");
  if (!server || !puuid) return Response.json({ error: "bad_request" }, { status: 400 });
  try {
    return Response.json(await seasonStats(server.id, puuid));
  } catch (e) {
    return errorResponse(e);
  }
}
