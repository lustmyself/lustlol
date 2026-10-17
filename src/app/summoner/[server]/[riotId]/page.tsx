import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ProfileBody } from "@/components/profile/ProfileBody";
import { RefreshButton } from "@/components/profile/RefreshButton";
import { RememberSearch } from "@/components/profile/RememberSearch";
import { SeasonBadges } from "@/components/profile/SeasonHistory";
import { ErrorState } from "@/components/ui/ErrorState";
import { getDictionary } from "@/lib/i18n/server";
import { format, timeAgo, type Dictionary } from "@/lib/i18n/dictionaries";
import { getStaticData } from "@/lib/riot/ddragon";
import { img } from "@/lib/riot/images";
import { errorCode } from "@/lib/riot/errors";
import { currentSeason, getRankHistory } from "@/lib/riot/history";
import { pastNames, type PastName } from "@/lib/riot/names";
import { getMatchPage, getProfile } from "@/lib/riot/player";
import { getServer, slugToRiotId } from "@/lib/riot/servers";
import { TIER_COLORS, rankEmblem, rankLabel, winrateColor } from "@/lib/format";
import type { ApiErrorCode, MatchPage, Profile, RankedEntry } from "@/lib/riot/types";

type Params = Promise<{ server: string; riotId: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { server, riotId } = await params;
  const id = slugToRiotId(riotId);
  if (!id) return {};
  return {
    title: `${id.name}#${id.tag} (${server.toUpperCase()})`,
    description: `${id.name}#${id.tag} — League of Legends profile, ranked and match history.`,
  };
}

export default async function SummonerPage({ params }: { params: Params }) {
  const { server: serverId, riotId } = await params;
  const server = getServer(serverId);
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

  const [history, past] = await Promise.all([
    getRankHistory(profile.puuid),
    pastNames(profile.puuid, { name: profile.name, tag: profile.tag }),
  ]);

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
      <ProfileHeader profile={profile} past={past} serverLabel={server.label} version={staticData.version} dict={dict} />
      <ProfileBody
        puuid={profile.puuid}
        server={server.id}
        assets={{
          version: staticData.version,
          spells: staticData.spells,
          runes: staticData.runes,
          names: Object.fromEntries(Object.values(staticData.champions).map((c) => [c.id, c.name])),
          byKey: Object.fromEntries(Object.entries(staticData.champions).map(([key, c]) => [key, c.id])),
        }}
        initial={initial}
        initialError={initialError}
        sidebar={
          <>
            <RankCard big title={dict.ranked_solo} entry={profile.ranked.find((r) => r.queueType === "RANKED_SOLO_5x5")} dict={dict}>
              <SeasonBadges rows={history} current={currentSeason()} dict={dict} />
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
  serverLabel,
  version,
  dict,
}: {
  profile: Profile;
  past: PastName[];
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
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <RefreshButton server={profile.server} name={profile.name} tag={profile.tag} puuid={profile.puuid} />
          <span className="text-xs text-faint" suppressHydrationWarning>
            {format(dict.updated_ago, { t: timeAgo(dict, profile.fetchedAt) })}
          </span>
        </div>
      </div>
    </section>
  );
}

function RankCard({
  title,
  entry,
  dict,
  big = false,
  children,
}: {
  title: string;
  entry?: RankedEntry;
  dict: Dictionary;
  big?: boolean;
  /** Shown under the emblem (season badges). */
  children?: React.ReactNode;
}) {
  const games = entry ? entry.wins + entry.losses : 0;
  const wr = games ? Math.round((entry!.wins / games) * 100) : 0;
  return (
    <section className={`rounded-xl border border-line/70 bg-panel ${big ? "px-5 py-4" : "px-4 py-3"}`}>
      <h2 className={`font-display font-semibold tracking-wide text-muted ${big ? "text-base" : "text-sm"}`}>{title}</h2>
      {entry ? (
        <div className={`flex ${big ? "mt-2 items-start gap-5" : "mt-2 items-center gap-3"}`}>
          <div className="flex shrink-0 flex-col items-center gap-2">
            <Emblem tier={entry.tier} scale={big ? 1.5 : 1} />
            {children}
          </div>
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
