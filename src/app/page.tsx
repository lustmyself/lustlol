import Link from "next/link";
import { Suspense } from "react";
import { ArrowRight } from "lucide-react";
import { LeaderboardTable } from "@/components/LeaderboardTable";
import { KIND_STYLE } from "@/components/PatchChangeCard";
import { SearchBox } from "@/components/SearchBox";
import { getDictionary } from "@/lib/i18n/server";
import { format, type Dictionary } from "@/lib/i18n/dictionaries";
import { latestVersion } from "@/lib/riot/ddragon";
import { errorCode } from "@/lib/riot/errors";
import { getLeaderboard } from "@/lib/riot/leaderboard";
import { DEFAULT_SERVER, RANKED_QUEUES } from "@/lib/riot/servers";
import { getPatchNotes, type ChangeKind } from "@/lib/patch";

function SectionHead({ title, href, link }: { title: string; href: string; link: string }) {
  return (
    <div className="mb-3 flex items-end justify-between gap-3">
      <h2 className="font-display text-xl font-semibold">{title}</h2>
      <Link href={href} className="inline-flex items-center gap-1 text-xs text-muted hover:text-gold">
        {link} <ArrowRight className="h-3.5 w-3.5" />
      </Link>
    </div>
  );
}

async function PatchGlance({ dict }: { dict: Dictionary }) {
  const notes = await getPatchNotes().catch(() => null);
  if (!notes) return <p className="text-sm text-muted">{dict.patch_unavailable}</p>;

  return (
    <>
      <SectionHead title={format(dict.home_patch_title, { v: notes.version })} href="/patch" link={dict.home_patch_all} />
      <div className="space-y-3">
        {(["buff", "nerf", "adjusted"] as ChangeKind[]).map((kind) => {
          const list = notes.champions.filter((c) => c.kind === kind);
          if (list.length === 0) return null;
          const style = KIND_STYLE[kind];
          return (
            <div key={kind} className="rounded-xl border border-line/70 bg-panel p-3">
              <p className={`text-xs font-semibold uppercase tracking-wider ${style.text}`}>
                {dict[`${kind}s` as keyof Dictionary]}
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                {list.map((c) => (
                  <Link key={c.name} href={`/patch#${c.name.toLowerCase().replace(/\W+/g, "-")}`} className="group text-center" title={c.name}>
                    {c.image && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={c.image} alt="" className={`h-11 w-11 rounded-lg border ${style.border} transition group-hover:scale-105`} />
                    )}
                    <span className="mt-0.5 block w-11 truncate text-[10px] text-muted">{c.name}</span>
                  </Link>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}

async function TopPlayers({ dict, version }: { dict: Dictionary; version: string }) {
  let body: React.ReactNode;
  try {
    const entries = await getLeaderboard(DEFAULT_SERVER, RANKED_QUEUES.solo);
    body = <LeaderboardTable entries={entries.slice(0, 8)} server={DEFAULT_SERVER} version={version} dict={dict} compact />;
  } catch (e) {
    body = <p className="rounded-xl border border-line/70 bg-panel p-4 text-sm text-muted">{dict[`err_${errorCode(e)}`]}</p>;
  }
  return (
    <>
      <SectionHead title={`${dict.home_leaderboard_title} · TR`} href="/leaderboard" link={dict.home_leaderboard_all} />
      {body}
    </>
  );
}

function Skeleton() {
  return (
    <div className="space-y-3">
      <div className="skeleton h-7 w-48" />
      <div className="skeleton h-24" />
      <div className="skeleton h-24" />
    </div>
  );
}

export default async function Home() {
  const [{ dict }, version] = await Promise.all([getDictionary(), latestVersion()]);

  return (
    <>
      <section className="flex flex-col items-center pt-20 pb-16 text-center sm:pt-28">
        <p className="font-display text-xs font-semibold tracking-[0.3em] text-teal">LEAGUE OF LEGENDS</p>
        <h1 className="mt-4 max-w-3xl font-display text-4xl leading-tight font-bold sm:text-5xl">{dict.hero_title}</h1>
        <p className="mt-4 max-w-xl text-base text-muted">{dict.hero_sub}</p>
        <div className="mt-8 w-full max-w-2xl">
          <SearchBox version={version} size="lg" autoFocus />
          <p className="mt-2 text-xs text-faint">{dict.search_hint}</p>
        </div>
      </section>

      <div className="grid gap-8 lg:grid-cols-2">
        <section>
          <Suspense fallback={<Skeleton />}>
            <PatchGlance dict={dict} />
          </Suspense>
        </section>
        <section>
          <Suspense fallback={<Skeleton />}>
            <TopPlayers dict={dict} version={version} />
          </Suspense>
        </section>
      </div>
    </>
  );
}
