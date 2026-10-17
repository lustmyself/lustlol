import type { Dictionary } from "@/lib/i18n/dictionaries";
import type { ChangeKind, PatchChange } from "@/lib/patch";

export const KIND_STYLE: Record<ChangeKind, { text: string; border: string; label: keyof Dictionary }> = {
  buff: { text: "text-buff", border: "border-buff/40", label: "buff" },
  nerf: { text: "text-nerf", border: "border-nerf/40", label: "nerf" },
  adjusted: { text: "text-adjust", border: "border-adjust/40", label: "adjusted" },
};

export function PatchChangeCard({ change, dict }: { change: PatchChange; dict: Dictionary }) {
  const style = KIND_STYLE[change.kind];
  return (
    <article id={change.name.toLowerCase().replace(/\W+/g, "-")} className="scroll-mt-24 rounded-xl border border-line/70 bg-panel p-4">
      <header className="flex items-center gap-3">
        {change.image && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={change.image} alt="" className="h-11 w-11 rounded-lg" loading="lazy" />
        )}
        <h3 className="flex-1 font-display text-lg font-semibold">{change.name}</h3>
        <span className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold ${style.text} ${style.border}`}>{dict[style.label]}</span>
      </header>
      {change.context && <p className="mt-3 border-l-2 border-gold-dim/60 pl-3 text-sm italic text-muted">{change.context}</p>}
      <div className="mt-3 space-y-3">
        {change.groups.map((g, i) => (
          <div key={i}>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-gold">{g.title}</h4>
            <ul className="mt-1 space-y-1 text-sm text-text/90">
              {g.lines.map((line, j) => {
                const [label, rest] = line.split(/:(.+)/);
                return (
                  <li key={j} className="leading-relaxed">
                    {rest ? (
                      <>
                        <span className="text-muted">{label}:</span>
                        {rest.split("⇒").map((part, k, arr) => (
                          <span key={k}>
                            {k === arr.length - 1 && arr.length > 1 ? <strong className="text-text">{part}</strong> : part}
                            {k < arr.length - 1 && <span className="px-1 text-gold">→</span>}
                          </span>
                        ))}
                      </>
                    ) : (
                      line
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>
    </article>
  );
}
