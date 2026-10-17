"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, Search } from "lucide-react";
import { useI18n } from "../i18n";
import { img } from "@/lib/riot/images";

export interface Option {
  value: string;
  label: string;
  icon?: string;
  hint?: string;
}

function Select({
  value,
  options,
  onChange,
  placeholder,
  searchable = false,
}: {
  value: string;
  options: Option[];
  onChange: (v: string) => void;
  placeholder: string;
  searchable?: boolean;
}) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  const shown = useMemo(
    () => (q ? options.filter((o) => o.label.toLocaleLowerCase().includes(q.toLocaleLowerCase())) : options),
    [options, q],
  );
  const current = options.find((o) => o.value === value);

  return (
    <div ref={ref} className="relative min-w-0 flex-1">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className={`flex h-10 w-full items-center gap-2 rounded-lg border bg-panel px-3 text-left text-sm transition ${
          open || value ? "border-gold/50" : "border-line hover:border-line/80"
        }`}
      >
        {current?.icon && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={current.icon} alt="" className="h-6 w-6 rounded-full" />
        )}
        <span className={`min-w-0 flex-1 truncate ${value ? "text-text" : "text-muted"}`}>{current?.label ?? placeholder}</span>
        <ChevronDown className={`h-4 w-4 shrink-0 text-faint transition ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="absolute inset-x-0 top-full z-40 mt-1.5 overflow-hidden rounded-lg border border-line bg-panel shadow-2xl shadow-black/60">
          {searchable && (
            <label className="flex items-center gap-2 border-b border-line px-3">
              <Search className="h-3.5 w-3.5 text-faint" />
              <input
                autoFocus
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder={t("search_go")}
                className="h-9 min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-faint"
              />
            </label>
          )}
          <ul className="max-h-72 overflow-y-auto py-1">
            {shown.map((o) => (
              <li key={o.value}>
                <button
                  type="button"
                  onClick={() => {
                    onChange(o.value);
                    setOpen(false);
                    setQ("");
                  }}
                  className={`flex w-full items-center gap-2.5 px-3 py-1.5 text-left text-sm hover:bg-panel-2 ${
                    o.value === value ? "text-gold" : "text-text"
                  }`}
                >
                  {o.icon && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={o.icon} alt="" className="h-6 w-6 rounded-full" loading="lazy" />
                  )}
                  <span className="min-w-0 flex-1 truncate">{o.label}</span>
                  {o.hint && <span className="tabular text-xs text-faint">{o.hint}</span>}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export interface Filters {
  champion: string;
  queue: string;
  with: string;
}

export function FilterBar({
  value,
  onChange,
  version,
  names,
  queues,
  partners,
  disabled,
}: {
  value: Filters;
  onChange: (f: Filters) => void;
  version: string;
  names: Record<string, string>;
  queues: { id: number; label: string }[];
  partners: { puuid: string; name: string; tag: string; games: number }[];
  disabled?: boolean;
}) {
  const { t } = useI18n();
  const champions = useMemo<Option[]>(
    () => [
      { value: "", label: t("all_champions") },
      ...Object.entries(names)
        .sort((a, b) => a[1].localeCompare(b[1]))
        .map(([id, name]) => ({ value: id, label: name, icon: img.champion(version, id) })),
    ],
    [names, version, t],
  );

  return (
    <div className={`flex flex-wrap gap-2 ${disabled ? "pointer-events-none opacity-60" : ""}`}>
      <Select
        searchable
        value={value.champion}
        options={champions}
        placeholder={t("all_champions")}
        onChange={(champion) => onChange({ ...value, champion })}
      />
      <Select
        value={value.queue}
        options={[{ value: "", label: t("all_queues") }, ...queues.map((q) => ({ value: String(q.id), label: q.label }))]}
        placeholder={t("all_queues")}
        onChange={(queue) => onChange({ ...value, queue })}
      />
      <Select
        value={value.with}
        options={[
          { value: "", label: t("with_everybody") },
          ...partners.map((p) => ({ value: p.puuid, label: `${p.name}#${p.tag}`, hint: t("games_count", { n: p.games }) })),
        ]}
        placeholder={t("with_everybody")}
        onChange={(w) => onChange({ ...value, with: w })}
      />
    </div>
  );
}
