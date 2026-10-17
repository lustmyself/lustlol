"use client";

import { createContext, useContext } from "react";
import { useRouter } from "next/navigation";
import { dictionaries, format, type DictKey, type Locale } from "@/lib/i18n/dictionaries";

const LocaleContext = createContext<Locale>("tr");

export function I18nProvider({ locale, children }: { locale: Locale; children: React.ReactNode }) {
  return <LocaleContext.Provider value={locale}>{children}</LocaleContext.Provider>;
}

export function useI18n() {
  const locale = useContext(LocaleContext);
  const dict = dictionaries[locale];
  const t = (key: DictKey, vars?: Record<string, string | number>) => format(dict[key], vars);
  return { locale, dict, t };
}

export function LanguageToggle() {
  const { locale } = useI18n();
  const router = useRouter();
  const next: Locale = locale === "tr" ? "en" : "tr";
  return (
    <button
      type="button"
      onClick={() => {
        document.cookie = `lustlol_lang=${next}; path=/; max-age=31536000; samesite=lax`;
        router.refresh();
      }}
      className="h-9 rounded-md border border-line px-2.5 text-xs font-semibold uppercase tracking-wider text-muted transition hover:border-gold/60 hover:text-gold"
      aria-label={next === "en" ? "Switch to English" : "Türkçe'ye geç"}
    >
      {next}
    </button>
  );
}
