import "server-only";
import { cookies, headers } from "next/headers";
import { DEFAULT_LOCALE, LOCALES, dictionaries, type Locale } from "./dictionaries";

export const LOCALE_COOKIE = "lustlol_lang";

export async function getLocale(): Promise<Locale> {
  const fromCookie = (await cookies()).get(LOCALE_COOKIE)?.value;
  if (LOCALES.includes(fromCookie as Locale)) return fromCookie as Locale;
  const accept = (await headers()).get("accept-language") ?? "";
  return accept.toLowerCase().startsWith("tr") || !accept ? DEFAULT_LOCALE : "en";
}

export async function getDictionary() {
  const locale = await getLocale();
  return { locale, dict: dictionaries[locale] };
}
