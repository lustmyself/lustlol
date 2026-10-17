import { suggest } from "@/lib/riot/search";
import { errorResponse } from "@/lib/riot/errors";
import { DEFAULT_SERVER, getServer } from "@/lib/riot/servers";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const q = url.searchParams.get("q") ?? "";
  const server = getServer(url.searchParams.get("server") ?? "")?.id ?? DEFAULT_SERVER;
  try {
    return Response.json(await suggest(q, server));
  } catch (e) {
    return errorResponse(e);
  }
}
