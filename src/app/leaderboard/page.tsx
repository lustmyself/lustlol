import type { Metadata } from "next";
import Link from "next/link";
import { ErrorState } from "@/components/ui/ErrorState";
import { getDictionary } from "@/lib/i18n/server";
import { format } from "@/lib/i18n/dictionaries";
import { latestVersion } from "@/lib/riot/ddragon";
import { errorCode } from "@/lib/riot/errors";
import { getLeaderboard } from "@/lib/riot/leaderboard";
import { DEFAULT_SERVER, RANKED_QUEUES, SERVERS, getServer, type RankedQueueKey } from "@/lib/riot/servers";
import { LeaderboardTable } from "@/components/LeaderboardTable";
import type { LeaderboardEntry } from "@/lib/riot/types";

export const metadata: Metadata = { title: "Leaderboard" };

type Search = Promise<{ server?: string; queue?: string }>;

export default async function LeaderboardPage({ searchParams }: { searchParams: Search }) {
  const sp = await searchParams;
  const server = getServer(sp.server) ?? getServer(DEFAULT_SERVER)!;
  const queueKey: RankedQueueKey = sp.queue === "flex" ? "flex" : "solo";
  const [{ dict }, version] = await Promise.all([getDictionary(), latestVersion()]);

  let entries: LeaderboardEntry[];
  try {
    entries = await getLeaderboard(server.id, RANKED_QUEUES[queueKey]);
  } catch (e) {
    return <ErrorState title={dict[`err_${errorCode(e)}`]} action={dict.back_home} />;
  }

  const href = (s: string, q: RankedQueueKey) => `/leaderboard?server=${s}${q === "flex" ? "&queue=flex" : ""}`;

  return (
    <div className="mx-auto max-w-6xl space-y-5 pt-8">
      <header>
        <h1 className="font-display text-3xl font-bold">{dict.leaderboard_title}</h1>
        <p className="mt-1 text-sm text-muted">{format(dict.leaderboard_sub, { s: server.name })}</p>
      </header>

      <div className="flex flex-wrap items-center gap-2">
        {(["solo", "flex"] as const).map((q) => (
          <Link
            key={q}
            href={href(server.id, q)}
            className={`rounded-full border px-3 py-1 text-xs ${
              q === queueKey ? "border-gold/60 bg-gold/10 text-gold" : "border-line text-muted hover:text-text"
            }`}
          >
            {q === "solo" ? dict.ranked_solo : dict.ranked_flex}
          </Link>
        ))}
        <span className="mx-1 h-4 w-px bg-line" />
        {SERVERS.map((s) => (
          <Link
            key={s.id}
            href={href(s.id, queueKey)}
            className={`rounded-md px-2 py-1 font-display text-xs font-semibold ${
              s.id === server.id ? "bg-panel-2 text-gold" : "text-faint hover:text-text"
            }`}
          >
            {s.label}
          </Link>
        ))}
      </div>

      <LeaderboardTable entries={entries} server={server.id} version={version} dict={dict} />
    </div>
  );
}
