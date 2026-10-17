import type { Metadata } from "next";
import { ExternalLink } from "lucide-react";
import { KIND_STYLE, PatchChangeCard } from "@/components/PatchChangeCard";
import { getDictionary } from "@/lib/i18n/server";
import type { Dictionary } from "@/lib/i18n/dictionaries";
import { getPatchNotes, type ChangeKind, type PatchChange } from "@/lib/patch";

export const revalidate = 1800;

export const metadata: Metadata = { title: "Patch notes" };

const ORDER: ChangeKind[] = ["buff", "nerf", "adjusted"];

function Summary({ changes, dict }: { changes: PatchChange[]; dict: Dictionary }) {
  return (
    <div className="grid gap-3 sm:grid-cols-3">
      {ORDER.map((kind) => {
        const list = changes.filter((c) => c.kind === kind);
        const style = KIND_STYLE[kind];
        return (
          <div key={kind} className={`rounded-xl border bg-panel p-3 ${style.border}`}>
            <p className={`text-xs font-semibold uppercase tracking-wider ${style.text}`}>
              {dict[`${kind}s` as keyof Dictionary]} · {list.length}
            </p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {list.map((c) => (
                <a key={c.name} href={`#${c.name.toLowerCase().replace(/\W+/g, "-")}`} title={c.name}>
                  {c.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={c.image} alt={c.name} className="h-9 w-9 rounded-md transition hover:scale-110" />
                  ) : (
                    <span className="text-xs text-muted">{c.name}</span>
                  )}
                </a>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default async function PatchPage() {
  const { dict } = await getDictionary();
  const notes = await getPatchNotes().catch(() => null);

  if (!notes) return <p className="mt-16 text-center text-muted">{dict.patch_unavailable}</p>;

  return (
    <div className="mx-auto max-w-6xl space-y-8 pt-8">
      <header>
        <p className="font-display text-sm font-semibold tracking-widest text-gold">PATCH {notes.version}</p>
        <h1 className="mt-1 font-display text-3xl font-bold">{dict.nav_patch}</h1>
        <a href={notes.url} target="_blank" rel="noreferrer" className="mt-2 inline-flex items-center gap-1 text-xs text-faint hover:text-muted">
          {dict.patch_source} <ExternalLink className="h-3 w-3" />
        </a>
      </header>

      <Summary changes={notes.champions} dict={dict} />

      <section>
        <h2 className="mb-3 font-display text-xl font-semibold">{dict.champions}</h2>
        <div className="grid gap-3 md:grid-cols-2">
          {notes.champions.map((c) => (
            <PatchChangeCard key={c.name} change={c} dict={dict} />
          ))}
        </div>
      </section>

      {notes.items.length > 0 && (
        <section>
          <h2 className="mb-3 font-display text-xl font-semibold">{dict.items}</h2>
          <div className="grid gap-3 md:grid-cols-2">
            {notes.items.map((c) => (
              <PatchChangeCard key={c.name} change={c} dict={dict} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
