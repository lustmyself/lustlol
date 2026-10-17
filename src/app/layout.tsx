import type { Metadata } from "next";
import { Chakra_Petch, Inter } from "next/font/google";
import { Header } from "@/components/Header";
import { I18nProvider } from "@/components/i18n";
import { getDictionary } from "@/lib/i18n/server";
import { latestVersion } from "@/lib/riot/ddragon";
import "./globals.css";

const inter = Inter({ subsets: ["latin", "latin-ext"], variable: "--font-inter" });
const chakra = Chakra_Petch({ subsets: ["latin", "latin-ext"], weight: ["500", "600", "700"], variable: "--font-chakra" });

export const metadata: Metadata = {
  title: { default: "lustlol — LoL istatistikleri", template: "%s · lustlol" },
  description: "League of Legends sihirdar profilleri, maç geçmişi, Challenger sıralaması ve yama notları.",
  openGraph: { siteName: "lustlol", type: "website" },
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const [{ locale, dict }, version] = await Promise.all([getDictionary(), latestVersion()]);

  return (
    <html lang={locale} className={`${inter.variable} ${chakra.variable}`}>
      <body className="min-h-screen">
        <I18nProvider locale={locale}>
          <Header version={version} />
          <main className="mx-auto max-w-[1720px] px-4 pb-16">{children}</main>
          <footer className="border-t border-line/70">
            <p className="mx-auto max-w-[1720px] px-4 py-6 text-xs leading-relaxed text-faint">{dict.footer_note}</p>
          </footer>
        </I18nProvider>
      </body>
    </html>
  );
}
