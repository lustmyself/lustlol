"use client";

import Link from "next/link";
import { useState } from "react";
import { LineChart, Radio } from "lucide-react";
import { useI18n } from "../i18n";
import { RefreshButton } from "./RefreshButton";
import { TierGraph } from "./TierGraph";
import type { RankPoint } from "@/lib/riot/history";
import { riotIdToSlug } from "@/lib/riot/servers";

export function HeaderActions({
  server,
  name,
  tag,
  puuid,
  updated,
  points,
}: {
  server: string;
  name: string;
  tag: string;
  puuid: string;
  updated: string;
  points: RankPoint[];
}) {
  const { t } = useI18n();
  const [graph, setGraph] = useState(false);
  return (
    <>
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <RefreshButton server={server} name={name} tag={tag} puuid={puuid} />
        <button
          type="button"
          onClick={() => setGraph((g) => !g)}
          aria-expanded={graph}
          className={`inline-flex h-9 items-center gap-2 rounded-lg border px-4 text-sm font-semibold transition ${
            graph ? "border-gold/60 bg-gold/10 text-gold" : "border-line text-muted hover:border-gold/50 hover:text-text"
          }`}
        >
          <LineChart className="h-4 w-4" />
          {t("tier_graph")}
        </button>
        <Link
          href={`/live/${server}/${riotIdToSlug(name, tag)}`}
          className="inline-flex h-9 items-center gap-2 rounded-lg border border-line px-4 text-sm font-semibold text-muted transition hover:border-loss/50 hover:text-text"
        >
          <Radio className="h-4 w-4" />
          {t("live_game")}
        </Link>
        <span className="text-xs text-faint" suppressHydrationWarning>
          {updated}
        </span>
      </div>
      {graph && <TierGraph points={points} />}
    </>
  );
}
