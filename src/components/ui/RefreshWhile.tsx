"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/** Re-renders the server page every `seconds` while `active`, up to `times` times. */
export function RefreshWhile({ active, seconds = 30, times = 6 }: { active: boolean; seconds?: number; times?: number }) {
  const router = useRouter();
  useEffect(() => {
    if (!active) return;
    const key = `refresh:${location.pathname}${location.search}`;
    const done = Number(sessionStorage.getItem(key) || 0);
    if (done >= times) return;
    const timer = setTimeout(() => {
      sessionStorage.setItem(key, String(done + 1));
      router.refresh();
    }, seconds * 1000);
    return () => clearTimeout(timer);
  }, [active, seconds, times, router]);
  return null;
}
