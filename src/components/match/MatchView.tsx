import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { ErrorState } from "@/components/ui/ErrorState";
import { MatchDetails, type Assets } from "@/components/profile/MatchCard";
import { MatchTimeline } from "./MatchTimeline";
import { duration, queueKey } from "@/lib/format";
import type { Dictionary } from "@/lib/i18n/dictionaries";
import { getStaticData } from "@/lib/riot/ddragon";
import { errorCode } from "@/lib/riot/errors";
import { getMatch } from "@/lib/riot/player";
import { riotIdToSlug, type Server } from "@/lib/riot/servers";
import type { MatchSummary } from "@/lib/riot/types";

export const MATCH_ID = /^[A-Z0-9]+_\d+$/i;

export async function MatchView({ server, matchId, focus, dict }: { server: Server; matchId: string; focus: string; dict: Dictionary }) {
  const data = await getStaticData();
  const assets: Assets = {
    version: data.version,
    spells: data.spells,
    runes: data.runes,
    names: Object.fromEntries(Object.values(data.champions).map((c) => [c.id, c.name])),
    byKey: Object.fromEntries(Object.entries(data.champions).map(([key, c]) => [key, c.id])),
  };

  let match: MatchSummary;
  try {
    match = await getMatch(matchId.toUpperCase(), server);
  } catch (e) {
    const code = errorCode(e);
    return <ErrorState title={code === "not_found" ? matchId : dict[`err_${code}`]} detail={code === "not_found" ? dict.match_not_found : undefined} action={dict.back_home} />;
  }

  const me = match.players.find((p) => p.puuid === focus);
  const qk = queueKey(match.queueId);
  const played = new Date(match.createdAt);

  return (
    <div className="space-y-4 pt-6">
      {me && (
        <Link href={`/summoner/${server.id}/${riotIdToSlug(me.name, me.tag)}`} className="inline-flex items-center gap-1.5 text-xs text-muted hover:text-text">
          <ArrowLeft className="h-3.5 w-3.5" />
          {dict.back_to_profile}
        </Link>
      )}

      <header className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <h1 className="font-display text-2xl font-bold">{qk ? dict[qk] : match.mode}</h1>
        <span className="tabular text-muted">{duration(match.duration)}</span>
        <span className="text-sm text-faint">{played.toLocaleString()}</span>
        <span className="rounded bg-ink px-2 py-0.5 font-display text-xs font-semibold text-gold">{server.label}</span>
      </header>

      <div className="overflow-hidden rounded-xl border border-line/70 bg-panel">
        <MatchDetails match={match} puuid={focus} server={server.id} assets={assets} />
      </div>

      <MatchTimeline matchId={match.id} players={match.players} assets={assets} focus={me?.puuid ?? ""} />
    </div>
  );
}
