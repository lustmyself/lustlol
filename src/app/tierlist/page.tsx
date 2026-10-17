import type { Metadata } from "next";
import { TIER_LIST, type Role, type Tier } from "@/data/tierlist";
import { getDictionary } from "@/lib/i18n/server";
import { getStaticData } from "@/lib/riot/ddragon";
import { img } from "@/lib/riot/images";

export const metadata: Metadata = { title: "Tier list" };

const ROLES: { id: Role; label: string }[] = [
  { id: "top", label: "Top" },
  { id: "jungle", label: "Jungle" },
  { id: "mid", label: "Mid" },
  { id: "bot", label: "Bot" },
  { id: "support", label: "Support" },
];

const TIERS: { id: Tier; color: string }[] = [
  { id: "S+", color: "text-gold border-gold/50" },
  { id: "S", color: "text-teal border-teal/50" },
  { id: "A", color: "text-muted border-line" },
];

export default async function TierListPage() {
  const [{ dict }, data] = await Promise.all([getDictionary(), getStaticData()]);
  const names = Object.fromEntries(Object.values(data.champions).map((c) => [c.id, c.name]));

  return (
    <div className="mx-auto max-w-6xl space-y-6 pt-8">
      <header>
        <h1 className="font-display text-3xl font-bold">{dict.tierlist_title}</h1>
        <p className="mt-1 text-sm text-muted">{dict.tierlist_sub}</p>
      </header>

      <div className="overflow-x-auto rounded-xl border border-line/70 bg-panel">
        <table className="w-full min-w-[720px] text-sm">
          <thead>
            <tr className="border-b border-line/70">
              <th className="w-16" />
              {ROLES.map((r) => (
                <th key={r.id} className="py-3 font-display text-xs font-semibold uppercase tracking-widest text-faint">
                  {r.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {TIERS.map((tier) => (
              <tr key={tier.id} className="border-b border-line/40 last:border-0">
                <td className="p-3 text-center">
                  <span className={`inline-flex h-10 w-10 items-center justify-center rounded-lg border font-display text-lg font-bold ${tier.color}`}>
                    {tier.id}
                  </span>
                </td>
                {ROLES.map((r) => (
                  <td key={r.id} className="p-3 align-top">
                    <ul className="flex flex-wrap justify-center gap-2">
                      {(TIER_LIST[r.id][tier.id] ?? []).map((id) => (
                        <li key={id} className="w-14 text-center">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={img.champion(data.version, id)} alt="" className="mx-auto h-12 w-12 rounded-lg" loading="lazy" />
                          <p className="mt-1 truncate text-[11px] text-muted">{names[id] ?? id}</p>
                        </li>
                      ))}
                    </ul>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
