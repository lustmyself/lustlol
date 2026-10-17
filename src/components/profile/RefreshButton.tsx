"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw } from "lucide-react";
import { useI18n } from "../i18n";
import { refreshPlayer } from "@/app/summoner/actions";

export function RefreshButton({ server, name, tag, puuid }: { server: string; name: string; tag: string; puuid: string }) {
  const { t } = useI18n();
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() =>
        start(async () => {
          await refreshPlayer(server, name, tag, puuid);
          router.refresh();
        })
      }
      className="inline-flex h-9 items-center gap-2 rounded-lg bg-gold px-4 text-sm font-semibold text-ink transition hover:brightness-110 disabled:opacity-60"
    >
      <RefreshCw className={`h-4 w-4 ${pending ? "animate-spin" : ""}`} />
      {t("refresh")}
    </button>
  );
}
