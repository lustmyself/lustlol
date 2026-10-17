import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { MATCH_ID, MatchView } from "@/components/match/MatchView";
import { ProfileBody } from "@/components/profile/ProfileBody";
import type { Assets } from "@/components/profile/MatchCard";
import { HeaderActions } from "@/components/profile/HeaderActions";
import { RememberSearch } from "@/components/profile/RememberSearch";
import { SeasonTable } from "@/components/profile/SeasonHistory";
import { ErrorState } from "@/components/ui/ErrorState";
import { getDictionary } from "@/lib/i18n/server";
import { format, timeAgo, type Dictionary } from "@/lib/i18n/dictionaries";
import { getStaticData } from "@/lib/riot/ddragon";
import { img } from "@/lib/riot/images";
import { errorCode } from "@/lib/riot/errors";
import { currentSeason, getRankHistory, getRankPoints, type RankPoint } from "@/lib/riot/history";
import { getLadderRank } from "@/lib/riot/leaderboard";
import { pastNames, type PastName } from "@/lib/riot/names";
import { getMatchPage, getProfile } from "@/lib/riot/player";
import { getServer, slugToRiotId } from "@/lib/riot/servers";
import { TIER_COLORS, rankEmblem, rankLabel, rankScore, winrateColor } from "@/lib/format";
import type { ApiErrorCode, MatchPage, Profile, RankedEntry } from "@/lib/riot/types";

type Params = Promise<{ server: string; riotId: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { server, riotId } = await params;
  if (MATCH_ID.test(decodeURIComponent(riotId))) return { title: decodeURIComponent(riotId).toUpperCase() };
  const id = slugToRiotId(riotId);
  if (!id) return {};
  return {
    title: `${id.name}#${id.tag} (${server.toUpperCase()})`,
    description: `${id.name}#${id.tag} — League of Legends profile, ranked and match history.`,
  };
}

export default async function SummonerPage({ params, searchParams }: { params: Params; searchParams: Promise<{ p?: string }> }) {
  const { server: serverId, riotId } = await params;
  const server = getServer(serverId);
  // /summoner/{server}/{matchId} is a match page; ?p= marks whose view it was opened from.
  if (server && MATCH_ID.test(decodeURIComponent(riotId))) {
    const [{ dict }, sp] = await Promise.all([getDictionary(), searchParams]);
    return <MatchView server={server} matchId={decodeURIComponent(riotId)} focus={sp.p ?? ""} dict={dict} />;
  }
  const id = slugToRiotId(riotId);
  if (!server || !id) notFound();

  const { dict } = await getDictionary();
  const staticData = await getStaticData();

  let profile: Profile;
  try {
    profile = await getProfile(server.id, id.name, id.tag);
  } catch (e) {
    const code = errorCode(e);
    return (
      <ErrorState
        title={code === "not_found" ? `${id.name}#${id.tag}` : dict[`err_${code}`]}
        detail={code === "not_found" ? dict.err_not_found : undefined}
        action={dict.back_home}
      />
    );
  }

  const solo = profile.ranked.find((r) => r.queueType === "RANKED_SOLO_5x5");
  const apex = solo && ["MASTER", "GRANDMASTER", "CHALLENGER"].includes(solo.tier);
  const [history, past, points, ladder] = await Promise.all([
    getRankHistory(profile.puuid),
    pastNames(profile.puuid, { name: profile.name, tag: profile.tag }),
    getRankPoints(profile.puuid, "RANKED_SOLO_5x5"),
    apex ? getLadderRank(server.id, "RANKED_SOLO_5x5", profile.puuid) : Promise.resolve(null),
  ]);

  const assets: Assets = {
    version: staticData.version,
    spells: staticData.spells,
    runes: staticData.runes,
    names: Object.fromEntries(Object.values(staticData.champions).map((c) => [c.id, c.name])),
    byKey: Object.fromEntries(Object.entries(staticData.champions).map(([key, c]) => [key, c.id])),
  };

  let initial: MatchPage | null = null;
  let initialError: ApiErrorCode | null = null;
  try {
    initial = await getMatchPage(server.id, profile.puuid, 0, 10);
  } catch (e) {
    initialError = errorCode(e);
  }

  return (
    <div className="pt-6">
      <RememberSearch name={profile.name} tag={profile.tag} server={server.id} profileIconId={profile.profileIconId} />
      <ProfileHeader
        profile={profile}
        past={past}
        points={points}
        ladder={ladder}
        serverLabel={server.label}
        version={staticData.version}
        dict={dict}
      />
      <ProfileBody
        puuid={profile.puuid}
        server={server.id}
        assets={assets}
        initial={initial}
        initialError={initialError}
        lpPoints={points}
        sidebar={
          <>
            <RankCard
              big
              title={dict.ranked_solo}
              entry={profile.ranked.find((r) => r.queueType === "RANKED_SOLO_5x5")}
              dict={dict}
              deltas={[lpDelta(points, 30), lpDelta(points, 7)]}
            >
              <SeasonTable rows={history} current={currentSeason()} dict={dict} />
            </RankCard>
            <RankCard title={dict.ranked_flex} entry={profile.ranked.find((r) => r.queueType === "RANKED_FLEX_SR")} dict={dict} />
          </>
        }
      />
    </div>
  );
}

function ProfileHeader({
  profile,
  past,
  points,
  ladder,
  serverLabel,
  version,
  dict,
}: {
  profile: Profile;
  past: PastName[];
  points: RankPoint[];
  ladder: { rank: number; of: number | null } | null;
  serverLabel: string;
  version: string;
  dict: Dictionary;
}) {
  const solo = profile.ranked.find((r) => r.queueType === "RANKED_SOLO_5x5");
  const ring = solo ? TIER_COLORS[solo.tier] : "var(--color-line)";
  return (
    <section className="mb-5 flex flex-wrap items-center gap-5 rounded-2xl border border-line/70 bg-panel/80 p-5">
      <div className="relative">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={img.profileIcon(version, profile.profileIconId)}
          alt=""
          className="h-24 w-24 rounded-2xl border-2"
          style={{ borderColor: ring }}
        />
        <span className="tabular absolute -bottom-2 left-1/2 -translate-x-1/2 rounded-full border border-line bg-ink px-2 py-0.5 text-xs text-muted">
          {profile.level}
        </span>
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-baseline gap-x-2">
          <h1 className="truncate font-display text-3xl font-bold">{profile.name}</h1>
          <span className="text-xl text-faint">#{profile.tag}</span>
          <span className="rounded bg-ink px-2 py-0.5 font-display text-xs font-semibold text-gold">{serverLabel}</span>
        </div>
        <p className="mt-1 text-sm text-muted">
          {solo ? `${rankLabel(solo.tier, solo.rank)} · ${solo.leaguePoints} LP` : dict.unranked}
          {ladder && (
            <>
              <span className="mx-2 text-line">|</span>
              {dict.ladder_rank} <span className="tabular font-semibold text-win">{ladder.rank.toLocaleString()}</span>{" "}
              {ladder.of && (
                <span className="text-faint">
                  ({format(dict.ladder_top, { p: Math.max(0.01, Math.round((ladder.rank / ladder.of) * 10000) / 100) })})
                </span>
              )}
            </>
          )}
        </p>
        {past.length > 0 && (
          <div className="mt-2 flex flex-wrap items-center gap-1.5 text-xs">
            <span className="text-faint">{dict.past_names}</span>
            {past.slice(0, 8).map((n) => (
              <span
                key={`${n.name}#${n.tag}`}
                className="rounded-md border border-line bg-ink/60 px-2 py-0.5 text-muted"
                title={format(dict.past_names_seen, { t: new Date(n.lastSeen).toLocaleDateString() })}
              >
                {n.name}
                <span className="text-faint">#{n.tag}</span>
              </span>
            ))}
          </div>
        )}
        <HeaderActions
          server={profile.server}
          name={profile.name}
          tag={profile.tag}
          puuid={profile.puuid}
          updated={format(dict.updated_ago, { t: timeAgo(dict, profile.fetchedAt) })}
          points={points}
        />
      </div>
    </section>
  );
}

function RankCard({
  title,
  entry,
  dict,
  big = false,
  deltas = [],
  children,
}: {
  title: string;
  entry?: RankedEntry;
  dict: Dictionary;
  big?: boolean;
  deltas?: (LpDelta | null)[];
  /** Shown under the rank (season peak and past seasons). */
  children?: React.ReactNode;
}) {
  const games = entry ? entry.wins + entry.losses : 0;
  const wr = games ? Math.round((entry!.wins / games) * 100) : 0;
  return (
    <section className={`rounded-xl border border-line/70 bg-panel ${big ? "px-5 py-4" : "px-4 py-3"}`}>
      <h2 className={`font-display font-semibold tracking-wide text-muted ${big ? "text-base" : "text-sm"}`}>{title}</h2>
      {entry ? (
        <div className={`flex ${big ? "mt-2 items-start gap-5" : "mt-2 items-center gap-3"}`}>
          <Emblem tier={entry.tier} scale={big ? 1.5 : 1} />
          <div className={`min-w-0 flex-1 ${big ? "pt-3" : ""}`}>
            <p className={`font-display leading-tight font-bold ${big ? "text-2xl" : "text-lg"}`} style={{ color: TIER_COLORS[entry.tier] }}>
              {rankLabel(entry.tier, entry.rank)}
            </p>
            <p className={`tabular text-muted ${big ? "text-base" : "text-sm"}`}>{entry.leaguePoints} LP</p>
            <p className={`tabular text-faint ${big ? "mt-1 text-sm" : "mt-1 text-xs"}`}>
              {format(dict.wins_losses, { w: entry.wins, l: entry.losses })}
            </p>
          </div>
          <div className={big ? "pt-2" : ""}>
            <WinRateDonut wr={wr} label={dict.winrate} scale={big ? 1.9 : 1} games={big ? format(dict.games_count, { n: games }) : undefined} />
          </div>
        </div>
      ) : (
        <p className="mt-1.5 text-sm text-faint">{dict.unranked}</p>
      )}
      {entry && deltas.some(Boolean) && (
        <div className="mt-3 flex flex-wrap gap-2">
          {deltas.map(
            (d) =>
              d && (
                <span
                  key={d.days}
                  className="inline-flex items-center gap-1.5 rounded-md bg-ink/60 px-2.5 py-1 text-xs"
                  title={d.since ? format(dict.lp_since, { t: new Date(d.since).toLocaleDateString() }) : undefined}
                >
                  <span className="text-faint">{format(dict.lp_last_days, { n: d.days })}</span>
                  <span className={`tabular font-semibold ${d.lp > 0 ? "text-buff" : d.lp < 0 ? "text-nerf" : "text-muted"}`}>
                    {d.lp > 0 ? "▲" : d.lp < 0 ? "▼" : "•"} {d.lp > 0 ? "+" : ""}
                    {d.lp} LP
                  </span>
                  {d.since && <span className="text-faint">*</span>}
                </span>
              ),
          )}
        </div>
      )}
      {children}
    </section>
  );
}

/** Riot's emblem art sits small in the middle of a wide canvas, so it is drawn oversized and clipped. */
function Emblem({ tier, scale = 1 }: { tier: string; scale?: number }) {
  return (
    <div className="relative shrink-0 overflow-hidden" style={{ width: 96 * scale, height: 80 * scale }} aria-hidden>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={rankEmblem(tier)}
        alt=""
        className="absolute top-1/2 left-1/2 h-auto max-w-none -translate-x-1/2 -translate-y-1/2"
        style={{ width: 370 * scale }}
      />
    </div>
  );
}

function WinRateDonut({ wr, label, scale = 1, games }: { wr: number; label: string; scale?: number; games?: string }) {
  const r = 26;
  const c = 2 * Math.PI * r;
  return (
    <div className="relative shrink-0" style={{ width: 64 * scale, height: 64 * scale }} role="img" aria-label={`${label} ${wr}%`}>
      <svg viewBox="0 0 64 64" className="h-full w-full -rotate-90">
        <circle cx="32" cy="32" r={r} fill="none" stroke="var(--color-loss)" strokeOpacity="0.55" strokeWidth="7" />
        <circle
          cx="32"
          cy="32"
          r={r}
          fill="none"
          stroke="var(--color-win)"
          strokeWidth="7"
          strokeDasharray={`${(wr / 100) * c} ${c}`}
        />
      </svg>
      <span className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={`tabular leading-none font-bold ${winrateColor(wr)} ${scale > 1 ? "text-2xl" : "text-sm"}`}>{wr}%</span>
        {games && <span className="tabular mt-1 text-[11px] leading-none text-muted">{games}</span>}
      </span>
    </div>
  );
}

interface LpDelta {
  days: number;
  lp: number;
  /** Set when records don't reach back the whole window: the change is since this time. */
  since: number | null;
}

/** LP won or lost over the last `days`, from lustlol's recorded points. */
function lpDelta(points: RankPoint[], days: number): LpDelta | null {
  if (points.length < 2) return null;
  const start = Date.now() - days * 24 * 60 * 60_000;
  const before = points.filter((p) => p.at <= start).at(-1);
  const base = before ?? points.find((p) => p.at > start);
  const last = points.at(-1)!;
  if (!base || base === last) return null;
  return { days, lp: rankScore(last) - rankScore(base), since: before ? null : base.at };
}
