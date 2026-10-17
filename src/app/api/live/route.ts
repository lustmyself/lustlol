import { errorResponse } from "@/lib/riot/errors";
import { getLiveDetails, getLiveGame } from "@/lib/riot/live";
import { getServer } from "@/lib/riot/servers";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const server = getServer(url.searchParams.get("server") ?? "");
  const puuid = url.searchParams.get("puuid");
  if (!server || !puuid) return Response.json({ error: "bad_request" }, { status: 400 });
  try {
    const game = await getLiveGame(server.id, puuid);
    if (!game || url.searchParams.get("details") !== "1") return Response.json({ game });
    const champions = url.searchParams.get("champions")?.split(",") ?? [];
    // Streamer mode hides the player, so there is nothing to look up for them.
    const details = await Promise.all(
      game.players.map((p, i) => (p.name === "?" ? null : getLiveDetails(server.id, p.puuid, p.championId, champions[i] ?? "").catch(() => null))),
    );
    return Response.json({ game, details });
  } catch (e) {
    return errorResponse(e);
  }
}
