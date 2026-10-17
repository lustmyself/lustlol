"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { useI18n } from "../i18n";
import { FilterBar, type Filters } from "./FilterBar";
import { MatchCard, type Assets } from "./MatchCard";
import { SeasonChampions, useSeasonStats } from "./SeasonChampions";
import { QUEUE_IDS } from "@/lib/riot/servers";
import { rankScore } from "@/lib/format";
import type { DictKey } from "@/lib/i18n/dictionaries";
import type { RankPoint } from "@/lib/riot/history";
import type { ApiErrorCode, MatchPage, MatchSummary } from "@/lib/riot/types";

const PAGE = 10;
const QUEUES = [420, 440, 400, 490, 450, 1750];
const NO_FILTER: Filters = { champion: "", queue: "", with: "" };

export function ProfileBody({
  puuid,
  server,
  assets,
  initial,
  initialError,
  lpPoints,
  sidebar,
}: {
  puuid: string;
  server: string;
  assets: Assets;
  initial: MatchPage | null;
  initialError: ApiErrorCode | null;
  lpPoints: RankPoint[];
  sidebar: React.ReactNode;
}) {
  const { t } = useI18n();
  const season = useSeasonStats(server, puuid);
  const [filters, setFilters] = useState<Filters>(NO_FILTER);
  const [matches, setMatches] = useState<MatchSummary[]>(initial?.matches ?? []);
  const [next, setNext] = useState<number | null>(initial?.next ?? null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<ApiErrorCode | null>(initialError);

  async function load(f: Filters, start: number) {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ server, puuid, start: String(start), count: String(PAGE) });
      if (f.queue) params.set("queue", f.queue);
      if (f.champion) params.set("champion", f.champion);
      if (f.with) params.set("with", f.with);
      const res = await fetch(`/api/matches?${params}`);
      const body = await res.json();
      if (!res.ok) throw body.error ?? "unavailable";
      const page = body as MatchPage;
      setMatches((prev) => {
        const base = start === 0 ? [] : prev;
        const seen = new Set(base.map((m) => m.id));
        return [...base, ...page.matches.filter((m) => !seen.has(m.id))];
      });
      setNext(page.next);
    } catch (e) {
      setError(typeof e === "string" ? (e as ApiErrorCode) : "unavailable");
    } finally {
      setLoading(false);
    }
  }

  const stored = Boolean(filters.champion || filters.with);

  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,520px)]">
      <aside className="space-y-4 xl:col-start-2 xl:row-start-1">
        {sidebar}
        <SeasonChampions data={season} server={server} version={assets.version} names={assets.names} />
      </aside>

      <section className="min-w-0 space-y-3 xl:col-start-1 xl:row-start-1">
        <h2 className="font-display text-lg font-semibold">{t("matches")}</h2>

        <FilterBar
          value={filters}
          onChange={(f) => {
            setFilters(f);
            setMatches([]);
            void load(f, 0);
          }}
          version={assets.version}
          names={assets.names}
          queues={QUEUES.map((id) => ({ id, label: t(QUEUE_IDS[id] as DictKey) }))}
          partners={season?.duos ?? []}
          disabled={loading}
        />
        {stored && <p className="text-[11px] text-faint">{t("filter_stored_note")}</p>}

        {error && (
          <div className="rounded-xl border border-loss/40 bg-loss-bg/60 p-4 text-sm text-loss">
            {t(`err_${error}` as DictKey)}{" "}
            <button type="button" className="underline" onClick={() => load(filters, matches.length && next ? next : 0)}>
              {t("try_again")}
            </button>
          </div>
        )}

        {!loading && !error && matches.length === 0 && (
          <p className="rounded-xl border border-line/70 bg-panel p-6 text-center text-sm text-muted">{t("no_matches")}</p>
        )}

        <div className="space-y-2">
          {matches.map((m) => (
            <MatchCard
              key={m.id}
              match={m}
              puuid={puuid}
              server={server}
              assets={assets}
              // A filtered list hides games in between, so LP can't be attributed then.
              lp={stored || filters.queue ? undefined : matchLp(m, matches, lpPoints)}
            />
          ))}
        </div>

        {loading && (
          <div className="flex justify-center py-4 text-muted">
            <Loader2 className="h-5 w-5 animate-spin" />
          </div>
        )}

        {!loading && next !== null && matches.length > 0 && (
          <button
            type="button"
            onClick={() => load(filters, next)}
            className="w-full rounded-xl border border-line bg-panel py-3 text-sm text-muted transition hover:border-gold/50 hover:text-gold"
          >
            {t("load_more")}
          </button>
        )}
      </section>
    </div>
  );
}

/**
 * LP from one Solo/Duo game, read from the points lustlol recorded before and
 * after it. Returns null (shown as "? LP") unless exactly this game falls
 * between two points; undefined for other queues.
 */
function matchLp(m: MatchSummary, list: MatchSummary[], points: RankPoint[]): number | null | undefined {
  if (m.queueId !== 420 || m.remake) return undefined;
  const before = points.filter((p) => p.at <= m.createdAt).at(-1);
  const after = points.find((p) => p.at >= m.endedAt);
  if (!before || !after) return null;
  const oldest = Math.min(...list.map((x) => x.createdAt));
  if (before.at < oldest && m.createdAt !== oldest) return null;
  const between = list.filter((x) => x.queueId === 420 && !x.remake && x.id !== m.id && x.createdAt > before.at && x.createdAt < after.at);
  if (between.length > 0) return null;
  return rankScore(after) - rankScore(before);
}
