import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { LiveGamePanel } from "@/components/profile/LiveGame";
import type { Assets } from "@/components/profile/MatchCard";
import { ErrorState } from "@/components/ui/ErrorState";
import { getDictionary } from "@/lib/i18n/server";
import { getStaticData } from "@/lib/riot/ddragon";
import { errorCode } from "@/lib/riot/errors";
import { img } from "@/lib/riot/images";
import { getProfile } from "@/lib/riot/player";
import { getServer, riotIdToSlug, slugToRiotId } from "@/lib/riot/servers";
import type { Profile } from "@/lib/riot/types";

type Params = Promise<{ server: string; riotId: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { riotId } = await params;
  const id = slugToRiotId(riotId);
  return id ? { title: `Live · ${id.name}#${id.tag}` } : {};
}

export default async function LivePage({ params }: { params: Params }) {
  const { server: serverId, riotId } = await params;
  const server = getServer(serverId);
  const id = slugToRiotId(riotId);
  if (!server || !id) notFound();

  const [{ dict }, data] = await Promise.all([getDictionary(), getStaticData()]);
  let profile: Profile;
  try {
    profile = await getProfile(server.id, id.name, id.tag);
  } catch (e) {
    const code = errorCode(e);
    return <ErrorState title={code === "not_found" ? `${id.name}#${id.tag}` : dict[`err_${code}`]} detail={code === "not_found" ? dict.err_not_found : undefined} action={dict.back_home} />;
  }

  const assets: Assets = {
    version: data.version,
    spells: data.spells,
    runes: data.runes,
    names: Object.fromEntries(Object.values(data.champions).map((c) => [c.id, c.name])),
    byKey: Object.fromEntries(Object.entries(data.champions).map(([key, c]) => [key, c.id])),
  };

  return (
    <div className="pt-6">
      <Link href={`/summoner/${server.id}/${riotIdToSlug(profile.name, profile.tag)}`} className="inline-flex items-center gap-1.5 text-xs text-muted hover:text-text">
        <ArrowLeft className="h-3.5 w-3.5" />
        {dict.back_to_profile}
      </Link>
      <div className="mt-3 flex items-center gap-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={img.profileIcon(data.version, profile.profileIconId)} alt="" className="h-12 w-12 rounded-xl" />
        <h1 className="font-display text-2xl font-bold">
          {profile.name}
          <span className="font-normal text-faint"> #{profile.tag}</span>
        </h1>
        <span className="rounded bg-ink px-2 py-0.5 font-display text-xs font-semibold text-gold">{server.label}</span>
      </div>
      <LiveGamePanel server={server.id} puuid={profile.puuid} assets={assets} />
    </div>
  );
}
