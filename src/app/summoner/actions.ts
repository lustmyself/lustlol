"use server";

import { revalidatePath } from "next/cache";
import { forgetPlayer } from "@/lib/riot/player";
import { getServer, riotIdToSlug } from "@/lib/riot/servers";

export async function refreshPlayer(server: string, name: string, tag: string, puuid: string) {
  if (!getServer(server)) return;
  forgetPlayer(server, name, tag, puuid);
  revalidatePath(`/summoner/${server}/${riotIdToSlug(name, tag)}`);
}
